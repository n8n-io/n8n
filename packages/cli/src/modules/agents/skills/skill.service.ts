import { AGENT_SKILL_NAME_MAX_LENGTH, skillNameKey, type AgentSkill } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { SkillFrontmatter } from '../entities/skill-version.entity';
import type { Skill, SkillSource } from '../entities/skill.entity';
import { AgentRepository } from '../repositories/agent.repository';
import {
	SkillRepository,
	type ResolvedSkillRow,
	type SkillTarget,
} from '../repositories/skill.repository';
import { getAgentSkillHash } from '../utils/agent-config-hash';
import { skillContentHash, type SkillContent } from './skill-content-hash';
import { SkillNameTakenError } from './skill-name-taken.error';
import { findIntroducedNameClashes, renameIntroducesClash } from './skill-names';

/** A skill ref in an agent config. A ref with `versionId` runs that version. */
export type SkillRef = { id: string; versionId?: string };

/** Fields to change, plus the hash of the version the editor started from. */
export type SkillUpdate = Partial<AgentSkill> & { baseSkillHash: string };

export type SkillSaveResult = {
	versionId: string;
	version: number;
	/** False when the content matched the latest version and nothing was saved. */
	created: boolean;
	/** The content of the latest version after the save. */
	skill: AgentSkill;
	/** Agents that follow the skill. A save in a caller's transaction does not refresh them. */
	followingAgentIds: string[];
};

/**
 * The content of one version. Skills ignore `allowedTools`: the frontmatter, the
 * `allowed-tools` key included, stays as given.
 */
export function toSkillContent(skill: AgentSkill, frontmatter: SkillFrontmatter | null = null) {
	const content: SkillContent = {
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		frontmatter: frontmatter && Object.keys(frontmatter).length > 0 ? { ...frontmatter } : null,
		files: (skill.references ?? []).map(({ path, content: text }) => ({ path, content: text })),
	};
	return content;
}

/** The `AgentSkill` shape the runtime and the API use, from one version row. */
export function toAgentSkill(row: ResolvedSkillRow): AgentSkill {
	return {
		name: row.version.name,
		description: row.version.description,
		instructions: row.version.instructions,
		...(row.files.length
			? { references: row.files.map(({ path, content }) => ({ path, content })) }
			: {}),
	};
}

function assertHasInstructions(skill: AgentSkill): void {
	if (!skill.instructions.trim()) throw new UserError('Skill instructions are required.');
}

function toRecord(rows: Map<string, ResolvedSkillRow>): Record<string, AgentSkill> {
	return Object.fromEntries([...rows].map(([refId, row]) => [refId, toAgentSkill(row)]));
}

/**
 * The rules of skills: which version an agent runs, save, publish pins, revert pins,
 * attach checks, edit permission and the delete guard. The runtime loads skills by id
 * with no permission check.
 */
