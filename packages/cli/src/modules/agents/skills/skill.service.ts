import type { AgentSkill } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
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
import { findIntroducedNameClashes, renameIntroducesClash } from './skill-names';

/** A skill ref in an agent config. A ref with `versionId` runs that version. */
export type SkillRef = { id: string; enabled?: boolean; versionId?: string };

/** Fields to change, plus the hash of the version the editor started from. */
export type SkillUpdate = Partial<AgentSkill> & { baseSkillHash?: string };

export type SkillSaveResult = {
	versionId: string;
	version: number;
	/** False when the content matched the latest version and nothing was saved. */
	created: boolean;
	/** The content of the latest version after the save. */
	skill: AgentSkill;
};

const ALLOWED_TOOLS_KEY = 'allowed-tools';

export function toSkillContent(skill: AgentSkill, frontmatter: SkillFrontmatter | null = null) {
	const { [ALLOWED_TOOLS_KEY]: _replaced, ...rest } = frontmatter ?? {};
	const merged: SkillFrontmatter = skill.allowedTools?.length
		? { ...rest, [ALLOWED_TOOLS_KEY]: skill.allowedTools.join(' ') }
		: rest;
	const content: SkillContent = {
		name: skill.name,
		description: skill.description,
		instructions: skill.instructions,
		frontmatter: Object.keys(merged).length > 0 ? merged : null,
		files: (skill.references ?? []).map(({ path, content: text }) => ({ path, content: text })),
	};
	return content;
}

// TODO(CONTEXT-225): read the list with `splitTokenList` from `@n8n/utils` once #40465 is in.
function allowedToolsOf(frontmatter: SkillFrontmatter | null): string[] {
	const value = frontmatter?.[ALLOWED_TOOLS_KEY];
	return typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];
}

