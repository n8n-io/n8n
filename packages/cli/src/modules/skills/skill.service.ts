import { AGENT_SKILL_NAME_MAX_LENGTH, skillNameKey, type AgentSkill } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	ProjectScopeService,
	type AssistantSkillContext,
	type AssistantSkillContent,
	type AssistantSkillFileContent,
	type AssistantSkillSummary,
} from '@n8n/backend-services';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { userHasScopes } from '@/permissions.ee/check-access';

import { SkillAgentsProxy } from './skill-agents-proxy.service';
import { skillContentHash, type SkillContent } from './skill-content-hash';
import { getSkillHash } from './skill-hash';
import { SkillNameTakenError } from './skill-name-taken.error';
import type { SkillFrontmatter } from './skill-version.entity';
import type { Skill, SkillSource } from './skill.entity';
import {
	SkillRepository,
	type AssistantSkillAccess,
	type ResolvedSkillRow,
	type SkillTarget,
} from './skill.repository';

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

/**
 * Builder and MCP tools write here without the REST DTOs, so the name is trimmed here
 * too. A name of only spaces is refused.
 */
function trimmedName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) throw new UserError('Skill name is required.');
	return trimmed;
}

/**
 * The skill with the name that `create` stores. A caller that answers with the body or
 * its hash uses this, so the answer matches the stored skill.
 */
export function withTrimmedName<T extends { name: string }>(skill: T): T {
	return { ...skill, name: trimmedName(skill.name) };
}

function toRecord(rows: Map<string, ResolvedSkillRow>): Record<string, AgentSkill> {
	return Object.fromEntries([...rows].map(([refId, row]) => [refId, toAgentSkill(row)]));
}

/** How a refusal counts the agents in projects the user may not read. */
function agentsInOtherProjects(count: number): string {
	return `${count} ${count === 1 ? 'agent' : 'agents'} in other projects`;
}

export type SkillMoveOptions = {
	/** The name the skill has after this request, when the same request renames it. */
	nameAfterMove?: string;
	/** The scope `assertCanMove` checked. The move is refused if the skill left it since. */
	checkedSource?: SkillTarget;
	/**
	 * The projects whose agents a refusal names, as for `deleteSkill`. It only counts the
	 * agents in other projects.
	 */
	agentProjectIds?: string[] | 'all';
};

/**
 * The rules of skills: which version a skill ref runs, save, edit permission, moves and
 * the delete guard. The agent runtime loads skills by id with no permission check. What
 * depends on agents (who uses a skill, the project of an agent skill) comes from
 * `SkillAgentsProxy`.
 */
@Service()
export class SkillService {
	constructor(
		private readonly logger: Logger,
		private readonly skillRepository: SkillRepository,
		private readonly txRunner: TransactionRunner,
		private readonly projectScopeService: ProjectScopeService,
		private readonly skillAgents: SkillAgentsProxy,
	) {}

	// ---------------------------------------------------------------- reads

	async listForAssistant(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		return await this.skillRepository.findAssistantSkillSummaries(
			await this.authorizedAssistantProject(context),
		);
	}

	async readForAssistant(
		context: AssistantSkillContext,
		skillId: string,
		versionId?: string,
	): Promise<AssistantSkillContent | null> {
		const projectId = await this.authorizedAssistantProject(context);
		const row = await this.skillRepository.findAssistantSkill(skillId, projectId, versionId);
		if (!row) return null;
		const { skill, version, files } = row;
		if (!(await this.canReadForAssistant(context, skill, projectId))) return null;
		const skillProjectId = skill.projectId;
		return {
			id: skill.id,
			projectId: skillProjectId,
			name: version.name,
			description: version.description,
			versionId: version.id,
			version: version.version,
			instructions: version.instructions,
			frontmatter: version.frontmatter,
			files: files.map(({ path }) => ({ path })),
		};
	}