@Service()
export class SkillService {
	constructor(
		private readonly logger: Logger,
		private readonly skillRepository: SkillRepository,
		private readonly agentRepository: AgentRepository,
		private readonly txRunner: TransactionRunner,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	// ---------------------------------------------------------------- reads

	/**
	 * What an agent draft runs, keyed by ref id: the latest version, or the pinned version
	 * of a ref with `versionId`. A pin to a version of another skill falls back to the latest.
	 */
	async resolveForAgentDraft(
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<Record<string, AgentSkill>> {
		return toRecord(await this.resolveRows(refs, ctx));
	}

	/** The pinned versions of one published agent version, keyed by skill id. */
	async resolvePinned(
		agentVersionId: string,
		ctx: OperationContext = {},
	): Promise<Record<string, AgentSkill>> {
		return toRecord(await this.skillRepository.findPinned(agentVersionId, ctx));
	}

	private async resolveRows(
		refs: SkillRef[],
		ctx: OperationContext,
	): Promise<Map<string, ResolvedSkillRow>> {
		const latest = await this.skillRepository.findLatestSaved(
			refs.map((ref) => ref.id),
			ctx,
		);
		const pinnedIds = refs.flatMap((ref) => (ref.versionId ? [ref.versionId] : []));
		const pinned = await this.skillRepository.findVersionsByIds(pinnedIds, ctx);
		const rows = new Map<string, ResolvedSkillRow>();
		for (const ref of refs) {
			const pin = ref.versionId ? pinned.get(ref.versionId) : undefined;
			const row = pin?.skill.id === ref.id ? pin : latest.get(ref.id);
			if (row) rows.set(ref.id, row);
		}
		return rows;
	}

	/** The names agents see: those of the latest versions. */
	private async latestNames(skillIds: string[], ctx: OperationContext) {
		const rows = await this.skillRepository.findLatestSaved(skillIds, ctx);
		return new Map([...rows].map(([id, row]) => [id, row.version.name]));
	}

	/**
	 * The name each ref runs under: its pinned version's name, else the latest. Works per
	 * ref, because one agent can pin a skill that another agent follows.
	 */
	private async runtimeNames(
		refs: Array<{ id: string; versionId?: string | null }>,
		ctx: OperationContext,
	): Promise<(ref: { id: string; versionId?: string | null }) => string | undefined> {
		const latest = await this.latestNames(
			refs.map((ref) => ref.id),
			ctx,
		);
		const pinned = await this.skillRepository.findVersionsByIds(
			refs.flatMap((ref) => (ref.versionId ? [ref.versionId] : [])),
			ctx,
		);
		return (ref) => {
			const pin = ref.versionId ? pinned.get(ref.versionId) : undefined;
			return pin?.skill.id === ref.id ? pin.version.name : latest.get(ref.id);
		};
	}

	// ---------------------------------------------------------------- writes

	/** Creates a skill with its v1. Returns the new id. */
	/**
	 * `checkNameTaken` is for a name that a user or the builder chose. A copy of an agent
	 * skill for a new agent keeps the name of the skill it copies, so it skips the check.
	 */
	async create(
		input: {
			target: SkillTarget;
			skill: AgentSkill;
			source: SkillSource;
			createdById: string;
			checkNameTaken?: boolean;
		},
		ctx: OperationContext = {},
	): Promise<string> {
		assertHasInstructions(input.skill);
		if (input.checkNameTaken) {
			await this.assertNameFree(input.skill.name, input.target, undefined, ctx);
		}
		const id = `skill_${generateNanoId()}`;
		await this.skillRepository.createSkill(
			{ id, target: input.target, source: input.source, createdById: input.createdById },
			toSkillContent(input.skill),
			ctx,
		);
		this.logger.debug('Created skill', { skillId: id });
		return id;
	}

	/**
	 * Save: merges the update onto the latest version and stores the result as the next
	 * version, unless the content did not change. Every agent that follows the skill then
	 * runs the new version, and each one that was in sync with its published version
	 * shows unpublished changes. `baseSkillHash` is checked under the edit lock, so two
	 * saves from the same base cannot both pass.
	 *
	 * When `ctx` has a transaction, the caller calls `refreshFollowingAgents` after its
	 * commit. `pushRef` is the tab that saved: it gets no reload push.
	 */
	async save(
		skillId: string,
		update: SkillUpdate,
		userId: string,
		ctx: OperationContext = {},
		pushRef?: string,
	): Promise<SkillSaveResult> {
		const { saved, following } = await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const latest = (await this.skillRepository.findLatestSaved([skillId], txCtx)).get(skillId);
			if (!latest) throw new NotFoundError('Skill not found');
			const current = toAgentSkill(latest);
			const { baseSkillHash, allowedTools: _ignored, ...changes } = update;
			if (baseSkillHash !== getAgentSkillHash(current)) {
				throw new ConflictError(
					'The skill was changed somewhere else. Reload to get the latest version.',
				);
			}
			const skill: AgentSkill = { ...current, ...changes };
			if (!skill.references?.length) delete skill.references;
			assertHasInstructions(skill);
			const content = toSkillContent(skill, latest.version.frontmatter);
			if (skillContentHash(content) === latest.version.contentHash) {
				const unchanged = { versionId: latest.version.id, version: latest.version.version };
				const result = { ...unchanged, created: false, skill: current, followingAgentIds: [] };
				return { saved: result, following: [] };
			}
			// A rename that only changes case or separators keeps the name key, so it can
			// clash with nothing new. The legacy rule skipped it too.
			if (skillNameKey(skill.name) !== skillNameKey(latest.version.name)) {
				await this.assertNameFree(skill.name, latest.skill, skillId, txCtx);
				await this.assertRenameKeepsNamesApart(skillId, latest.version.name, skill.name, txCtx);
			}
			const version = await this.skillRepository.nextVersionNumber(skillId, txCtx);
			const versionId = await this.skillRepository.insertSavedVersion(
				skillId,
				version,
				content,
				userId,
				txCtx,
			);
			const followingIds = await this.skillRepository.findFollowingAgentIds([skillId], txCtx);
			await this.agentRepository.markDraftChangedIfInSync(followingIds, txCtx);
			const result = { versionId, version, created: true, skill, followingAgentIds: followingIds };
			return { saved: result, following: followingIds };
		});
		if (!ctx.trx) await this.refreshFollowingAgents(following, pushRef);
		this.logger.debug('Saved skill', {
			skillId,
			version: saved.version,
			created: saved.created,
			following,
		});
		return saved;
	}

