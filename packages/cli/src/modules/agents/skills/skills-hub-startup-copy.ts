import type { AgentSkill } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { InstanceSettings } from 'n8n-core';

import type { Agent } from '../entities/agent.entity';
import type { AgentHistory } from '../entities/agent-history.entity';
import { AgentRepository } from '../repositories/agent.repository';
import { SkillRepository } from '../repositories/skill.repository';
import { skillContentHash, type SkillContent } from './skill-content-hash';
import { toSkillContent } from './skill.service';
import { SkillsHubRollout } from './skills-hub-rollout';

/** `skill.id` is varchar(36). A longer inline ref id gets a new id. */
const SKILL_ID_MAX_LENGTH = 36;

const BATCH_SIZE = 100;

/** How many agent ids the flag-off warning names. It counts all of them. */
const WARN_AGENT_IDS = 20;

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
		private readonly txRunner: TransactionRunner,
	) {}

	/** Called when the agents module starts, after the rollout flag is read. */
	async runOnStartup(): Promise<void> {
		if (this.instanceSettings.instanceType !== 'main') return;
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
		let after: Pick<Agent, 'createdAt' | 'id'> | null = null;
		for (;;) {
			const agents = await this.agentRepository.findPageForSkillCopy(after, BATCH_SIZE);
			for (const agent of agents) {
				counts.scanned++;
				try {
					const copied = await this.copyAgentWithRetry(agent.id);
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
			if (agents.length < BATCH_SIZE) break;
			after = agents[agents.length - 1];
		}
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
		const withRefs = await this.skillRepository.findAgentIdsWithDraftRefs();
		for (let start = 0; start < withRefs.length; start += BATCH_SIZE) {
			const page = withRefs.slice(start, start + BATCH_SIZE);
			const hubHashes = await this.skillRepository.findDraftContentHashes(page);
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
	private async copyAgentWithRetry(agentId: string): Promise<AgentCopyResult | null> {
		// Most agents have nothing left to copy after the first start. Check that without
		// a transaction and a row lock, and check again under the lock.
		if (!(await this.findWork(agentId, {}))) return null;
		try {
			return await this.copyAgent(agentId);
		} catch (error) {
			this.logger.warn('Retrying the skills hub copy of an agent after a failed try', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
			return await this.copyAgent(agentId);
		}
	}

	/**
	 * What one agent still needs: the published versions that pin nothing and have inline
	 * skills, and its draft while it has no hub rows. Null when nothing is left.
	 */
	private async findWork(agentId: string, ctx: OperationContext): Promise<AgentWork | null> {
		const agent = await this.agentRepository.findForSkillCopy(agentId, ctx);
		if (!agent) return null;
		const versions = (await this.skillRepository.findUnpinnedVersions(agentId, ctx)).filter(
			(version) => inlineSkills(version).length > 0,
		);
		const copyDraft =
			inlineSkills(agent).length > 0 && !(await this.skillRepository.hasHubState(agentId, ctx));
		if (versions.length === 0 && !copyDraft) return null;
		return { agent, versions, copyDraft };
	}

	/** Copies one agent in one transaction. Returns null when it wrote nothing. */
	private async copyAgent(agentId: string): Promise<AgentCopyResult | null> {
		return await this.txRunner.run({}, async (ctx) => {
			// A draft write to this agent waits until the copy commits. The agent row and the
			// hub-row check are read under the lock, so the copy never uses stale inline
			// content or replaces refs written meanwhile.
			await this.agentRepository.lockForSkillCopy(agentId, ctx);
			const work = await this.findWork(agentId, ctx);
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
				await this.skillRepository.insertPins(pins, ctx);
				counts.pins += pins.length;
			}
			if (copyDraft) {
				const refs: Array<{ skillId: string }> = [];
				for (const { refId, body } of inlineSkills(agent)) {
					// The draft runs the newest version, so its text must be the newest one.
					const { skillId } = await this.versionFor(agent, refId, body, true, state, counts, ctx);
					if (!refs.some((ref) => ref.skillId === skillId)) refs.push({ skillId });
				}
				await this.skillRepository.replaceDependencies(agent.id, refs, ctx);
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
		for (const row of await this.skillRepository.findAgentSkillVersions(agentId, ctx)) {
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
	 * version with the same content, else a new version. A new ref reuses a skill with the
	 * same content that no other ref claimed, else creates an agent skill. With
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