	async readFileForAssistant(
		context: AssistantSkillContext,
		skillId: string,
		versionId: string,
		path: string,
	): Promise<AssistantSkillFileContent | null> {
		const projectId = await this.authorizedAssistantProject(context);
		const row = await this.skillRepository.findAssistantSkillFile(
			skillId,
			projectId,
			versionId,
			path,
		);
		if (!row || !(await this.canReadForAssistant(context, row.skill, projectId))) return null;
		return { skillId, versionId, path: row.file.path, content: row.file.content };
	}

	private async canReadForAssistant(
		context: AssistantSkillContext,
		skill: AssistantSkillAccess,
		projectId: string | null,
	): Promise<boolean> {
		return (
			skill.agentId === null &&
			skill.availableToAssistant &&
			(skill.projectId === null || skill.projectId === projectId) &&
			(await this.canAccess(context.user, skill, 'read'))
		);
	}

	private async authorizedAssistantProject({
		user,
		projectId,
	}: AssistantSkillContext): Promise<string | null> {
		if (!projectId) return null;
		const projects = await this.projectScopeService.getProjectIds(user, [
			'projectSkill:list',
			'projectSkill:read',
		]);
		return projects === null || projects.includes(projectId) ? projectId : null;
	}

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
	async runtimeNames(
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
		const skill = withTrimmedName(input.skill);
		assertHasInstructions(skill);
		if (input.checkNameTaken) {
			await this.assertNameFree(skill.name, input.target, undefined, ctx);
		}
		const id = `skill_${generateNanoId()}`;
		await this.skillRepository.createSkill(
			{ id, target: input.target, source: input.source, createdById: input.createdById },
			toSkillContent(skill),
			ctx,
		);
		this.logger.debug('Created skill', { skillId: id });
		return id;
	}

