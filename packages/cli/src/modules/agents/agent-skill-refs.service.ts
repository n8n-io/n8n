import {
	skillNameKey,
	type AgentJsonSkillConfig,
	type AgentSkill,
	type AgentSkillAvailability,
	type AgentSkillVersionInfo,
	type SkillSource,
} from '@n8n/api-types';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { UnexpectedError, UserError } from 'n8n-workflow';

import {
	findIntroducedNameClashes,
	SkillAccessService,
	type SkillMoveOptions,
	type SkillRef,
	SkillRuntimeService,
	SkillService,
	type SkillTarget,
	skillScopeOf,
} from '@/modules/skills';

import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import type { AgentSkillRefs } from './json-config/agent-document';
import { AgentSkillRepository } from './repositories/agent-skill.repository';
import { getAgentSkillHash } from './utils/agent-config-hash';

/** Skill refs and the skill bodies they resolve to, keyed by skill id. */
export interface AgentSkillsSnapshot {
	skillRefs: AgentJsonSkillConfig[];
	skills: Record<string, AgentSkill>;
}

/**
 * The one seam for the skill refs of an agent draft and of a published agent
 * version, and for the skill bodies they resolve to. All other code reads and
 * writes skill refs through this service.
 *
 * The refs of a draft are the `agent_skill_dependency` rows. The refs of a
 * published version are the `agent_version_skill_dependency` pins, in attach
 * order. The skill bodies come from the skills module.
 */
@Service()
export class AgentSkillRefsService {
	constructor(
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly skillService: SkillService,
		private readonly skillRuntime: SkillRuntimeService,
		private readonly skillAccess: SkillAccessService,
		private readonly txRunner: TransactionRunner,
	) {}

	/** Skill refs of the agent draft, in attach order. A pinned ref has `versionId`. */
	async refsForDraft(
		agent: Pick<Agent, 'id'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const rows =
			(await this.agentSkillRepository.findDependencies([agent.id], ctx)).get(agent.id) ?? [];
		return toSkillRefs(
			rows.map(({ skillId, versionId }) => ({ id: skillId, ...(versionId ? { versionId } : {}) })),
		);
	}

	/**
	 * Skill refs of one published agent version, in the order of the draft at
	 * publish. Every ref of a version is pinned, so the refs carry no `versionId`.
	 */
	async refsForVersion(
		version: Pick<AgentHistory, 'versionId'>,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const skillIds = await this.agentSkillRepository.findPinnedSkillIds(version.versionId, ctx);
		return toSkillRefs(skillIds.map((id) => ({ id })));
	}

	/** The refs of the agent draft and the skill bodies the draft runs. */
	async readDraft(agent: Pick<Agent, 'id'>, ctx: OperationContext): Promise<AgentSkillsSnapshot> {
		const skillRefs = await this.refsForDraft(agent, ctx);
		return { skillRefs, skills: await this.skillsForRefs(skillRefs, ctx) };
	}

	/** The refs of one published agent version and the pinned skill bodies. */
	async readVersion(
		version: Pick<AgentHistory, 'versionId'>,
		ctx: OperationContext,
	): Promise<AgentSkillsSnapshot> {
		const pins = await this.agentSkillRepository.findPins(version.versionId, ctx);
		const versions = await this.skillRuntime.resolveVersions(
			pins.map((pin) => pin.skillVersionId),
			ctx,
		);
		// Keep pin order. Object key order would move numeric ids to the front.
		const resolved = pins.flatMap((pin): Array<[string, AgentSkill]> => {
			const pinnedVersion = versions.get(pin.skillVersionId);
			return pinnedVersion ? [[pin.skillId, pinnedVersion.skill]] : [];
		});
		return {
			skillRefs: toSkillRefs(resolved.map(([id]) => ({ id }))),
			skills: Object.fromEntries(resolved),
		};
	}

