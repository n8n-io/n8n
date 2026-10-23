import type { AgentSkill } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { SettingsRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { skillContentHash, type SkillContent } from '@/modules/skills/skill-content-hash';
import { SkillRepository } from '@/modules/skills/skill.repository';
import { toSkillContent } from '@/modules/skills/skill.service';
import { SkillsHubRollout } from '@/modules/skills/skills-hub-rollout';

import type { Agent } from '../entities/agent.entity';
import type { AgentHistory } from '../entities/agent-history.entity';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentSkillRepository } from '../repositories/agent-skill.repository';

/** `skill.id` is varchar(36). A longer inline ref id gets a new id. */
const SKILL_ID_MAX_LENGTH = 36;

const BATCH_SIZE = 100;

/** How many agent ids the flag-off warning names. It counts all of them. */
const WARN_AGENT_IDS = 20;

/** Settings key of the copy progress (`CopyProgress`). */
export const SKILLS_HUB_COPY_PROGRESS_KEY = 'agents.skillsHubCopy';

/**
 * How far the copy got. `through` is the last agent that a finished run checked, in
 * (`createdAt`, `id`) order. `retryAgentIds` are agents whose draft copy failed.
 */
type CopyProgress = {
	through: { createdAt: string; id: string } | null;
	retryAgentIds: string[];
};

type CopyCounts = {
	/** Agents checked, whether or not they needed a copy. */
	scanned: number;
	/** Agents with nothing left to copy. */
	skipped: number;
	agents: number;
	skills: number;
	versions: number;
	pins: number;
	failed: number;
};

/** What one agent's copy wrote. */
type AgentCounts = Pick<CopyCounts, 'skills' | 'versions' | 'pins'>;

/** What one agent's copy wrote, and what it copied from. */
type AgentCopyResult = AgentCounts & { publishedVersions: number; draft: boolean };

type AgentWork = {
	agent: Pick<Agent, 'id' | 'schema' | 'skills'>;
	versions: Array<Pick<AgentHistory, 'versionId' | 'schema' | 'skills'>>;
	copyDraft: boolean;
};

type HubVersion = { id: string; skillId: string };

/**
 * What one agent's copy knows: hub versions by content hash, the hub skill of each ref,
 * and the ref that claimed each skill, so two refs with the same body keep two skills.
 */
type AgentCopyState = {
	byHash: Map<string, HubVersion[]>;
	skillByRef: Map<string, string>;
	refBySkill: Map<string, string>;
	latest: Map<string, { versionId: string; hash: string; version: number }>;
};

/**
 * Copies the inline skills of agents (`agents.skills`, `agent_history.skills`) into the
 * skills hub when the rollout flag is on, so agents read and write only the hub. Each
 * inline skill becomes an agent skill of its agent. The legacy columns stay as they are,
 * so turning the flag off gives agents their inline skills back.
 *
 * Every main runs it at startup, before it serves agents. It does not wait for the
 * leader: a main promoted during startup could miss both the startup check and the
 * takeover event. Running it on several mains at once is safe, and so is running it again:
 * - Each agent is copied in one transaction that holds the agent row, so a second main
 *   waits and then finds the hub rows.
 * - A published version is copied only while it pins nothing. Its bodies become versions
 *   and it pins them.
 * - A draft is copied only while the agent has no hub rows at all. Its refs become
 *   dependency rows, and its current text becomes the newest version of each skill.
 * - A draft gets one copy. After a run, a settings row (`SKILLS_HUB_COPY_PROGRESS_KEY`)
 *   records the last agent it checked, and later runs copy only the drafts of newer
 *   agents, such as agents that an older main creates during a rolling upgrade. So a
 *   skill that a user detached and deleted after the copy stays deleted, although the
 *   legacy columns still hold it. A draft whose copy failed is tried again.
 * - Content that a skill of the agent already holds is reused, found by content hash.
 * - Refs that were switched off are not copied.
 */
