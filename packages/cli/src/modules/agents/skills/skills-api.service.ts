import type {
	AgentSkill,
	CreateSkillDto,
	ListSkillsQueryDto,
	SkillDetail,
	SkillDraftResponse,
	SkillListItem,
	SkillListResponse,
	SkillSaveResponse,
	SkillScope,
	UpdateAgentSkillDto,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import isEqual from 'lodash/isEqual';

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
 * Skills as the settings page sees them: list, read, create, edit, save and delete. The
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
		const skill = await this.requireAccess(user, skillId, 'read');
		const [item] = await this.toListItems(user, [skill]);
		const draft = (await this.skillRepository.findDrafts([skillId])).get(skillId);
		if (!item || !draft) throw new NotFoundError('Skill not found');
		const editable = toAgentSkill(draft);
		return {
			...item,
			skill: editable,
			skillHash: getAgentSkillHash(editable),
			usedBy: await this.skillRepository.findUsage(skillId),
		};
	}

	async create(user: User, payload: CreateSkillDto): Promise<SkillDetail> {
		const target = await this.targetForCreate(user, payload);
		const id = await this.skillService.create({
			target,
			skill: payload.skill,
			source: 'ui',
			createdById: user.id,
		});
		return await this.get(user, id);
	}

	/** Autosave: overwrites the draft row. Agents keep running the saved version. */
	async updateDraft(
		user: User,
		skillId: string,
		payload: UpdateAgentSkillDto,
	): Promise<SkillDraftResponse> {
		await this.requireAccess(user, skillId, 'update');
		const draft = (await this.skillRepository.findDrafts([skillId])).get(skillId);
		if (!draft) throw new NotFoundError('Skill not found');
		const existing = toAgentSkill(draft);
		const { baseSkillHash, ...updates } = payload;
		if (baseSkillHash !== undefined && baseSkillHash !== getAgentSkillHash(existing)) {
			throw new ConflictError(
				'The skill was changed somewhere else. Reload to get the latest version.',
			);
		}
		const updated: AgentSkill = { ...existing, ...updates };
		if (!updated.allowedTools?.length) delete updated.allowedTools;
		if (!updated.references?.length) delete updated.references;
		if (!updated.instructions.trim()) throw new UserError('Skill instructions are required.');
		if (!isEqual(existing, updated)) await this.skillService.writeDraft(skillId, updated);
		return { skill: updated, skillHash: getAgentSkillHash(updated) };
	}

	async save(user: User, skillId: string): Promise<SkillSaveResponse> {
		await this.requireAccess(user, skillId, 'update');
		return { id: skillId, ...(await this.skillService.save(skillId, user.id)) };
	}

	async delete(user: User, skillId: string): Promise<void> {
		await this.requireAccess(user, skillId, 'delete');
		await this.skillService.deleteSkill(skillId);
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
		const [latest, drafts, usage, projects] = await Promise.all([
			this.skillRepository.findLatestSaved(ids),
			this.skillRepository.findDrafts(ids),
			this.skillRepository.countUsingAgents(ids),
			this.skillRepository.findProjectNames(
				skills.flatMap((skill) => (skill.projectId ? [skill.projectId] : [])),
			),
		]);
		const items: SkillListItem[] = [];
		for (const skill of skills) {
			const saved = latest.get(skill.id);
			const draft = drafts.get(skill.id);
			const shown = saved ?? draft;
			if (!shown) continue;
			items.push({
				id: skill.id,
				name: shown.version.name,
				description: shown.version.description,
				scope: scopeOf(skill),
				projectId: skill.projectId,
				projectName: skill.projectId ? (projects.get(skill.projectId) ?? null) : null,
				userId: skill.userId,
				source: skill.source,
				latestVersion: saved?.version.version ?? 0,
				hasUnsavedChanges:
					saved !== undefined &&
					draft !== undefined &&
					draft.version.contentHash !== saved.version.contentHash,
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