/** The `AgentSkill` shape the runtime and the API use, from one version row. */
export function toAgentSkill(row: ResolvedSkillRow): AgentSkill {
	const allowedTools = allowedToolsOf(row.version.frontmatter);
	return {
		name: row.version.name,
		description: row.version.description,
		instructions: row.version.instructions,
		...(allowedTools.length ? { allowedTools } : {}),
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

	// ---------------------------------------------------------------- writes

	/** Creates a skill with its v1. Returns the new id. */
	async create(
		input: { target: SkillTarget; skill: AgentSkill; source: SkillSource; createdById: string },
		ctx: OperationContext = {},
	): Promise<string> {
		assertHasInstructions(input.skill);
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
	 */
	async save(
		skillId: string,
		update: SkillUpdate,
		userId: string,
		ctx: OperationContext = {},
	): Promise<SkillSaveResult> {
		const { saved, following } = await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const latest = (await this.skillRepository.findLatestSaved([skillId], txCtx)).get(skillId);
			if (!latest) throw new NotFoundError('Skill not found');
			const current = toAgentSkill(latest);
			const { baseSkillHash, ...changes } = update;
			if (baseSkillHash !== undefined && baseSkillHash !== getAgentSkillHash(current)) {
				throw new ConflictError(
					'The skill was changed somewhere else. Reload to get the latest version.',
				);
			}
			const skill: AgentSkill = { ...current, ...changes };
			if (!skill.allowedTools?.length) delete skill.allowedTools;
			if (!skill.references?.length) delete skill.references;
			assertHasInstructions(skill);
			const content = toSkillContent(skill, latest.version.frontmatter);
			if (skillContentHash(content) === latest.version.contentHash) {
				const unchanged = { versionId: latest.version.id, version: latest.version.version };
				return { saved: { ...unchanged, created: false, skill: current }, following: [] };
			}
			if (skill.name !== latest.version.name) {
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
			return { saved: { versionId, version, created: true, skill }, following: followingIds };
		});
		if (following.length > 0) await this.refreshAgents(following);
		this.logger.debug('Saved skill', {
			skillId,
			version: saved.version,
			created: saved.created,
			following,
		});
		return saved;
	}

	/** After a save: following agents drop their cached runtime and their editors reload. */
	private async refreshAgents(agentIds: string[]): Promise<void> {
		// Imported on use: the runtime cache depends on services that will depend on this one.
		const { AgentRuntimeCacheService } = await import('../agent-runtime-cache.service.js');
		const cache = Container.get(AgentRuntimeCacheService);
		for (const agentId of agentIds) cache.clearRuntimes(agentId);
		for (const agent of await this.agentRepository.findProjectIdsByIds(agentIds)) {
			this.agentUpdateBroadcaster.notify({
				projectId: agent.projectId,
				agentId: agent.id,
				source: 'user',
			});
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
		const otherIds = (agent: (typeof agents)[number]) =>
			(refs.get(agent.id) ?? []).map((ref) => ref.skillId).filter((id) => id !== skillId);
		const names = await this.latestNames(agents.flatMap(otherIds), ctx);
		const clashing = agents.filter((agent) =>
			renameIntroducesClash(
				otherIds(agent).flatMap((id) => names.get(id) ?? []),
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
	 * Publish, step 1: the version each ref resolves to, disabled refs included. Publish
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

	/** Publish, step 2: after the `agent_history` row exists. */
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

	/** An agent can attach instance skills and the skills of its own project. */
	isAttachable(skill: Pick<Skill, 'userId' | 'projectId'>, agentProjectId: string): boolean {
		if (skill.userId !== null) return false;
		return skill.projectId === null || skill.projectId === agentProjectId;
	}

	/**
	 * The check an agent config save runs on the skill refs it gets. The agent's current
	 * refs come from its dependency rows. Unknown ids are dropped unless disabled or
	 * already attached. A ref keeps a pin only when the agent already had it. A new ref
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
			.filter((ref) => ref.enabled === false || existingIds.has(ref.id) || found.has(ref.id))
			.map(({ versionId, ...ref }) =>
				versionId !== undefined && existingPins.get(ref.id) === versionId
					? { ...ref, versionId }
					: ref,
			);
		const newIds = [...new Set(kept.map((ref) => ref.id))].filter(
			(id) => !existingIds.has(id) && found.has(id),
		);
		if (newIds.length === 0) return kept;

		const keptExistingIds = [...new Set(kept.map((ref) => ref.id))].filter((id) =>
			existingIds.has(id),
		);
		const names = await this.latestNames([...keptExistingIds, ...newIds], ctx);
		for (const id of newIds) {
			const skill = found.get(id);
			if (skill && !this.isAttachable(skill, agent.projectId)) {
				throw new UserError(
					`Skill "${names.get(id) ?? id}" (${id}) is not available to this agent. An agent can use the skills of its own project and instance skills.`,
				);
			}
		}
		const clashes = findIntroducedNameClashes(
			keptExistingIds.flatMap((id) => names.get(id) ?? []),
			newIds.flatMap((id) => names.get(id) ?? []),
		);
		if (clashes.length > 0) {
			throw new UserError(
				`This agent already has a skill with a name like "${clashes.join('", "')}". Rename one of them, or detach the other skill first.`,
			);
		}
		return kept;
	}

	// ---------------------------------------------------------------- permission

	/**
	 * Whether the user may do `operation` on the skill, from the skill's own scope:
	 * `projectSkill:*` on its project for a project skill, the owner or the global
	 * `skill:*` for a "Just you" skill, and the global `skill:*` for an instance skill.
	 * Every user may read an instance skill.
	 */
	async canAccess(
		user: User,
		skill: Pick<Skill, 'userId' | 'projectId'>,
		operation: 'read' | 'update' | 'delete',
	): Promise<boolean> {
		if (skill.projectId) {
			return await userHasScopes(user, [`projectSkill:${operation}`], false, {
				projectId: skill.projectId,
			});
		}
		if (skill.userId === user.id) return true;
		if (skill.userId === null && operation === 'read') return true;
		return hasGlobalScope(user, `skill:${operation}`);
	}

	async canEdit(user: User, skill: Pick<Skill, 'userId' | 'projectId'>): Promise<boolean> {
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

	/** Deletes a skill that no agent draft and no published agent version uses. */
	async deleteSkill(skillId: string, ctx: OperationContext = {}): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			const [skill] = await this.skillRepository.findByIds([skillId], txCtx);
			if (!skill) throw new NotFoundError('Skill not found');
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const usage = await this.skillRepository.findUsage(skillId, txCtx);
			if (usage.drafts.length > 0 || usage.pins.length > 0) {
				const name = (await this.latestNames([skillId], txCtx)).get(skillId) ?? skillId;
				const users = [
					...usage.drafts.map((draft) => `${draft.agentName} (draft)`),
					...usage.pins.map(
						(pin) =>
							`${pin.agentName} (published v${pin.version}${pin.isActive ? ', current' : ''})`,
					),
				];
				throw new ConflictError(
					`Skill "${name}" is used by ${[...new Set(users)].join(', ')} and cannot be deleted.`,
				);
			}
			await this.skillRepository.deleteSkill(skillId, txCtx);
		});
		this.logger.debug('Deleted skill', { skillId });
	}
}