	/**
	 * The skill bodies that these draft refs run, keyed by skill id: the pinned
	 * version of a ref with `versionId`, else the latest saved version.
	 */
	async skillsForRefs(
		skillRefs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<Record<string, AgentSkill>> {
		if (!skillRefs?.length) return {};
		return await this.skillRuntime.resolveForAgentDraft(toServiceRefs(skillRefs), ctx);
	}

	async findOutdatedSkillIds(
		skillRefs: AgentJsonSkillConfig[],
		skills: Record<string, AgentSkill>,
		ctx: OperationContext,
	): Promise<string[]> {
		const pinnedSkillIds = skillRefs.flatMap((ref) => (ref.versionId ? [ref.id] : []));
		const latestSkills = await this.skillsForRefs(
			pinnedSkillIds.map((id) => ({ type: 'skill', id })),
			ctx,
		);
		return pinnedSkillIds.filter((id) => {
			const latest = latestSkills[id];
			const pinned = skills[id];
			return (
				latest !== undefined &&
				pinned !== undefined &&
				getAgentSkillHash(latest) !== getAgentSkillHash(pinned)
			);
		});
	}

	/**
	 * The version numbers of each draft ref, keyed by skill id: the one the draft runs,
	 * the one the published agent runs, and the latest.
	 */
	async findSkillVersions(
		agent: Pick<Agent, 'activeVersionId'>,
		skillRefs: AgentJsonSkillConfig[],
		ctx: OperationContext,
	): Promise<Record<string, AgentSkillVersionInfo>> {
		if (skillRefs.length === 0) return {};
		const [versionOf, published] = await Promise.all([
			this.skillRuntime.runtimeVersions(skillRefs, ctx),
			this.publishedVersionNumbers(agent.activeVersionId, ctx),
		]);
		const result: Record<string, AgentSkillVersionInfo> = {};
		for (const ref of skillRefs) {
			const runtime = versionOf(ref);
			if (!runtime) continue;
			result[ref.id] = {
				draft: runtime.version,
				published: published.get(ref.id) ?? null,
				latest: runtime.latest,
				pinned: runtime.pinned,
			};
		}
		return result;
	}

	/** The version number of each skill that one published agent version pins, keyed by skill id. */
	private async publishedVersionNumbers(
		agentVersionId: string | null,
		ctx: OperationContext,
	): Promise<Map<string, number>> {
		if (!agentVersionId) return new Map();
		const pins = await this.agentSkillRepository.findPins(agentVersionId, ctx);
		const versions = await this.skillRuntime.findVersionRefs(
			pins.map((pin) => pin.skillVersionId),
			ctx,
		);
		return new Map(
			pins.flatMap((pin): Array<[string, number]> => {
				const version = versions.get(pin.skillVersionId)?.version;
				return version === undefined ? [] : [[pin.skillId, version]];
			}),
		);
	}

	/**
	 * The refs that `replaceDraftRefs` would keep, without writing them: unknown ids
	 * are dropped, and a new ref that the agent may not attach throws. Callers use it
	 * to validate and report the refs that are saved, not the submitted ones.
	 */
	async effectiveDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId'>,
		refs: AgentJsonSkillConfig[],
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		const checked = await this.checkRefs(
			{ id: agent.id, projectId: agent.projectId },
			toServiceRefs(refs),
			ctx,
		);
		return toSkillRefs(checked);
	}

	/**
	 * Replace the skill refs of the agent draft. Call it in the same transaction
	 * as `saveAgentDraftFenced`, with the same `ctx`, after the fenced save.
	 * A new ref must be attachable to the agent and must not clash by name. A ref
	 * keeps its pin when the pin is a saved version of that skill.
	 */
	async replaceDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<void> {
		if (!agent.schema && refs?.length) {
			throw new UnexpectedError('Cannot set skill refs on an agent without a config');
		}
		const checked = await this.checkRefs(
			{ id: agent.id, projectId: agent.projectId },
			toServiceRefs(refs ?? []),
			ctx,
		);
		await this.writeDependencies(agent.id, checked, ctx);
	}

