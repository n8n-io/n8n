import type {
	CreateSkillDto,
	ListSkillAgentsQueryDto,
	ListSkillsQueryDto,
	SkillAgentOption,
	SkillDetail,
	SkillListItem,
	SkillListResponse,
	SkillSaveResponse,
	SaveSkillDto,
	SkillScope,
	SkillSortOption,
	SkillUserDto,
	SkillNewNameQueryDto,
	SkillNewNameResponse,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import { TransactionRunner, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import { SkillAgentsProxy } from './skill-agents-proxy.service';
import { getSkillHash } from './skill-hash';
import type { Skill } from './skill.entity';
import {
	SkillRepository,
	type SkillListSort,
	type SkillTarget,
	type SkillVisibility,
} from './skill.repository';
import { SkillService, toAgentSkill } from './skill.service';
import { SkillsTelemetry, type SkillTelemetrySource } from './skills-telemetry';
import { AssistantSkillsRollout } from './assistant-skills-rollout';

const LIST_SORTS: Record<SkillSortOption, SkillListSort> = {
	'name:asc': { by: 'name', order: 'ASC' },
	'name:desc': { by: 'name', order: 'DESC' },
	'updatedAt:asc': { by: 'updatedAt', order: 'ASC' },
	'updatedAt:desc': { by: 'updatedAt', order: 'DESC' },
};

function scopeOf(skill: Pick<Skill, 'projectId' | 'agentId'>): SkillScope {
	if (skill.agentId) return 'agent';
	if (skill.projectId) return 'project';
	return 'instance';
}

/**
 * Skills as the settings page sees them: list, read, create, save and delete. The
 * permission comes from each skill's own scope (see `SkillService.canAccess`), so the
 * routes carry no scope decorator.
 */
@Service()
export class SkillsApiService {
	constructor(
		private readonly skillService: SkillService,
		private readonly skillRepository: SkillRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly txRunner: TransactionRunner,
		private readonly userRepository: UserRepository,
		private readonly skillsTelemetry: SkillsTelemetry,
		private readonly skillAgents: SkillAgentsProxy,
		private readonly assistantSkillsRollout: AssistantSkillsRollout,
	) {}

	async list(user: User, query: ListSkillsQueryDto): Promise<SkillListResponse> {
		if (query.attachableTo !== undefined && (query.scope || query.projectId || query.agentId)) {
			throw new UserError('Filter by attachableTo alone, without scope, projectId or agentId.');
		}
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		// A project the user may not list answers like a project without skills.
		if (query.projectId && projectIds !== null && !projectIds.includes(query.projectId)) {
			return { count: 0, data: [] };
		}
		const [usedBy, attachableTo, visibility, projectAgentIds] = await Promise.all([
			this.usedByFilter(user, query.agentId),
			this.attachTarget(query.attachableTo),
			this.visibilityOf(projectIds),
			query.projectId ? this.skillAgents.findAgentIdsInProjects([query.projectId]) : undefined,
		]);
		if (usedBy === null) return { count: 0, data: [] };
		const project =
			query.projectId && projectAgentIds
				? { id: query.projectId, agentIds: projectAgentIds }
				: undefined;
		const { skills, count } = await this.skillRepository.findVisiblePage(visibility, {
			scope: query.scope,
			project,
			attachableTo,
			usedBy,
			createdById: query.createdById,
			search: query.search,
			sort: query.sortBy && LIST_SORTS[query.sortBy],
			skip: query.skip,
			take: query.take,
		});
		return { count, data: await this.toListItems(user, skills) };
	}

	/** The users who created a skill that the user may see, for the creator filter. */
	async listCreators(user: User): Promise<SkillUserDto[]> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		const creatorIds = await this.skillRepository.findVisibleCreatorIds(
			await this.visibilityOf(projectIds),
		);
		return [...(await this.findCreators(creatorIds)).values()];
	}

	/** The agents the user may read, for the agent filter. Global readers see every agent. */
	async listAgents(user: User, query: ListSkillAgentsQueryDto): Promise<SkillAgentOption[]> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		return await this.skillAgents.findAgentSummaries(projectIds, {
			search: query.search,
			limit: query.take,
		});
	}

	async get(user: User, skillId: string): Promise<SkillDetail> {
		return await this.toDetail(user, await this.requireAccess(user, skillId, 'read'));
	}

	/** A free name for a new skill. Needs the create permission there, so it shows no other scope. */
	async newName(user: User, query: SkillNewNameQueryDto): Promise<SkillNewNameResponse> {
		const target = await this.targetForCreate(user, query);
		return { name: await this.skillService.freeName(query.name, target) };
	}

	async create(
		user: User,
		payload: CreateSkillDto,
		source: SkillTelemetrySource = 'ui',
	): Promise<SkillDetail> {
		if (
			payload.availableToAssistant !== undefined &&
			!(await this.assistantSkillsRollout.isEnabled())
		) {
			throw new UserError("The n8n Assistant can't use skills on this instance.");
		}
		const target = await this.targetForCreate(user, payload);
		const input = {
			checkNameTaken: true,
			target,
			skill: payload.skill,
			source,
			createdById: user.id,
		};
		const id =
			payload.availableToAssistant || payload.availableToMCP
				? await this.txRunner.run({}, async (ctx) => {
						const createdId = await this.skillService.create(input, ctx);
						if (payload.availableToAssistant) {
							await this.skillService.setAssistantAvailability(createdId, true, target, ctx);
						}
						if (payload.availableToMCP) {
							await this.skillService.setMcpAvailability(createdId, true, target, ctx);
						}
						return createdId;
					})
				: await this.skillService.create(input);
		await this.skillsTelemetry.created(
			user.id,
			[{ id, ...target }],
			source,
			source === 'ui' ? (payload.method ?? 'manual') : 'ai',
		);
		// No second access check: a custom role can create skills it cannot read later.
		const [skill] = await this.skillRepository.findByIds([id]);
		if (!skill) throw new NotFoundError('Skill not found');
		return await this.toDetail(user, skill);
	}

	/** Saves the changes as the next version. Unchanged content creates nothing. */
	async update(
		user: User,
		skillId: string,
		payload: SaveSkillDto,
		source: SkillTelemetrySource = 'ui',
	): Promise<SkillSaveResponse> {
		if (
			payload.availableToAssistant !== undefined &&
			!(await this.assistantSkillsRollout.isEnabled())
		) {
			throw new NotFoundError('Skill not found');
		}
		const skill = await this.requireAccess(user, skillId, 'update');
		const { scope, projectId, availableToAssistant, availableToMCP, ...update } = payload;
		const target = scope ? await this.targetForCreate(user, { scope, projectId }) : undefined;
		const moves =
			target !== undefined &&
			(target.projectId !== skill.projectId || target.agentId !== skill.agentId);

		const checkedSource = moves ? await this.skillService.assertCanMove(user, skillId) : undefined;

		if (!moves && availableToAssistant === undefined && availableToMCP === undefined) {
			const { followingAgentIds: _following, ...saved } = await this.skillService.save(
				skillId,
				update,
				user.id,
			);
			if (saved.created) {
				// No move, so the skill stays where `requireAccess` read it.
				await this.skillsTelemetry.updated(user.id, skill, source, saved.version, false);
			}
			return { id: skillId, ...saved, skillHash: getSkillHash(saved.skill) };
		}

		// A refused move names only the agents the user may read, as the detail does.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		// Keep availability, scope, and content changes atomic. Move first so the name
		// check uses the destination scope.
		const { followingAgentIds, ...saved } = await this.txRunner.run({}, async (ctx) => {
			if (moves) {
				await this.skillService.changeTarget(skillId, target, undefined, ctx, {
					nameAfterMove: update.name,
					checkedSource,
					agentProjectIds: agentProjectIds ?? 'all',
				});
			}
			if (availableToAssistant !== undefined) {
				await this.skillService.setAssistantAvailability(
					skillId,
					availableToAssistant,
					target ?? skill,
					ctx,
				);
			}
			if (availableToMCP !== undefined) {
				await this.skillService.setMcpAvailability(skillId, availableToMCP, target ?? skill, ctx);
			}
			return await this.skillService.save(skillId, update, user.id, ctx);
		});
		// `save` leaves the refresh to the caller when it joins a transaction.
		await this.skillService.refreshFollowingAgents(followingAgentIds);
		if (saved.created) {
			await this.skillsTelemetry.updated(
				user.id,
				target ? { id: skillId, ...target } : skill,
				source,
				saved.version,
				moves,
			);
		}
		return { id: skillId, ...saved, skillHash: getSkillHash(saved.skill) };
	}

	async delete(user: User, skillId: string, source: SkillTelemetrySource = 'ui'): Promise<void> {
		const skill = await this.requireAccess(user, skillId, 'delete');
		// The conflict message names only the agents the user may read, as the detail does.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		await this.skillService.deleteSkill(skillId, agentProjectIds ?? 'all');
		await this.skillsTelemetry.deleted(user.id, skill, source);
	}

	private async toDetail(user: User, skill: Skill): Promise<SkillDetail> {
		const [item] = await this.toListItems(user, [skill]);
		const latest = (await this.skillRepository.findLatestSaved([skill.id])).get(skill.id);
		if (!item || !latest) throw new NotFoundError('Skill not found');
		const content = toAgentSkill(latest);
		// Any user can read an instance skill, so "used by" only names the agents they can read.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		return {
			...item,
			// Name, description and number from the same row as the content, so a save that
			// lands between the two reads cannot mix two versions.
			name: latest.version.name,
			description: latest.version.description,
			latestVersion: latest.version.version,
			skill: content,
			skillHash: getSkillHash(content),
			usedBy: await this.skillAgents.findUsage(skill.id, agentProjectIds ?? 'all'),
		};
	}

	/** A skill the user cannot see answers like a missing one. */
	private async requireAccess(
		user: User,
		skillId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<Skill> {
		const [skill] = await this.skillRepository.findByIds([skillId]);
		if (!skill || !(await this.skillService.canAccess(user, skill, 'read'))) {
			throw new NotFoundError('Skill not found');
		}
		if (operation !== 'read' && !(await this.skillService.canAccess(user, skill, operation))) {
			throw new ForbiddenError(
				operation === 'delete'
					? 'You are not allowed to delete this skill.'
					: 'You can use but not edit this skill.',
			);
		}
		return skill;
	}

	/**
	 * The agent filter: the skills the agent uses and its own agent skills. Null when the
	 * agent does not exist or the user may not read it, so the list is empty and shows
	 * nothing about that agent.
	 */
	private async usedByFilter(
		user: User,
		agentId: string | undefined,
	): Promise<{ agentId: string; skillIds: string[] } | undefined | null> {
		if (agentId === undefined) return undefined;
		const [agents, readable] = await Promise.all([
			this.skillAgents.findAgents([agentId]),
			this.projectScopeService.getProjectIds(user, ['agent:read']),
		]);
		const agent = agents.get(agentId);
		if (!agent) return null;
		if (readable !== null && !readable.includes(agent.projectId)) return null;
		return { agentId, skillIds: await this.skillAgents.findSkillIdsUsedByAgent(agentId) };
	}

	/**
	 * The skills a user may list, from the projects where they hold `projectSkill:list`
	 * (null for all). An agent skill has no projectId: it belongs to the project of its agent.
	 */
	private async visibilityOf(projectIds: string[] | null): Promise<SkillVisibility> {
		if (projectIds === null) return { projectIds: 'all', agentIds: 'all' };
		return { projectIds, agentIds: await this.skillAgents.findAgentIdsInProjects(projectIds) };
	}

	/** The agent of an `attachableTo` filter with its project. An unknown agent can attach nothing. */
	private async attachTarget(
		agentId: string | undefined,
	): Promise<{ agentId: string; projectId: string } | undefined> {
		if (agentId === undefined) return undefined;
		const agent = (await this.skillAgents.findAgents([agentId])).get(agentId);
		if (!agent) throw new NotFoundError('Agent not found');
		return { agentId, projectId: agent.projectId };
	}

	/** Where a create or a move puts the skill. The user needs the create permission there. */
	private async targetForCreate(
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
				const agent = (await this.skillAgents.findAgents([agentId])).get(agentId);
				if (!agent) throw new NotFoundError('Agent not found');
				await this.assertCanCreateIn(user, agent.projectId);
				return { projectId: null, agentId };
			}
		}
	}

	private async assertCanCreateIn(user: User, projectId: string): Promise<void> {
		if (!(await userHasScopes(user, ['projectSkill:create'], false, { projectId }))) {
			throw new ForbiddenError('You are not allowed to create skills for this project.');
		}
	}

	private async toListItems(user: User, skills: Skill[]): Promise<SkillListItem[]> {
		const ids = skills.map((skill) => skill.id);
		// An agent skill has no projectId: resolve its project through its agent.
		const agents = await this.skillAgents.findAgents(
			skills.flatMap((skill) => (skill.agentId ? [skill.agentId] : [])),
		);
		const projectOf = (skill: Skill) =>
			skill.projectId ?? (skill.agentId ? (agents.get(skill.agentId)?.projectId ?? null) : null);
		const [latest, usage, projects, creators, canEdit, canDelete] = await Promise.all([
			this.skillRepository.findLatestSummaries(ids),
			this.skillAgents.countUsingAgents(ids),
			this.skillRepository.findProjects(skills.flatMap((skill) => projectOf(skill) ?? [])),
			this.findCreators(skills.flatMap((skill) => skill.createdById ?? [])),
			this.skillService.accessCheck(user, 'update'),
			this.skillService.accessCheck(user, 'delete'),
		]);
		const items: SkillListItem[] = [];
		for (const skill of skills) {
			const summary = latest.get(skill.id);
			if (!summary) continue;
			const projectId = projectOf(skill);
			items.push({
				id: skill.id,
				name: summary.name,
				description: summary.description,
				scope: scopeOf(skill),
				projectId,
				projectName: projectId ? (projects.get(projectId)?.name ?? null) : null,
				projectType: projectId ? (projects.get(projectId)?.type ?? null) : null,
				agentId: skill.agentId,
				agentName: skill.agentId ? (agents.get(skill.agentId)?.name ?? null) : null,
				source: skill.source,
				createdBy: skill.createdById ? (creators.get(skill.createdById) ?? null) : null,
				latestVersion: summary.version,
				usedByAgents: usage.get(skill.id) ?? 0,
				availableToAssistant: skill.availableToAssistant,
				availableToMCP: skill.availableToMCP,
				canEdit: canEdit(skill, projectId),
				canDelete: canDelete(skill, projectId),
				createdAt: skill.createdAt.toISOString(),
				updatedAt: skill.updatedAt.toISOString(),
			});
		}
		return items;
	}

	/** The users with these ids, in one query. */
	private async findCreators(userIds: string[]): Promise<Map<string, SkillUserDto>> {
		const ids = [...new Set(userIds)];
		if (ids.length === 0) return new Map();
		const users = await this.userRepository.findManyByIds(ids);
		return new Map(
			users.map((creator) => [
				creator.id,
				{
					id: creator.id,
					email: creator.email ?? null,
					firstName: creator.firstName ?? null,
					lastName: creator.lastName ?? null,
				},
			]),
		);
	}
}
