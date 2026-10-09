import type {
	CreateSkillDto,
	ListSkillsQueryDto,
	SkillDetail,
	SkillListItem,
	SkillListResponse,
	SkillSaveResponse,
	SkillScope,
	UpdateAgentSkillDto,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { Skill } from '../entities/skill.entity';
import { SkillRepository, type SkillTarget } from '../repositories/skill.repository';
import { getAgentSkillHash } from '../utils/agent-config-hash';
import { SkillService, toAgentSkill } from './skill.service';

function scopeOf(skill: Pick<Skill, 'userId' | 'projectId'>): SkillScope {
	if (skill.projectId) return 'project';
	if (skill.userId) return 'user';
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
	) {}

	async list(user: User, query: ListSkillsQueryDto): Promise<SkillListResponse> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		let skills = await this.skillRepository.findVisible({
			userId: user.id,
			allUsers: hasGlobalScope(user, 'skill:list'),
			projectIds: projectIds ?? 'all',
		});
		if (query.scope) skills = skills.filter((skill) => scopeOf(skill) === query.scope);
		if (query.projectId) skills = skills.filter((skill) => skill.projectId === query.projectId);

		// Names live on the version rows, so the search runs before the page is cut: the
		// count and the page then both describe the matching skills.
		const search = query.search?.toLowerCase();
		if (search) {
			const summaries = await this.skillRepository.findLatestSummaries(
				skills.map((skill) => skill.id),
			);
			skills = skills.filter((skill) => {
				const summary = summaries.get(skill.id);
				return (
					summary !== undefined &&
					(summary.name.toLowerCase().includes(search) ||
						summary.description.toLowerCase().includes(search))
				);
			});
		}

		const page =
			query.take === undefined ? skills : skills.slice(query.skip, query.skip + query.take);
		return { count: skills.length, data: await this.toListItems(user, page) };
	}

	async get(user: User, skillId: string): Promise<SkillDetail> {
		return await this.toDetail(user, await this.requireAccess(user, skillId, 'read'));
	}

	async create(user: User, payload: CreateSkillDto): Promise<SkillDetail> {
		const target = await this.targetForCreate(user, payload);
		const id = await this.skillService.create({
			target,
			skill: payload.skill,
			source: 'ui',
			createdById: user.id,
		});
		// No second access check: a custom role can create skills it cannot read later.
		const [skill] = await this.skillRepository.findByIds([id]);
		if (!skill) throw new NotFoundError('Skill not found');
		return await this.toDetail(user, skill);
	}

	/** Saves the changes as the next version. Unchanged content creates nothing. */
	async update(
		user: User,
		skillId: string,
		payload: UpdateAgentSkillDto,
	): Promise<SkillSaveResponse> {
		await this.requireAccess(user, skillId, 'update');
		const saved = await this.skillService.save(skillId, { ...payload }, user.id);
		return { id: skillId, ...saved, skillHash: getAgentSkillHash(saved.skill) };
	}

	async delete(user: User, skillId: string): Promise<void> {
		await this.requireAccess(user, skillId, 'delete');
		await this.skillService.deleteSkill(skillId);
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
			skill: content,
			skillHash: getAgentSkillHash(content),
			usedBy: await this.skillRepository.findUsage(skill.id, agentProjectIds ?? 'all'),
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

	private async targetForCreate(user: User, payload: CreateSkillDto): Promise<SkillTarget> {
		switch (payload.scope) {
			case 'user':
				if (payload.projectId) throw new UserError('A "Just you" skill has no project.');
				return { userId: user.id, projectId: null };
			case 'instance':
				if (payload.projectId) throw new UserError('An instance skill has no project.');
				if (!hasGlobalScope(user, 'skill:create')) {
					throw new ForbiddenError('You are not allowed to create skills for the whole instance.');
				}
				return { userId: null, projectId: null };
			case 'project': {
				const { projectId } = payload;
				if (!projectId) throw new UserError('A project skill needs a project id.');
				if (!(await userHasScopes(user, ['projectSkill:create'], false, { projectId }))) {
					throw new ForbiddenError('You are not allowed to create skills for this project.');
				}
				// A personal project keeps its own skills, as a team project does.
				return { userId: null, projectId };
			}
		}
	}

	private async toListItems(user: User, skills: Skill[]): Promise<SkillListItem[]> {
		const ids = skills.map((skill) => skill.id);
		const [latest, usage, projects] = await Promise.all([
			this.skillRepository.findLatestSummaries(ids),
			this.skillRepository.countUsingAgents(ids),
			this.skillRepository.findProjectNames(
				skills.flatMap((skill) => (skill.projectId ? [skill.projectId] : [])),
			),
		]);
		const items: SkillListItem[] = [];
		for (const skill of skills) {
			const summary = latest.get(skill.id);
			if (!summary) continue;
			items.push({
				id: skill.id,
				name: summary.name,
				description: summary.description,
				scope: scopeOf(skill),
				projectId: skill.projectId,
				projectName: skill.projectId ? (projects.get(skill.projectId) ?? null) : null,
				userId: skill.userId,
				source: skill.source,
				latestVersion: summary.version,
				usedByAgents: usage.get(skill.id) ?? 0,
				canEdit: await this.skillService.canAccess(user, skill, 'update'),
				canDelete: await this.skillService.canAccess(user, skill, 'delete'),
				createdAt: skill.createdAt.toISOString(),
				updatedAt: skill.updatedAt.toISOString(),
			});
		}
		return items;
	}
}