	/**
	 * `replaceDraftRefs` for a complete save, such as a package import: a ref to a skill
	 * that does not exist fails the save instead of being dropped. Returns the saved refs.
	 */
	async replaceAllDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		await this.replaceDraftRefs(agent, refs, ctx);
		const saved = await this.refsForDraft(agent, ctx);
		const savedIds = new Set(saved.map(({ id }) => id));
		const missing = (refs ?? []).filter(({ id }) => !savedIds.has(id)).map(({ id }) => id);
		if (missing.length > 0) {
			throw new ConflictError(
				`Skills ${missing.join(', ')} no longer exist. Plan the import again.`,
			);
		}
		return saved;
	}

	/**
	 * Removes the draft refs to the given skills. A skill save marks every Agent that
	 * follows the skill as changed and captures a version of it. Call this before the
	 * skills of an Agent are saved in its own save transaction, then attach the refs again
	 * with `replaceAllDraftRefs`.
	 */
	async detachDraftRefs(agentId: string, skillIds: string[], ctx: OperationContext): Promise<void> {
		if (skillIds.length === 0) return;
		const detached = new Set(skillIds);
		const current = await this.refsForDraft({ id: agentId }, ctx);
		const kept = current.filter(({ id }) => !detached.has(id));
		if (kept.length === current.length) return;
		await this.writeDependencies(agentId, toServiceRefs(kept), ctx);
	}

	/**
	 * Revert: set the refs of the agent draft to the refs of a published version,
	 * each pinned to the version that the published version ran. This writes no
	 * skill row and needs no skill permission.
	 */
	async restoreDraftRefs(
		agent: Pick<Agent, 'id'>,
		version: Pick<AgentHistory, 'versionId'>,
		refs: AgentSkillRefs,
		ctx: OperationContext,
	): Promise<void> {
		// A ref with no pin follows the latest version.
		const pins = await this.agentSkillRepository.findPins(version.versionId, ctx);
		const pinned = new Map(pins.map((pin) => [pin.skillId, pin.skillVersionId]));
		const restored = toServiceRefs(refs ?? []).map(({ versionId: _dropped, ...ref }) => {
			const versionId = pinned.get(ref.id);
			return versionId ? { ...ref, versionId } : ref;
		});
		await this.writeDependencies(agent.id, restored, ctx);
	}

	/**
	 * Remove the pin of one draft ref, so the draft follows the latest saved
	 * version of the skill. A save of the skill from this agent calls it.
	 */
	async unpinDraftRef(
		agent: Pick<Agent, 'id'>,
		skillId: string,
		ctx: OperationContext,
	): Promise<void> {
		const refs = await this.refsForDraft(agent, ctx);
		await this.writeDependencies(
			agent.id,
			refs.map(({ id, versionId }) => (id === skillId || !versionId ? { id } : { id, versionId })),
			ctx,
		);
	}

	/**
	 * Create with a config (duplicate, import, eval seeding). A ref to a stored skill
	 * stays a ref. A ref with a body but no stored skill gets a new skill in the agent's
	 * project, with a free name there. The ref points to the new id. A ref with neither is
	 * dropped, and so is a ref with only a body when no user creates the skill. The new
	 * skills belong to the project, so the user needs the skill create permission there.
	 * Returns the refs that the draft now has.
	 */
	async createDraftRefs(
		agent: Pick<Agent, 'id' | 'projectId' | 'schema'>,
		refs: AgentSkillRefs,
		bodies: Record<string, AgentSkill>,
		creator: User | null,
		ctx: OperationContext,
	): Promise<AgentJsonSkillConfig[]> {
		if (!refs?.length) return [];
		const found = await this.skillRuntime.findTargets(
			refs.map((ref) => ref.id),
			ctx,
		);
		const target = { projectId: agent.projectId };
		const toCreate = refs.flatMap((ref) => {
			const body = Object.hasOwn(bodies, ref.id) ? bodies[ref.id] : undefined;
			return !found.has(ref.id) && body && creator !== null
				? [{ refId: ref.id, body, createdById: creator.id }]
				: [];
		});
		const createdIds = new Map<string, string>();
		if (creator !== null && toCreate.length > 0) {
			await this.skillAccess.assertCanCreate(creator, target);
			// A new name must also differ from the skills this draft keeps referring to.
			const kept = await this.skillRuntime.resolveForAgentDraft(
				[...found.keys()].map((id) => ({ id })),
				ctx,
			);
			const names = await this.skillService.freeNames(
				toCreate.map(({ body }) => body.name),
				target,
				ctx,
				Object.values(kept).map(({ name }) => name),
			);
			for (const [index, { refId, body, createdById }] of toCreate.entries()) {
				const id = await this.skillService.createTrusted(
					{ target, skill: { ...body, name: names[index] }, source: 'agent', createdById },
					ctx,
				);
				createdIds.set(refId, id);
			}
		}
		const next: AgentJsonSkillConfig[] = refs.flatMap((ref) => {
			const id = found.has(ref.id) ? ref.id : createdIds.get(ref.id);
			return id ? [{ type: 'skill' as const, id }] : [];
		});
		await this.replaceDraftRefs(agent, next, ctx);
		return toSkillRefs(next);
	}

	async createSkills(
		agent: Pick<Agent, 'id' | 'projectId'>,
		skills: AgentSkill[],
		creatorId: string,
		availableTo: AgentSkillAvailability,
		source: SkillSource,
		ctx: OperationContext,
	): Promise<string[]> {
		const ids: string[] = [];
		for (const skill of skills) {
			ids.push(
				await this.skillService.createTrusted(
					{
						target: targetFor(agent, availableTo),
						skill,
						source,
						createdById: creatorId,
						checkNameTaken: true,
					},
					ctx,
				),
			);
		}
		return ids;
	}

	/**
	 * The skill version id of each draft ref, keyed by skill id, in draft order. Pin
	 * the versions once the `agent_history` row exists (see `pinVersion`). Call it in
	 * the transaction that saves the draft.
	 */
	async versionSnapshot(
		agent: Pick<Agent, 'id' | 'schema'>,
		ctx: OperationContext,
	): Promise<Map<string, string>> {
		if (!agent.schema) return new Map();
		const refs = await this.refsForDraft(agent, ctx);
		if (refs.length === 0) return new Map();
		const versionByRef = await this.skillRuntime.snapshotForSave(toServiceRefs(refs), ctx);
		const missing = refs.filter((ref) => !versionByRef.has(ref.id)).map((ref) => ref.id);
		if (missing.length > 0) {
			throw new UserError(`Cannot save agent with missing skills: ${missing.join(', ')}`);
		}
		return versionByRef;
	}

	/** Pin the resolved skills after the history row exists, in the same transaction. */
	async pinVersion(
		agentVersionId: string,
		pins: Map<string, string>,
		ctx: OperationContext,
	): Promise<void> {
		if (pins.size === 0) return;
		// The pins keep the order of `pins`, which is the order of the draft refs.
		await this.agentSkillRepository.insertPins(
			[...pins].map(([skillId, skillVersionId]) => ({ agentVersionId, skillId, skillVersionId })),
			ctx,
		);
	}

	async assertVersionAccess(
		agent: Pick<Agent, 'id' | 'projectId'>,
		version: AgentHistory,
		ctx: OperationContext,
	): Promise<void> {
		const ids = (await this.refsForVersion(version, ctx)).map(({ id }) => id);
		if (ids.length === 0) return;
		await this.skillRuntime.lockForPublish(ids, ctx);
		const targets = await this.skillRuntime.findTargets(ids, ctx);
		const accessible = (id: string) => {
			const skill = targets.get(id);
			return skill !== undefined && this.isAttachable(skill, agent);
		};
		if (!ids.every(accessible)) {
			throw new UserError('A saved skill is no longer available to this agent');
		}
	}

	async availabilityOf(
		skillId: string,
		ctx: OperationContext,
	): Promise<AgentSkillAvailability | undefined> {
		const skill = (await this.skillRuntime.findTargets([skillId], ctx)).get(skillId);
		if (!skill) return undefined;
		return skillScopeOf(skill);
	}

	async setAvailability(
		agent: Pick<Agent, 'id' | 'projectId'>,
		skillId: string,
		availableTo: AgentSkillAvailability,
		ctx: OperationContext,
		options: SkillMoveOptions = {},
	): Promise<void> {
		await this.skillService.moveTrusted(
			skillId,
			targetFor(agent, availableTo),
			agent.id,
			ctx,
			options,
		);
	}

	/** An agent can attach instance skills and the skills of its own project. */
	isAttachable(skill: SkillTarget, agent: { id: string; projectId: string | null }): boolean {
		return skill.projectId === null || skill.projectId === agent.projectId;
	}

	/**
	 * The check an agent config save runs on the skill refs it gets. The agent's current
	 * refs come from its dependency rows. Unknown ids are dropped unless already
	 * attached. A ref keeps its `versionId` when it is a saved version of that skill; a
	 * pin to a version of another skill or to no version is refused. A pin needs no skill
	 * permission, as a revert does: it writes no skill row. A new ref must be attachable,
	 * and a new ref or a changed pin must not introduce a name clash.
	 */
	async checkRefs(
		agent: { id: string; projectId: string | null },
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<SkillRef[]> {
		const current =
			(await this.agentSkillRepository.findDependencies([agent.id], ctx)).get(agent.id) ?? [];
		const existingIds = new Set(current.map((ref) => ref.skillId));
		const existingPins = new Map(current.map((ref) => [ref.skillId, ref.versionId ?? undefined]));
		const found = await this.skillRuntime.findTargets(
			refs.map((ref) => ref.id),
			ctx,
		);
		const kept = refs.filter((ref) => existingIds.has(ref.id) || found.has(ref.id));
		const changedPins = kept.filter((ref) => existingPins.get(ref.id) !== ref.versionId);
		await this.assertPinsBelongToSkills(changedPins, ctx);
		const newIds = [...new Set(kept.map((ref) => ref.id))].filter(
			(id) => !existingIds.has(id) && found.has(id),
		);
		const repinned = changedPins.filter((ref) => existingIds.has(ref.id));
		if (newIds.length === 0 && repinned.length === 0) return kept;
		// Shared lock until the attach commits, so `moveTrusted` cannot narrow a skill in between.
		if (ctx.trx && newIds.length > 0) await this.skillRuntime.lockForAttach(newIds, ctx);

		const keptExisting = kept.filter((ref) => existingIds.has(ref.id));
		// The first ref of a new skill decides its pin, as `replaceDependencies` stores it.
		const newRefs = newIds.flatMap((id) => kept.find((ref) => ref.id === id) ?? []);
		const previousRefs = repinned.map((ref) => ({
			id: ref.id,
			versionId: existingPins.get(ref.id),
		}));
		const nameOf = await this.skillRuntime.runtimeNames(
			[...keptExisting, ...newRefs, ...previousRefs],
			ctx,
		);
		for (const id of newIds) {
			const skill = found.get(id);
			if (skill && !this.isAttachable(skill, agent)) {
				throw new UserError(
					`Skill "${nameOf({ id }) ?? id}" (${id}) is not available to this agent. An agent can use the skills of its own project and instance skills.`,
				);
			}
		}
		// A ref runs its pinned version, so compare the name of that version. A changed pin
		// that keeps the name it had before introduces nothing new.
		const renamed = repinned.filter((ref) => {
			const before = nameOf({ id: ref.id, versionId: existingPins.get(ref.id) });
			const after = nameOf(ref);
			return (
				after !== undefined && before !== undefined && skillNameKey(before) !== skillNameKey(after)
			);
		});
		const renamedIds = new Set(renamed.map((ref) => ref.id));
		const clashes = findIntroducedNameClashes(
			keptExisting.filter((ref) => !renamedIds.has(ref.id)).flatMap((ref) => nameOf(ref) ?? []),
			[...renamed, ...newRefs].flatMap((ref) => nameOf(ref) ?? []),
		);
		if (clashes.length > 0) {
			throw new UserError(
				`This agent already has a skill with a name like "${clashes.join('", "')}". Rename one of them, or detach the other skill first.`,
			);
		}
		return kept;
	}

	/** Refuses a new or changed pin that is not a saved version of the ref's skill. */
	private async assertPinsBelongToSkills(
		changedPins: SkillRef[],
		ctx: OperationContext,
	): Promise<void> {
		const changed = changedPins.filter((ref) => ref.versionId !== undefined);
		if (changed.length === 0) return;
		const versions = await this.skillRuntime.findVersionRefs(
			changed.flatMap((ref) => ref.versionId ?? []),
			ctx,
		);
		for (const ref of changed) {
			const version = ref.versionId ? versions.get(ref.versionId) : undefined;
			if (!version) {
				throw new UserError(
					`Skill ${ref.id} has no saved version ${ref.versionId}. Pick a version from the version list of this skill.`,
				);
			}
			if (version.skillId !== ref.id) {
				throw new UserError(
					`Version ${ref.versionId} belongs to another skill, not to skill ${ref.id}. Pick a version of this skill.`,
				);
			}
		}
	}

	private async writeDependencies(
		agentId: string,
		refs: SkillRef[],
		ctx: OperationContext,
	): Promise<void> {
		// Refs to skills that are gone are dropped, in one transaction with the write.
		await this.txRunner.run(ctx, async (txCtx) => {
			const known = await this.skillRuntime.findTargets(
				refs.map((ref) => ref.id),
				txCtx,
			);
			await this.agentSkillRepository.replaceDependencies(
				agentId,
				refs.flatMap((ref) =>
					known.has(ref.id) ? [{ skillId: ref.id, versionId: ref.versionId ?? null }] : [],
				),
				txCtx,
			);
		});
	}
}

function targetFor(agent: Pick<Agent, 'id' | 'projectId'>, availableTo: AgentSkillAvailability) {
	return { projectId: availableTo === 'project' ? agent.projectId : null };
}

function toServiceRefs(refs: AgentJsonSkillConfig[]): SkillRef[] {
	return refs.map(({ id, versionId }) => (versionId ? { id, versionId } : { id }));
}

function toSkillRefs(refs: Array<{ id: string; versionId?: string }>): AgentJsonSkillConfig[] {
	return refs.map(({ id, versionId }) => ({
		type: 'skill' as const,
		id,
		...(versionId ? { versionId } : {}),
	}));
}