	async setAssistantAvailability(
		skillId: string,
		available: boolean,
		checkedTarget: SkillTarget,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			const [skill] = await this.skillRepository.findByIds([skillId], txCtx);
			if (!skill) throw new NotFoundError('Skill not found');
			if (skill.projectId !== checkedTarget.projectId || skill.agentId !== checkedTarget.agentId) {
				throw new ConflictError('The skill scope changed. Reload the skill and try again.');
			}
			if (available && skill.agentId !== null) {
				throw new UserError(
					"The n8n Assistant can't use skills scoped to an agent. Move the skill to a project or the instance first.",
				);
			}
			await this.skillRepository.setAssistantAvailability(skillId, available, txCtx);
		});
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
			// Only a new name is trimmed, so a save never renames a skill it did not rename.
			if (changes.name !== undefined) changes.name = trimmedName(changes.name);
			if (baseSkillHash !== getSkillHash(current)) {
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
				await this.skillAgents.assertRenameKeepsNamesApart(
					skillId,
					latest.version.name,
					skill.name,
					txCtx,
				);
			}
			const version = await this.skillRepository.nextVersionNumber(skillId, txCtx);
			const versionId = await this.skillRepository.insertSavedVersion(
				skillId,
				version,
				content,
				userId,
				txCtx,
			);
			const followingIds = await this.skillAgents.markFollowersChanged(skillId, txCtx);
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
		await this.skillAgents.refreshAgents(agentIds, excludePushRef);
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

	// ---------------------------------------------------------------- publish

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

	// ---------------------------------------------------------------- move

	/**
	 * Moves a skill to a project, one agent or the instance. Refused when an agent that uses
	 * the skill cannot add it in the new scope, so a move never takes a skill away from an
	 * agent. `keepAgentId` is the agent that asks for the move: it does not block it. The edit
	 * lock makes a concurrent attach wait, so the check and the move see the same agents.
	 */
	async changeTarget(
		skillId: string,
		target: SkillTarget,
		keepAgentId: string | undefined,
		ctx: OperationContext = {},
		{ nameAfterMove, checkedSource, agentProjectIds = 'all' }: SkillMoveOptions = {},
	): Promise<void> {
		await this.txRunner.run(ctx, async (txCtx) => {
			await this.skillRepository.lockForEdit([skillId], txCtx);
			// `assertCanMove` ran before the lock. If another move changed the scope since,
			// the permission was checked on the wrong scope.
			if (checkedSource) {
				const [locked] = await this.skillRepository.findByIds([skillId], txCtx);
				if (!locked) throw new NotFoundError('Skill not found');
				if (
					locked.projectId !== checkedSource.projectId ||
					locked.agentId !== checkedSource.agentId
				) {
					throw new ConflictError(
						'The skill was moved somewhere else. Reload to see where it is now.',
					);
				}
			}
			const others = (await this.skillAgents.findUsingAgentIds(skillId, txCtx)).filter(
				(id) => id !== keepAgentId,
			);
			await this.assertAgentsKeepAccess(others, target, agentProjectIds, txCtx);
			// The new scope must not already hold a name like the one the skill has after the move.
			const name =
				nameAfterMove ??
				(await this.skillRepository.findLatestSummaries([skillId], txCtx)).get(skillId)?.name;
			if (name) await this.assertNameFree(name, target, skillId, txCtx);
			await this.skillRepository.updateTarget(skillId, target, txCtx);
		});
	}

	/**
	 * Refuses a move that takes the skill away from one of `agentIds`. An agent can add an
	 * instance skill, a skill of its own project and its own agent skills.
	 */
	private async assertAgentsKeepAccess(
		agentIds: string[],
		target: SkillTarget,
		agentProjectIds: string[] | 'all',
		ctx: OperationContext,
	): Promise<void> {
		if (agentIds.length === 0 || (target.projectId === null && target.agentId === null)) return;
		const agents = await this.skillAgents.findAgents(agentIds, ctx);
		const losing = agentIds.filter((id) =>
			target.agentId ? id !== target.agentId : agents.get(id)?.projectId !== target.projectId,
		);
		if (losing.length === 0) return;
		const named: string[] = [];
		let hidden = 0;
		for (const id of losing) {
			const agent = agents.get(id);
			if (agent && (agentProjectIds === 'all' || agentProjectIds.includes(agent.projectId))) {
				named.push(`"${agent.name}"`);
			} else {
				hidden++;
			}
		}
		if (hidden > 0) named.push(agentsInOtherProjects(hidden));
		const one = losing.length === 1;
		throw new ConflictError(
			`${named.join(', ')} would lose access to this skill. Choose a scope that includes ${
				one ? 'that agent' : 'those agents'
			}, or detach the skill from ${one ? 'it' : 'them'} first.`,
		);
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
		const agent = (await this.skillAgents.findAgents([skill.agentId], ctx)).get(skill.agentId);
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

	/**
	 * A move takes the skill out of its scope, as a delete does, so it needs the delete
	 * permission there. A custom role can grant update without delete.
	 */
	async assertCanMove(user: User, skillId: string): Promise<SkillTarget> {
		const [skill] = await this.skillRepository.findByIds([skillId]);
		if (!skill) throw new NotFoundError('Skill not found');
		if (!(await this.canAccess(user, skill, 'delete'))) {
			throw new ForbiddenError('You are not allowed to move this skill out of its scope.');
		}
		// Pass this to `changeTarget` as `checkedSource`, so the move fails if the scope changed.
		return { projectId: skill.projectId, agentId: skill.agentId };
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
			const usage = await this.skillAgents.findUsage(skillId, agentProjectIds, txCtx);
			if (usage.drafts.length > 0 || usage.pins.length > 0 || usage.hiddenAgents > 0) {
				const name = (await this.latestNames([skillId], txCtx)).get(skillId) ?? skillId;
				const users = [
					...usage.drafts.map((draft) => `${draft.agentName} (draft)`),
					...usage.pins.map(
						(pin) =>
							`${pin.agentName} (${pin.version === null ? 'older published version' : `published v${pin.version}`})`,
					),
				];
				if (usage.hiddenAgents > 0) users.push(agentsInOtherProjects(usage.hiddenAgents));
				throw new ConflictError(
					`Skill "${name}" is used by ${[...new Set(users)].join(', ')} and cannot be deleted.`,
				);
			}
			await this.skillRepository.deleteSkill(skillId, txCtx);
		});
		this.logger.debug('Deleted skill', { skillId });
	}
}