	/**
	 * After a save commits: following agents drop their cached runtime and their editors
	 * reload, except the tab of `excludePushRef`.
	 */
	async refreshFollowingAgents(agentIds: string[], excludePushRef?: string): Promise<void> {
		if (agentIds.length === 0) return;
		// Imported on use: the runtime cache depends on services that will depend on this one.
		const { AgentRuntimeCacheService } = await import('../agent-runtime-cache.service.js');
		const cache = Container.get(AgentRuntimeCacheService);
		for (const agentId of agentIds) cache.clearRuntimes(agentId);
		for (const agent of await this.agentRepository.findProjectIdsByIds(agentIds)) {
			this.agentUpdateBroadcaster.notify(
				{ projectId: agent.projectId, agentId: agent.id, source: 'user' },
				excludePushRef,
			);
		}
	}

	/**
	 * The requested name if its scope has no name like it, else the name with the first
	 * free number after it ("New skill 2"), as workflow names get.
	 */
	async freeName(requested: string, target: SkillTarget, ctx: OperationContext = {}) {
		const taken = new Set(
			(
				await this.skillRepository.findLatestNamesInTarget(
					{ projectId: target.projectId, agentId: target.agentId },
					ctx,
				)
			).map(({ name }) => skillNameKey(name)),
		);
		const base = requested.trim();
		if (!taken.has(skillNameKey(base))) return base;
		for (let n = 2; ; n++) {
			const suffix = ` ${n}`;
			const candidate = `${base.slice(0, AGENT_SKILL_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
			if (!taken.has(skillNameKey(candidate))) return candidate;
		}
	}

	/**
	 * Refuses a name that is hard to tell apart from another skill's name in the same
	 * scope: one agent, one project or the instance, by the same rule as inside one agent.
	 */
	private async assertNameFree(
		name: string,
		target: SkillTarget,
		exceptSkillId: string | undefined,
		ctx: OperationContext,
	): Promise<void> {
		const key = skillNameKey(name);
		const names = await this.skillRepository.findLatestNamesInTarget(
			{ projectId: target.projectId, agentId: target.agentId },
			ctx,
		);
		if (
			names.some((other) => other.skillId !== exceptSkillId && skillNameKey(other.name) === key)
		) {
			throw new SkillNameTakenError(name);
		}
	}

	private async assertRenameKeepsNamesApart(
		skillId: string,
		oldName: string,
		newName: string,
		ctx: OperationContext,
	): Promise<void> {
		const agents = await this.skillRepository.findFollowingAgents(skillId, ctx);
		const refs = await this.skillRepository.findDependencies(
			agents.map((agent) => agent.id),
			ctx,
		);
		const otherRefs = (agent: (typeof agents)[number]) =>
			(refs.get(agent.id) ?? [])
				.filter((ref) => ref.skillId !== skillId)
				.map((ref) => ({ id: ref.skillId, versionId: ref.versionId }));
		const nameOf = await this.runtimeNames(agents.flatMap(otherRefs), ctx);
		const clashing = agents.filter((agent) =>
			renameIntroducesClash(
				otherRefs(agent).flatMap((ref) => nameOf(ref) ?? []),
				oldName,
				newName,
			),
		);
		if (clashing.length > 0) {
			throw new UserError(
				`Cannot rename to "${newName}": ${clashing.map((agent) => agent.name).join(', ')} already ${
					clashing.length > 1 ? 'use' : 'uses'
				} a skill with a name like that.`,
			);
		}
	}

	// ---------------------------------------------------------------- publish and revert

	/**
	 * Publish, step 1: the version each ref resolves to. Publish
	 * creates no version. Needs the caller's transaction for the publish lock.
	 */
	async snapshotForPublish(
		refs: SkillRef[],
		ctx: OperationContext,
	): Promise<{ skills: Record<string, AgentSkill>; versionByRef: Map<string, string> }> {
		const refIds = [...new Set(refs.map((ref) => ref.id))];
		await this.skillRepository.lockForPublish(refIds, ctx);
		const rows = await this.resolveRows(refs, ctx);
		const versionByRef = new Map([...rows].map(([refId, row]) => [refId, row.version.id]));
		return { skills: toRecord(rows), versionByRef };
	}

	/**
	 * Publish, step 2: after the `agent_history` row exists. The pins keep the order of
	 * `versionByRef`, which is the order of the draft refs.
	 */
	async pinForPublish(
		agentVersionId: string,
		versionByRef: Map<string, string>,
		ctx: OperationContext,
	): Promise<void> {
		await this.skillRepository.insertPins(
			[...versionByRef].map(([skillId, skillVersionId]) => ({
				agentVersionId,
				skillId,
				skillVersionId,
			})),
			ctx,
		);
	}

	/**
	 * Revert: each ref gets a pin to the version that agent version used. No skill row is
	 * written, so other agents are not affected and no skill permission is needed. A ref
	 * with no pin follows the latest version.
	 */
	async restoreFromVersion(
		agentVersionId: string,
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<SkillRef[]> {
		const pinned = await this.skillRepository.findPinned(agentVersionId, ctx);
		return refs.map(({ versionId: _dropped, ...ref }) => {
			const row = pinned.get(ref.id);
			return row ? { ...ref, versionId: row.version.id } : ref;
		});
	}

	// ---------------------------------------------------------------- attach

	/** An agent can attach instance skills, the skills of its own project and its own agent skills. */
	isAttachable(
		skill: Pick<Skill, 'projectId' | 'agentId'>,
		agent: { id: string; projectId: string },
	): boolean {
		if (skill.agentId !== null) return skill.agentId === agent.id;
		return skill.projectId === null || skill.projectId === agent.projectId;
	}

	/**
	 * The check an agent config save runs on the skill refs it gets. The agent's current
	 * refs come from its dependency rows. Unknown ids are dropped unless already
	 * attached. A ref keeps a pin only when the agent already had it. A new ref
	 * must be attachable and must not clash by name.
	 */
	async checkRefs(
		agent: { id: string; projectId: string },
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<SkillRef[]> {
		const current =
			(await this.skillRepository.findDependencies([agent.id], ctx)).get(agent.id) ?? [];
		const existingIds = new Set(current.map((ref) => ref.skillId));
		const existingPins = new Map(current.map((ref) => [ref.skillId, ref.versionId]));
		const found = new Map(
			(
				await this.skillRepository.findByIds(
					refs.map((ref) => ref.id),
					ctx,
				)
			).map((skill) => [skill.id, skill]),
		);
		const kept = refs
			.filter((ref) => existingIds.has(ref.id) || found.has(ref.id))
			.map(({ versionId, ...ref }) =>
				versionId !== undefined && existingPins.get(ref.id) === versionId
					? { ...ref, versionId }
					: ref,
			);
		const newIds = [...new Set(kept.map((ref) => ref.id))].filter(
			(id) => !existingIds.has(id) && found.has(id),
		);
		if (newIds.length === 0) return kept;
		// Shared lock until the attach commits, so `changeTarget` cannot narrow a skill in between.
		if (ctx.trx) await this.skillRepository.lockForPublish(newIds, ctx);

		const keptExisting = kept.filter((ref) => existingIds.has(ref.id));
		const newRefs = newIds.map((id) => ({ id }));
		const nameOf = await this.runtimeNames([...keptExisting, ...newRefs], ctx);
		for (const id of newIds) {
			const skill = found.get(id);
			if (skill && !this.isAttachable(skill, agent)) {
				throw new UserError(
					`Skill "${nameOf({ id }) ?? id}" (${id}) is not available to this agent. An agent can use the skills of its own project, its own skills and instance skills.`,
				);
			}
		}
		// A kept ref runs its pinned version, so compare the name of that version.
		const clashes = findIntroducedNameClashes(
			keptExisting.flatMap((ref) => nameOf(ref) ?? []),
			newRefs.flatMap((ref) => nameOf(ref) ?? []),
		);
		if (clashes.length > 0) {
			throw new UserError(
				`This agent already has a skill with a name like "${clashes.join('", "')}". Rename one of them, or detach the other skill first.`,
			);
		}
		return kept;
	}

	/**
	 * Moves a skill to a project, one agent or the instance. Refused while an agent other
	 * than `keepAgentId` uses it, or while any agent uses it when there is no `keepAgentId`.
	 * The edit lock makes a concurrent attach wait, so the check and the move see the same
	 * agents.
	 */
	async changeTarget(
		skillId: string,
		target: SkillTarget,
		keepAgentId: string | undefined,
		ctx: OperationContext = {},
		/** The name the skill has after this request, when the same request renames it. */
		nameAfterMove?: string,
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const others = (await this.skillRepository.findUsingAgentIds(skillId, txCtx)).filter(
				(id) => id !== keepAgentId,
			);
			if (others.length > 0) {
				throw new ConflictError(
					keepAgentId
						? 'Other agents use this skill. Detach it from those agents first, then change where it can be added.'
						: 'Agents use this skill. Detach it from every agent first, then change where it can be added.',
				);
			}
			// The new scope must not already hold a name like the one the skill has after the move.
			const name =
				nameAfterMove ??
				(await this.skillRepository.findLatestSummaries([skillId], txCtx)).get(skillId)?.name;
			if (name) await this.assertNameFree(name, target, skillId, txCtx);
			await this.skillRepository.updateTarget(skillId, target, txCtx);
		});
	}

	// ---------------------------------------------------------------- permission

	/**
	 * The project a skill's permissions come from: its own for a project skill, its
	 * agent's for an agent skill, none for an instance skill. A skill whose agent is gone
	 * has none either, and only the global scope can reach it.
	 */
	async projectOf(
		skill: Pick<Skill, 'projectId' | 'agentId'>,
		ctx: OperationContext = {},
	): Promise<string | null> {
		if (skill.projectId) return skill.projectId;
		if (!skill.agentId) return null;
		const agent = (await this.skillRepository.findAgents([skill.agentId], ctx)).get(skill.agentId);
		return agent?.projectId ?? null;
	}

	/**
	 * Whether the user may do `operation` on the skill, from the skill's own scope:
	 * `projectSkill:*` on the project of a project or agent skill, and the global
	 * `skill:*` for an instance skill. Every user may read an instance skill.
	 */
	async canAccess(
		user: User,
		skill: Pick<Skill, 'projectId' | 'agentId'>,
		operation: 'read' | 'update' | 'delete',
	): Promise<boolean> {
		const projectId = await this.projectOf(skill);
		if (projectId) {
			return await userHasScopes(user, [`projectSkill:${operation}`], false, { projectId });
		}
		return this.canAccessInstanceSkill(user, skill, operation);
	}

	/**
	 * `canAccess` for a whole list: one query for the user's projects, not one per skill.
	 * The caller passes each skill's project from `projectOf`, resolved in bulk.
	 */
	async accessCheck(
		user: User,
		operation: 'read' | 'update' | 'delete',
	): Promise<(skill: Pick<Skill, 'agentId'>, projectId: string | null) => boolean> {
		const projectIds = await this.projectScopeService.getProjectIds(user, [
			`projectSkill:${operation}`,
		]);
		const allowed = projectIds === null ? null : new Set(projectIds);
		return (skill, projectId) =>
			projectId
				? allowed === null || allowed.has(projectId)
				: this.canAccessInstanceSkill(user, skill, operation);
	}

	private canAccessInstanceSkill(
		user: User,
		skill: Pick<Skill, 'agentId'>,
		operation: 'read' | 'update' | 'delete',
	): boolean {
		// An agent skill without a project lost its agent mid-request: only the global scope.
		if (skill.agentId === null && operation === 'read') return true;
		return hasGlobalScope(user, `skill:${operation}`);
	}

	async canEdit(user: User, skill: Pick<Skill, 'projectId' | 'agentId'>): Promise<boolean> {
		return await this.canAccess(user, skill, 'update');
	}

	async assertCanEdit(user: User, skillIds: string[], ctx: OperationContext = {}): Promise<void> {
		const skills = await this.skillRepository.findByIds(skillIds, ctx);
		const names = await this.latestNames(
			skills.map((skill) => skill.id),
			ctx,
		);
		const denied: string[] = [];
		for (const skill of skills) {
			if (!(await this.canEdit(user, skill))) {
				denied.push(`"${names.get(skill.id) ?? skill.id}" (${skill.id})`);
			}
		}
		if (denied.length > 0) {
			throw new ForbiddenError(
				`You can use but not edit ${denied.join(', ')}. Ask someone who can edit ${
					denied.length > 1 ? 'these skills' : 'this skill'
				}, or detach it from this agent.`,
			);
		}
	}

	// ---------------------------------------------------------------- delete

	/**
	 * Deletes a skill that no agent draft and no published agent version uses. The conflict
	 * names the agents in `agentProjectIds` and only counts the others.
	 */
	async deleteSkill(
		skillId: string,
		agentProjectIds: string[] | 'all' = 'all',
		ctx: OperationContext = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			const [skill] = await this.skillRepository.findByIds([skillId], txCtx);
			if (!skill) throw new NotFoundError('Skill not found');
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const usage = await this.skillRepository.findUsage(skillId, agentProjectIds, txCtx);
			if (usage.drafts.length > 0 || usage.pins.length > 0 || usage.hiddenAgents > 0) {
				const name = (await this.latestNames([skillId], txCtx)).get(skillId) ?? skillId;
				const users = [
					...usage.drafts.map((draft) => `${draft.agentName} (draft)`),
					...usage.pins.map(
						(pin) =>
							`${pin.agentName} (${pin.version === null ? 'older published version' : `published v${pin.version}`})`,
					),
				];
				if (usage.hiddenAgents > 0) {
					users.push(
						`${usage.hiddenAgents} ${usage.hiddenAgents === 1 ? 'agent' : 'agents'} in other projects`,
					);
				}
				throw new ConflictError(
					`Skill "${name}" is used by ${[...new Set(users)].join(', ')} and cannot be deleted.`,
				);
			}
			await this.skillRepository.deleteSkill(skillId, txCtx);
		});
		this.logger.debug('Deleted skill', { skillId });
	}
}
