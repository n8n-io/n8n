import type { CreateSkillDto } from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { Skill } from '../database/entities/skill.entity';
import { SkillRepository } from '../database/repositories/skill.repository';
import type { SkillTarget } from '../utils/skill-content';
import { requiredSourceScope, type SkillSourceAction } from './skill-source.policy';
import { SkillUsageProxy } from './skill-usage-proxy.service';

type SkillOperation = 'read' | 'update' | 'delete';

/**
 * Who may do what with a skill or a skill source. The permission comes from the scope of the
 * skill or the source: `projectSkill:*` on the project of a project or agent skill or of a
 * project source, and the global `skill:*` for an instance skill or a Global source. The
 * project of an agent skill comes from `SkillUsageProxy`.
 */
@Service()
export class SkillAccessService {
	constructor(
		private readonly skillRepository: SkillRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly skillUsage: SkillUsageProxy,
	) {}

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
		const agent = (await this.skillUsage.findAgents([skill.agentId], ctx)).get(skill.agentId);
		return agent?.projectId ?? null;
	}

	/** Whether the user may do `operation` on the skill. Every user may read an instance skill. */
	async canAccess(
		user: User,
		skill: Pick<Skill, 'projectId' | 'agentId'>,
		operation: SkillOperation,
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
		operation: SkillOperation,
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

	/** A skill the user cannot see answers like a missing one. */
	async requireAccess(user: User, skillId: string, operation: SkillOperation): Promise<Skill> {
		const [skill] = await this.skillRepository.findByIds([skillId]);
		if (!skill || !(await this.canAccess(user, skill, 'read'))) {
			throw new NotFoundError('Skill not found');
		}
		if (operation !== 'read' && !(await this.canAccess(user, skill, operation))) {
			throw new ForbiddenError(
				operation === 'delete'
					? 'You are not allowed to delete this skill.'
					: 'You can use but not edit this skill.',
			);
		}
		return skill;
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
		// Pass this to `moveTrusted` as `checkedSource`, so the move fails if the scope changed.
		return { projectId: skill.projectId, agentId: skill.agentId };
	}

	async assertCanEdit(user: User, skillIds: string[], ctx: OperationContext = {}): Promise<void> {
		const skills = await this.skillRepository.findByIds(skillIds, ctx);
		const latest = await this.skillRepository.findLatestSaved(
			skills.map((skill) => skill.id),
			ctx,
		);
		const denied: string[] = [];
		for (const skill of skills) {
			if (!(await this.canAccess(user, skill, 'update'))) {
				denied.push(`"${latest.get(skill.id)?.version.name ?? skill.id}" (${skill.id})`);
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

	/** Where a create or a move puts the skill. The user needs the create permission there. */
	async resolveCreateTarget(
		user: User,
		payload: Pick<CreateSkillDto, 'scope' | 'projectId' | 'agentId'>,
	): Promise<SkillTarget> {
		switch (payload.scope) {
			case 'instance':
				if (payload.projectId || payload.agentId) {
					throw new UserError('An instance skill has no project and no agent.');
				}
				if (!hasGlobalScope(user, 'skill:create')) {
					throw new ForbiddenError('You are not allowed to create skills for the whole instance.');
				}
				return { projectId: null, agentId: null };
			case 'project': {
				const { projectId } = payload;
				if (!projectId) throw new UserError('A project skill needs a project id.');
				if (payload.agentId) throw new UserError('A project skill has no agent.');
				await this.assertCanCreateIn(user, projectId);
				// A global scope passes without looking at the project, so check that it exists.
				if (!(await this.skillRepository.findProjects([projectId])).has(projectId)) {
					throw new NotFoundError('Project not found');
				}
				// A personal project keeps its own skills, as a team project does.
				return { projectId, agentId: null };
			}
			case 'agent': {
				const { agentId } = payload;
				if (!agentId) throw new UserError('An agent skill needs an agent id.');
				if (payload.projectId)
					throw new UserError('An agent skill takes its project from the agent.');
				const agent = (await this.skillUsage.findAgents([agentId])).get(agentId);
				if (!agent) throw new NotFoundError('Agent not found');
				await this.assertCanCreateIn(user, agent.projectId);
				return { projectId: null, agentId };
			}
		}
	}

	/** Whether the user may do `action` on a source in this scope. `projectId` null is Global. */
	async canOnSource(
		user: User,
		source: { projectId: string | null },
		action: SkillSourceAction,
	): Promise<boolean> {
		const { projectId } = source;
		const scope = requiredSourceScope(action, projectId ? 'project' : 'global');
		if (scope === null) return true;
		return projectId
			? await userHasScopes(user, [scope], false, { projectId })
			: hasGlobalScope(user, scope);
	}

	/**
	 * Change scope takes the source and its skills out of their scope, as a disconnect does,
	 * and puts them into another scope, as a connect does.
	 */
	async canChangeSourceScope(
		user: User,
		from: { projectId: string | null },
		to: { projectId: string | null },
	): Promise<boolean> {
		return (
			(await this.canOnSource(user, from, 'disconnect')) &&
			(await this.canOnSource(user, to, 'connect'))
		);
	}

	/**
	 * The projects whose sources the user sees, as the skills list does. Every user also sees
	 * the Global sources. A source in another project stays hidden, also from the duplicate check.
	 */
	async visibleSourceProjects(user: User): Promise<string[] | 'all'> {
		return (await this.projectScopeService.getProjectIds(user, ['projectSkill:list'])) ?? 'all';
	}

	private async assertCanCreateIn(user: User, projectId: string): Promise<void> {
		if (!(await userHasScopes(user, ['projectSkill:create'], false, { projectId }))) {
			throw new ForbiddenError('You are not allowed to create skills for this project.');
		}
	}

	private canAccessInstanceSkill(
		user: User,
		skill: Pick<Skill, 'agentId'>,
		operation: SkillOperation,
	): boolean {
		// An agent skill without a project lost its agent mid-request: only the global scope.
		if (skill.agentId === null && operation === 'read') return true;
		return hasGlobalScope(user, `skill:${operation}`);
	}
}