@Service()
export class SkillsHubStartupCopy {
	constructor(
		private readonly logger: Logger,
		private readonly rollout: SkillsHubRollout,
		private readonly instanceSettings: InstanceSettings,
		private readonly agentRepository: AgentRepository,
		private readonly skillRepository: SkillRepository,
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly txRunner: TransactionRunner,
		private readonly settingsRepository: SettingsRepository,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/** Called when the agents module starts, after the skills module read the rollout flag. */
	async runOnStartup(): Promise<void> {
		if (this.instanceSettings.instanceType !== 'main') return;
		// Without the skills module there are no hub tables to copy into or compare with.
		if (!this.moduleRegistry.isActive('skills')) return;
		if (this.rollout.isEnabled) await this.copyAll();
		// One warning per instance is enough: only the leader logs it.
		else if (this.instanceSettings.isLeader) await this.warnAboutHubOnlySkills();
	}

	async copyAll(): Promise<CopyCounts> {
		const counts: CopyCounts = {
			scanned: 0,
			skipped: 0,
			agents: 0,
			skills: 0,
			versions: 0,
			pins: 0,
			failed: 0,
		};
		// A start line without a summary line shows that the copy stopped halfway.
		this.logger.info('Started copying inline agent skills into the skills hub');
		const startedAt = Date.now();
		const read = await this.readProgress();
		// An unreadable row copies no draft in this run; saving the progress repairs it.
		const progress = read ?? { through: null, retryAgentIds: [] };
		const retry = new Set(progress.retryAgentIds);
		const failedDrafts: string[] = [];
		const copiedDrafts: string[] = [];
		let after: Pick<Agent, 'createdAt' | 'id'> | null = null;
		for (;;) {
			const agents = await this.agentRepository.findPageForSkillCopy(after, BATCH_SIZE);
			for (const agent of agents) {
				counts.scanned++;
				const draftAllowed =
					read !== null && (isAfter(agent, progress.through) || retry.has(agent.id));
				try {
					const copied = await this.copyAgentWithRetry(agent.id, draftAllowed);
					if (draftAllowed) copiedDrafts.push(agent.id);
					if (!copied) counts.skipped++;
					else {
						// Logged after the commit, so a rolled-back copy never shows up here.
						this.logger.debug('Copied the inline skills of an agent into the skills hub', {
							agentId: agent.id,
							...copied,
						});
						counts.agents++;
						counts.skills += copied.skills;
						counts.versions += copied.versions;
						counts.pins += copied.pins;
					}
				} catch (error) {
					// One broken agent must not stop the others. Its copy rolls back, so the
					// next start tries it again.
					counts.failed++;
					if (draftAllowed) failedDrafts.push(agent.id);
					this.logger.error('Failed to copy the skills of an agent into the skills hub', {
						agentId: agent.id,
						errorName: error instanceof Error ? error.name : undefined,
						error: error instanceof Error ? error.message : String(error),
					});
					if (error instanceof Error) {
						this.logger.debug('Stack of the failed skills hub copy', {
							agentId: agent.id,
							stack: error.stack,
						});
					}
				}
			}
			if (agents.length > 0) after = agents[agents.length - 1];
			if (agents.length < BATCH_SIZE) break;
		}
		await this.saveProgress(after, copiedDrafts, failedDrafts);
		this.logger.info('Copied inline agent skills into the skills hub', {
			...counts,
			durationMs: Date.now() - startedAt,
		});
		return counts;
	}

	/**
	 * With the flag off, agents read their inline skills again. Skills that were added or
	 * changed in the hub while it was on are not there, so name the agents whose hub draft
	 * runs other content than their inline skills.
	 */
	private async warnAboutHubOnlySkills(): Promise<void> {
		const changed: string[] = [];
		const withRefs = await this.agentSkillRepository.findAgentIdsWithDraftRefs();
		for (let start = 0; start < withRefs.length; start += BATCH_SIZE) {
			const page = withRefs.slice(start, start + BATCH_SIZE);
			const hubHashes = await this.agentSkillRepository.findDraftContentHashes(page);
			for (const agentId of page) {
				const agent = await this.agentRepository.findForSkillCopy(agentId);
				const inline = agent
					? inlineSkills(agent).map(({ body }) => skillContentHash(toSkillContent(body)))
					: [];
				if (!sameHashes(inline, hubHashes.get(agentId) ?? [])) changed.push(agentId);
			}
		}
		const count = changed.length;
		if (count === 0) return;
		const agentIds = changed.slice(0, WARN_AGENT_IDS);
		this.logger.warn(
			'The skills hub is off, so agents run their inline skills. Skills that were added or changed in the hub while it was on are not available to these agents until it is on again.',
			{ agents: count, agentIds },
		);
	}

	/**
	 * Two mains can pick the same free inline id for two different agents at the same
	 * time, so one of them fails on the primary key. A second try picks another id. A
	 * failed try rolls back, so only the counts of the try that commits are kept.
	 */
	private async copyAgentWithRetry(
		agentId: string,
		draftAllowed: boolean,
	): Promise<AgentCopyResult | null> {
		// Most agents have nothing left to copy after the first start. Check that without
		// a transaction and a row lock, and check again under the lock.
		if (!(await this.findWork(agentId, draftAllowed, {}))) return null;
		try {
			return await this.copyAgent(agentId, draftAllowed);
		} catch (error) {
			this.logger.warn('Retrying the skills hub copy of an agent after a failed try', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
			return await this.copyAgent(agentId, draftAllowed);
		}
	}

	/** The saved progress, empty before the first run, or null when the row is unreadable. */
	private async readProgress(): Promise<CopyProgress | null> {
		const row = await this.settingsRepository.findByKey(SKILLS_HUB_COPY_PROGRESS_KEY);
		if (!row) return { through: null, retryAgentIds: [] };
		const progress = parseProgress(row.value);
		if (!progress) {
			// Reopening every draft could bring back deleted skills, so copy no draft this run.
			this.logger.error(
				'Unreadable skills hub copy progress: no agent draft is copied in this run',
				{ key: SKILLS_HUB_COPY_PROGRESS_KEY },
			);
		}
		return progress;
	}

	/**
	 * Records the last agent this run checked, and the drafts to try again. Written even
	 * when some agents failed, so one broken agent does not reopen every draft. Another
	 * main can save while this run works, so the save merges into the stored progress:
	 * `through` only moves forward, and the retry list keeps the other main's failures.
	 */
	private async saveProgress(
		last: Pick<Agent, 'createdAt' | 'id'> | null,
		copiedDrafts: string[],
		failedDrafts: string[],
	): Promise<void> {
		const mine = last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null;
		const retryAgentIds = await this.txRunner.run({}, async (ctx) => {
			const row = await this.settingsRepository.findByKeyForUpdate(
				SKILLS_HUB_COPY_PROGRESS_KEY,
				ctx,
			);
			const stored = row ? parseProgress(row.value) : null;
			const handled = new Set([...copiedDrafts, ...failedDrafts]);
			const next: CopyProgress = {
				through: furthest(stored?.through ?? null, mine),
				retryAgentIds: [
					...(stored?.retryAgentIds ?? []).filter((id) => !handled.has(id)),
					...failedDrafts,
				],
			};
			if (row && JSON.stringify(next) === row.value) return next.retryAgentIds;
			await this.settingsRepository.upsertByKey(
				SKILLS_HUB_COPY_PROGRESS_KEY,
				JSON.stringify(next),
				false,
				ctx,
			);
			return next.retryAgentIds;
		});
		if (retryAgentIds.length > 0) {
			this.logger.error(
				'These agent drafts are copied into the skills hub again at the next start',
				{
					agentIds: retryAgentIds.slice(0, WARN_AGENT_IDS),
					agents: retryAgentIds.length,
				},
			);
		}
	}

	/**
	 * What one agent still needs: the published versions that pin nothing and have inline
	 * skills, and its draft while it has no hub rows. Null when nothing is left.
	 */
	private async findWork(
		agentId: string,
		draftAllowed: boolean,
		ctx: OperationContext,
	): Promise<AgentWork | null> {
		const agent = await this.agentRepository.findForSkillCopy(agentId, ctx);
		if (!agent) return null;
		const versions = (await this.agentSkillRepository.findUnpinnedVersions(agentId, ctx)).filter(
			(version) => inlineSkills(version).length > 0,
		);
		const copyDraft =
			draftAllowed &&
			inlineSkills(agent).length > 0 &&
			!(await this.agentSkillRepository.hasHubState(agentId, ctx));
		if (versions.length === 0 && !copyDraft) return null;
		return { agent, versions, copyDraft };
	}

	/** Copies one agent in one transaction. Returns null when it wrote nothing. */
	private async copyAgent(agentId: string, draftAllowed: boolean): Promise<AgentCopyResult | null> {
		return await this.txRunner.run({}, async (ctx) => {
			// A draft write to this agent waits until the copy commits. The agent row and the
			// hub-row check are read under the lock, so the copy never uses stale inline
			// content or replaces refs written meanwhile.
			await this.agentRepository.lockForSkillCopy(agentId, ctx);
			const work = await this.findWork(agentId, draftAllowed, ctx);
			if (!work) return null;
			const { agent, versions, copyDraft } = work;
			const counts: AgentCounts = { skills: 0, versions: 0, pins: 0 };

			const state = await this.loadState(agent.id, ctx);
			for (const version of versions) {
				const pins: Array<{ agentVersionId: string; skillId: string; skillVersionId: string }> = [];
				for (const { refId, body } of inlineSkills(version)) {
					const pinned = await this.versionFor(agent, refId, body, false, state, counts, ctx);
					if (!pins.some((pin) => pin.skillId === pinned.skillId)) {
						pins.push({
							agentVersionId: version.versionId,
							skillId: pinned.skillId,
							skillVersionId: pinned.id,
						});
					}
				}
				await this.agentSkillRepository.insertPins(pins, ctx);
				counts.pins += pins.length;
			}
			if (copyDraft) {
				const refs: Array<{ skillId: string }> = [];
				for (const { refId, body } of inlineSkills(agent)) {
					// The draft runs the newest version, so its text must be the newest one.
					const { skillId } = await this.versionFor(agent, refId, body, true, state, counts, ctx);
					if (!refs.some((ref) => ref.skillId === skillId)) refs.push({ skillId });
				}
				await this.agentSkillRepository.replaceDependencies(agent.id, refs, ctx);
			}
			return { ...counts, publishedVersions: versions.length, draft: copyDraft };
		});
	}

	private async loadState(agentId: string, ctx: OperationContext): Promise<AgentCopyState> {
		const state: AgentCopyState = {
			byHash: new Map(),
			skillByRef: new Map(),
			refBySkill: new Map(),
			latest: new Map(),
		};
		for (const row of await this.agentSkillRepository.findAgentSkillVersions(agentId, ctx)) {
			addByHash(state, row.contentHash, { id: row.id, skillId: row.skillId });
			const current = state.latest.get(row.skillId);
			if (!current || row.version > current.version) {
				state.latest.set(row.skillId, {
					versionId: row.id,
					hash: row.contentHash,
					version: row.version,
				});
			}
		}
		return state;
	}

	/**
	 * The hub version that holds this inline body. A ref seen before uses its own skill: a
	 * version with the same content, else a new version. A new ref uses the agent's own
	 * skill with the ref's id, which an earlier run created from this ref, so a version
	 * that an older main publishes later becomes its next version. Else it reuses a skill
	 * with the same content that no other ref claimed, else creates an agent skill. With
	 * `mustBeLatest`, a match that is not the newest version of its skill gets the body
	 * again as the newest one.
	 */
	private async versionFor(
		agent: Pick<Agent, 'id'>,
		refId: string,
		body: AgentSkill,
		mustBeLatest: boolean,
		state: AgentCopyState,
		counts: AgentCounts,
		ctx: OperationContext,
	): Promise<HubVersion> {
		const content = toSkillContent(body);
		const hash = skillContentHash(content);
		const matches = state.byHash.get(hash) ?? [];
		const skillId =
			state.skillByRef.get(refId) ??
			(await this.ownSkillOfRef(agent, refId, state, ctx)) ??
			matches.find((version) => !state.refBySkill.has(version.skillId))?.skillId;
		if (skillId) {
			claim(state, refId, skillId);
			const match = matches.find((version) => version.skillId === skillId);
			if (match && (!mustBeLatest || state.latest.get(skillId)?.hash === hash)) return match;
			return await this.addVersion(skillId, content, hash, state, counts, ctx);
		}

		const id = await this.newSkillId(refId, ctx);
		const versionId = await this.skillRepository.createSkill(
			{ id, target: { projectId: null, agentId: agent.id }, source: 'agent', createdById: null },
			content,
			ctx,
		);
		const version = { id: versionId, skillId: id };
		addByHash(state, hash, version);
		claim(state, refId, id);
		state.latest.set(id, { versionId, hash, version: 1 });
		counts.skills++;
		counts.versions++;
		return version;
	}

	private async addVersion(
		skillId: string,
		content: SkillContent,
		hash: string,
		state: AgentCopyState,
		counts: AgentCounts,
		ctx: OperationContext,
	): Promise<HubVersion> {
		const next = (state.latest.get(skillId)?.version ?? 0) + 1;
		const id = await this.skillRepository.insertSavedVersion(skillId, next, content, null, ctx);
		const version = { id, skillId };
		addByHash(state, hash, version);
		state.latest.set(skillId, { versionId: id, hash, version: next });
		counts.versions++;
		return version;
	}

	/** The agent's own skill with the ref's id, while no other ref of this copy claimed it. */
	private async ownSkillOfRef(
		agent: Pick<Agent, 'id'>,
		refId: string,
		state: AgentCopyState,
		ctx: OperationContext,
	): Promise<string | undefined> {
		if (!state.latest.has(refId) || state.refBySkill.has(refId)) return undefined;
		const [skill] = await this.skillRepository.findByIds([refId], ctx);
		return skill?.agentId === agent.id ? refId : undefined;
	}

	/** Keeps the inline ref id when it is free and short enough, else a new one. */
	private async newSkillId(refId: string, ctx: OperationContext): Promise<string> {
		if (
			refId.length <= SKILL_ID_MAX_LENGTH &&
			!(await this.skillRepository.existsById(refId, ctx))
		) {
			return refId;
		}
		return `skill_${generateNanoId()}`;
	}
}

/** Whether two lists hold the same hashes, in any order. */
function sameHashes(left: string[], right: string[]): boolean {
	if (left.length !== right.length) return false;
	const sortedRight = [...right].sort();
	return [...left].sort().every((hash, index) => hash === sortedRight[index]);
}

/** Keeps one version of each skill for each content: the first one seen, which is the oldest. */
function addByHash(state: AgentCopyState, hash: string, version: HubVersion): void {
	const versions = state.byHash.get(hash) ?? [];
	if (!versions.some((known) => known.skillId === version.skillId)) versions.push(version);
	state.byHash.set(hash, versions);
}

function claim(state: AgentCopyState, refId: string, skillId: string): void {
	state.skillByRef.set(refId, skillId);
	state.refBySkill.set(skillId, refId);
}

/**
 * The inline skills of a draft or a published version, in ref order: each ref that is
 * not switched off and has a body the runtime could load.
 */
function inlineSkills(
	source: Pick<AgentHistory, 'schema' | 'skills'>,
): Array<{ refId: string; body: AgentSkill }> {
	const refs: unknown = (source.schema as { skills?: unknown } | null)?.skills;
	if (!Array.isArray(refs)) return [];
	const bodies = source.skills ?? {};
	const seen = new Set<string>();
	const result: Array<{ refId: string; body: AgentSkill }> = [];
	for (const ref of refs as unknown[]) {
		if (!isRecord(ref) || ref.type !== 'skill' || typeof ref.id !== 'string') continue;
		if (ref.enabled === false || seen.has(ref.id)) continue;
		seen.add(ref.id);
		const body = toInlineBody(Object.hasOwn(bodies, ref.id) ? bodies[ref.id] : undefined);
		if (body) result.push({ refId: ref.id, body });
	}
	return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Null for a body the runtime could not load either. A repeated file path keeps its first copy. */
function toInlineBody(raw: unknown): AgentSkill | null {
	if (!isRecord(raw)) return null;
	const { name, description, instructions, references } = raw;
	if (
		typeof name !== 'string' ||
		typeof description !== 'string' ||
		typeof instructions !== 'string'
	) {
		return null;
	}
	const files = new Map<string, { path: string; content: string }>();
	if (Array.isArray(references)) {
		for (const file of references as unknown[]) {
			if (
				isRecord(file) &&
				typeof file.path === 'string' &&
				typeof file.content === 'string' &&
				!files.has(file.path)
			) {
				files.set(file.path, { path: file.path, content: file.content });
			}
		}
	}
	return {
		name,
		description,
		instructions,
		...(files.size > 0 ? { references: [...files.values()] } : {}),
	};
}

/** The stored progress, or null when the value is not a progress object. */
function parseProgress(raw: string): CopyProgress | null {
	const value = jsonParse<unknown>(raw, { fallbackValue: null });
	if (!isRecord(value) || !Array.isArray(value.retryAgentIds)) return null;
	const through = isRecord(value.through) ? value.through : null;
	if (
		value.through !== null &&
		(typeof through?.createdAt !== 'string' || typeof through.id !== 'string')
	) {
		return null;
	}
	return {
		through: through ? { createdAt: String(through.createdAt), id: String(through.id) } : null,
		retryAgentIds: value.retryAgentIds.filter((id): id is string => typeof id === 'string'),
	};
}

/** The later of two positions in (`createdAt`, `id`) order. */
function furthest(
	left: CopyProgress['through'],
	right: CopyProgress['through'],
): CopyProgress['through'] {
	if (!left) return right;
	if (!right) return left;
	const leftTime = new Date(left.createdAt).getTime();
	const rightTime = new Date(right.createdAt).getTime();
	if (leftTime !== rightTime) return leftTime > rightTime ? left : right;
	return left.id >= right.id ? left : right;
}

/** Whether the agent comes after `through` in (`createdAt`, `id`) order, or nothing was checked yet. */
function isAfter(
	agent: Pick<Agent, 'createdAt' | 'id'>,
	through: CopyProgress['through'],
): boolean {
	if (!through) return true;
	const time = agent.createdAt.getTime();
	const throughTime = new Date(through.createdAt).getTime();
	return time > throughTime || (time === throughTime && agent.id > through.id);
}
