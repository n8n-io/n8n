import type {
	AgentSkill,
	CreateHubSkillDto,
	HubSkillDetail,
	HubSkillListItem,
	HubSkillListResponse,
	HubSkillSaveResponse,
	HubSkillScope,
	ListHubSkillsQueryDto,
	UpdateAgentSkillDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import isEqual from 'lodash/isEqual';
import { UserError } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { Skill } from '../entities/skill.entity';
import { AgentRepository } from '../repositories/agent.repository';
import {
	SkillHubRepository,
	type ResolvedSkillRow,
	type SkillTarget,
} from '../repositories/skill-hub.repository';
import { getAgentSkillHash } from '../utils/agent-config-hash';
import { SkillHubService, toAgentSkill, toSkillContent } from './skill-hub.service';

type WriteOperation = 'create' | 'update' | 'delete';

function scopeOf(skill: Pick<Skill, 'userId' | 'projectId'>): HubSkillScope {
	if (skill.projectId) return 'project';
	if (skill.userId) return 'user';
	return 'instance';
}

/**
 * The skills hub as users see it in Settings: list, create, edit, save and delete
 * skills across the three scopes. Permission is decided per skill from its scope,
 * the same way AI preferences do it: `skill:*` for instance skills and other users'
 * skills, `projectSkill:*` for project skills. A user always owns their "Just you"
 * skills, and every user may read instance skills.
 */
@Service()
export class SkillsHubApiService {
	constructor(
		private readonly logger: Logger,
		private readonly skillHub: SkillHubService,
		private readonly skillHubRepository: SkillHubRepository,
		private readonly agentRepository: AgentRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
	) {}

	// ---------------------------------------------------------------- reads

	async list(user: User, query: ListHubSkillsQueryDto): Promise<HubSkillListResponse> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		let skills = await this.skillHubRepository.findVisibleSkills({
			userId: user.id,
			allUsers: hasGlobalScope(user, 'skill:list'),
			projectIds: projectIds ?? 'all',
		});
		if (query.scope) skills = skills.filter((skill) => scopeOf(skill) === query.scope);
		if (query.projectId) skills = skills.filter((skill) => skill.projectId === query.projectId);

		let items = await this.toListItems(user, skills);
		if (query.attachableToProjectId) {
			const target = await this.skillHub.targetForProject(query.attachableToProjectId);
			const byId = new Map(skills.map((skill) => [skill.id, skill]));
			items = items.map((item) => {
				const skill = byId.get(item.id);
				return { ...item, attachable: skill ? this.skillHub.isAttachable(skill, target) : false };
			});
		}
		const search = query.search?.toLowerCase();
		const data = search
			? items.filter(
					(item) =>
						item.name.toLowerCase().includes(search) ||
						item.description.toLowerCase().includes(search),
				)
			: items;
		return { count: data.length, data };
	}

	async get(user: User, skillId: string): Promise<HubSkillDetail> {
		const skill = await this.requireVisible(user, skillId);
		const [item] = await this.toListItems(user, [skill]);
		const draft = (await this.skillHubRepository.findDrafts([skillId])).get(skillId);
		if (!item || !draft) throw new NotFoundError('Skill not found');
		const editable = toAgentSkill(draft);
		return {
			...item,
			skill: editable,
			skillHash: getAgentSkillHash(editable),
			usedBy: await this.skillHubRepository.findUsage(skillId),
		};
	}

	// ---------------------------------------------------------------- writes

	/** Creates the skill in the requested scope with its draft and v1. */
	async create(user: User, payload: CreateHubSkillDto): Promise<HubSkillDetail> {
		const target = await this.resolveTarget(user, payload, 'create');
		let id = `skill_${generateNanoId()}`;
		while ((await this.skillHubRepository.findSkillsByIds([id])).length > 0) {
			id = `skill_${generateNanoId()}`;
		}
		await this.skillHubRepository.createSkill(
			{ id, target, source: 'ui', createdById: user.id },
			toSkillContent(payload.skill),
		);
		this.logger.debug('Created hub skill', { skillId: id, scope: payload.scope });
		return await this.get(user, id);
	}

	/** Autosave: overwrites the draft row. Agents keep reading the saved version. */
	async updateDraft(
		user: User,
		skillId: string,
		payload: UpdateAgentSkillDto,
	): Promise<{ skill: AgentSkill; skillHash: string }> {
		const skill = await this.requireVisible(user, skillId);
		await this.assertCanWrite(user, skill, 'update');
		const draft = (await this.skillHubRepository.findDrafts([skillId])).get(skillId);
		if (!draft) throw new NotFoundError('Skill not found');
		const existing = toAgentSkill(draft);
		const { baseSkillHash, ...updates } = payload;
		if (baseSkillHash !== undefined && baseSkillHash !== getAgentSkillHash(existing)) {
			throw new ConflictError('Skill was changed elsewhere; reload to get the latest version');
		}
		const updated: AgentSkill = { ...existing, ...updates };
		if ('allowedTools' in updates && !updates.allowedTools?.length) delete updated.allowedTools;
		if ('references' in updates && !updates.references?.length) delete updated.references;
		if (!updated.instructions?.trim()) throw new UserError('Skill instructions are required.');
		if (!isEqual(existing, updated)) {
			await this.skillHubRepository.inTransaction(undefined, async (trx) => {
				await this.skillHub.writeDraft(skillId, updated, trx);
			});
		}
		return { skill: updated, skillHash: getAgentSkillHash(updated) };
	}

	/**
	 * Save: the draft becomes the version following agents read. Every agent that
	 * follows the skill is marked as having unpublished changes and its runtime cache
	 * is cleared, so its next test chat runs the new version.
	 */
	async save(user: User, skillId: string): Promise<HubSkillSaveResponse> {
		const skill = await this.requireVisible(user, skillId);
		await this.assertCanWrite(user, skill, 'update');
		const { saved, dependents } = await this.skillHubRepository.inTransaction(
			undefined,
			async (trx) => {
				const saved = await this.skillHub.saveVersion(skillId, user.id, trx);
				const marked = saved.created
					? await this.skillHub.markDependentsDirty([skillId], [], trx)
					: { dependents: [], written: [] };
				return { saved, dependents: marked.dependents };
			},
		);
		if (dependents.length > 0) {
			await this.skillHub.clearRuntimes(dependents);
			const agents = await this.agentRepository.findProjectIdsByIds(dependents);
			for (const agent of agents) {
				this.agentUpdateBroadcaster.notify({
					projectId: agent.projectId,
					agentId: agent.id,
					source: 'user',
				});
			}
		}
		this.logger.debug('Saved hub skill version', { skillId, ...saved, dependents });
		return { id: skillId, ...saved };
	}

	/** Deletes a skill nobody uses. A draft ref or a pin, current or older, blocks it (409). */
	async delete(user: User, skillId: string): Promise<void> {
		const skill = await this.requireVisible(user, skillId);
		await this.assertCanWrite(user, skill, 'delete');
		await this.skillHub.deleteSkill(skillId);
	}

	// ---------------------------------------------------------------- permissions

	/** A hidden skill answers like a missing one. */
	private async requireVisible(user: User, skillId: string): Promise<Skill> {
		const [skill] = await this.skillHubRepository.findSkillsByIds([skillId]);
		if (!skill || !(await this.canSee(user, skill))) throw new NotFoundError('Skill not found');
		return skill;
	}

	private async canSee(user: User, skill: Skill): Promise<boolean> {
		switch (scopeOf(skill)) {
			case 'project':
				return await userHasScopes(user, ['projectSkill:read'], false, {
					projectId: skill.projectId!,
				});
			case 'user':
				return skill.userId === user.id || hasGlobalScope(user, 'skill:read');
			case 'instance':
				return true;
		}
	}

	private async canWrite(user: User, skill: Skill, operation: WriteOperation): Promise<boolean> {
		switch (scopeOf(skill)) {
			case 'project':
				return await userHasScopes(user, [`projectSkill:${operation}`], false, {
					projectId: skill.projectId!,
				});
			case 'user':
				return skill.userId === user.id || hasGlobalScope(user, `skill:${operation}`);
			case 'instance':
				return hasGlobalScope(user, `skill:${operation}`);
		}
	}

	private async assertCanWrite(user: User, skill: Skill, operation: WriteOperation) {
		if (!(await this.canWrite(user, skill, operation))) {
			throw new ForbiddenError(
				operation === 'delete'
					? 'You are not allowed to delete this skill'
					: 'You can use but not edit this skill',
			);
		}
	}

	private async resolveTarget(
		user: User,
		payload: CreateHubSkillDto,
		operation: WriteOperation,
	): Promise<SkillTarget> {
		switch (payload.scope) {
			case 'user':
				if (payload.projectId) throw new UserError('A "Just you" skill has no project.');
				return { userId: user.id, projectId: null };
			case 'instance':
				if (payload.projectId) throw new UserError('An instance skill has no project.');
				if (!hasGlobalScope(user, `skill:${operation}`)) {
					throw new ForbiddenError('You are not allowed to create skills for the whole instance');
				}
				return { userId: null, projectId: null };
			case 'project': {
				if (!payload.projectId) throw new UserError('A project skill needs a project id.');
				const allowed = await userHasScopes(user, [`projectSkill:${operation}`], false, {
					projectId: payload.projectId,
				});
				if (!allowed) {
					throw new ForbiddenError('You are not allowed to create skills for this project');
				}
				// A personal project's skills are the owner's "Just you" skills.
				return await this.skillHub.targetForProject(payload.projectId);
			}
		}
	}

	// ---------------------------------------------------------------- shaping

	private async toListItems(user: User, skills: Skill[]): Promise<HubSkillListItem[]> {
		const ids = skills.map((skill) => skill.id);
		const [latest, drafts, usage, projects] = await Promise.all([
			this.skillHubRepository.findLatestSavedVersions(ids),
			this.skillHubRepository.findDrafts(ids),
			this.skillHubRepository.countUsingAgents(ids),
			this.skillHubRepository.findProjectNames(
				skills.flatMap((skill) => (skill.projectId ? [skill.projectId] : [])),
			),
		]);
		const items: HubSkillListItem[] = [];
		for (const skill of skills) {
			const row: ResolvedSkillRow | undefined = latest.get(skill.id) ?? drafts.get(skill.id);
			if (!row) continue;
			const draft = drafts.get(skill.id);
			items.push({
				id: skill.id,
				name: row.version.name,
				description: row.version.description,
				scope: scopeOf(skill),
				projectId: skill.projectId,
				projectName: skill.projectId ? (projects.get(skill.projectId) ?? null) : null,
				userId: skill.userId,
				source: skill.source,
				latestVersion: latest.get(skill.id)?.version.version ?? 0,
				hasUnsavedChanges:
					draft !== undefined &&
					latest.get(skill.id) !== undefined &&
					draft.version.contentHash !== latest.get(skill.id)?.version.contentHash,
				usedByAgents: usage.get(skill.id) ?? 0,
				canEdit: await this.canWrite(user, skill, 'update'),
				canDelete: await this.canWrite(user, skill, 'delete'),
				createdAt: skill.createdAt.toISOString(),
				updatedAt: skill.updatedAt.toISOString(),
			});
		}
		return items;
	}
}
