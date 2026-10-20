import type {
	CreateSkillDto,
	ListSkillsQueryDto,
	SkillDetail,
	SkillListItem,
	SkillListResponse,
	SkillSaveResponse,
	SaveSkillDto,
	SkillScope,
	SkillUserDto,
	SkillNewNameQueryDto,
	SkillNewNameResponse,
	SkillVersionDetail,
	SkillVersionListResponse,
	SkillVersionSummary,
	UpdateSkillVersionDto,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import { TransactionRunner, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { Skill } from '../entities/skill.entity';
import {
	SkillRepository,
	type SkillTarget,
	type SkillVersionRow,
} from '../repositories/skill.repository';
import { getAgentSkillHash } from '../utils/agent-config-hash';
import { SkillGitSyncService } from './github/skill-git-sync.service';
import { SkillService, toAgentSkill } from './skill.service';
import { SkillsTelemetry, type SkillTelemetryMethod } from './skills-telemetry';

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
		private readonly skillGitSync: SkillGitSyncService,
	) {}

	async list(user: User, query: ListSkillsQueryDto): Promise<SkillListResponse> {
		if (query.attachableTo !== undefined && (query.scope || query.projectId)) {
			throw new UserError('Filter by attachableTo alone, without scope or projectId.');
		}
		const projectIds = await this.projectScopeService.getProjectIds(user, ['projectSkill:list']);
		const attachableTo = await this.attachTarget(query.attachableTo);
		const { skills, count } = await this.skillRepository.findVisiblePage(
			{ projectIds: projectIds ?? 'all' },
			{
				scope: query.scope,
				projectId: query.projectId,
				attachableTo,
				search: query.search,
				skip: query.skip,
				take: query.take,
			},
		);
		return { count, data: await this.toListItems(user, skills) };
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
		method: SkillTelemetryMethod = payload.method ?? 'manual',
	): Promise<SkillDetail> {
		const target = await this.targetForCreate(user, payload);
		const id = await this.skillService.create({
			checkNameTaken: true,
			target,
			skill: payload.skill,
			source: 'ui',
			createdById: user.id,
		});
		await this.skillsTelemetry.created(user.id, [{ id, ...target }], 'ui', method);
		// No second access check: a custom role can create skills it cannot read later.
		const [skill] = await this.skillRepository.findByIds([id]);
		if (!skill) throw new NotFoundError('Skill not found');
		return await this.toDetail(user, skill);
	}

	/** Saves the changes as the next version. Unchanged content creates nothing. */
	async update(user: User, skillId: string, payload: SaveSkillDto): Promise<SkillSaveResponse> {
		const skill = await this.requireAccess(user, skillId, 'update');
		const { scope, projectId, ...update } = payload;
		const target = scope ? await this.targetForCreate(user, { scope, projectId }) : undefined;
		const moves =
			target !== undefined &&
			(target.projectId !== skill.projectId || target.agentId !== skill.agentId);

		const checkedSource = moves ? await this.skillService.assertCanMove(user, skillId) : undefined;

		if (!moves) {
			const { followingAgentIds: _following, ...saved } = await this.skillService.save(
				skillId,
				update,
				user.id,
			);
			if (saved.created) {
				// No move, so the skill stays where `requireAccess` read it.
				await this.skillsTelemetry.updated(user.id, skill, 'ui', saved.version, false);
			}
			return { id: skillId, ...saved, skillHash: getAgentSkillHash(saved.skill) };
		}

		// One transaction, so a refused save does not leave the skill moved. The move runs
		// first and checks the final name in the new scope only: a name that only the old
		// scope holds does not block it. The save then checks a rename in the new scope too.
		const { followingAgentIds, ...saved } = await this.txRunner.run({}, async (ctx) => {
			await this.skillService.changeTarget(skillId, target, undefined, ctx, {
				nameAfterMove: update.name,
				checkedSource,
			});
			return await this.skillService.save(skillId, update, user.id, ctx);
		});
		// `save` leaves the refresh to the caller when it joins a transaction.
		await this.skillService.refreshFollowingAgents(followingAgentIds);
		if (saved.created) {
			await this.skillsTelemetry.updated(
				user.id,
				{ id: skillId, ...target },
				'ui',
				saved.version,
				true,
			);
		}
		return { id: skillId, ...saved, skillHash: getAgentSkillHash(saved.skill) };
	}

	/** Every saved version of the skill, newest first. Needs read access. */
	async listVersions(user: User, skillId: string): Promise<SkillVersionListResponse> {
		await this.requireAccess(user, skillId, 'read');
		const versions = await this.skillRepository.findVersionList(skillId);
		const users = await this.findUsers(versions.map((version) => version.createdById));
		return { data: versions.map((version) => toVersionSummary(version, users)) };
	}

	/** One saved version with its content. Needs read access. */
	async getVersion(user: User, skillId: string, version: number): Promise<SkillVersionDetail> {
		await this.requireAccess(user, skillId, 'read');
		const row = await this.skillRepository.findVersionByNumber(skillId, version);
		if (!row) throw new NotFoundError('Skill version not found');
		const users = await this.findUsers([row.version.createdById]);
		return { ...toVersionSummary(row.version, users), skill: toAgentSkill(row) };
	}

	/**
	 * Names or renames one saved version. Needs the same permission as Save. The content
	 * does not change, so agents and their published versions are not affected.
	 */
	async updateVersion(
		user: User,
		skillId: string,
		version: number,
		payload: UpdateSkillVersionDto,
	): Promise<SkillVersionSummary> {
		await this.requireAccess(user, skillId, 'update');
		const updated = await this.skillRepository.updateVersionLabel(skillId, version, payload.label);
		if (!updated) throw new NotFoundError('Skill version not found');
		const users = await this.findUsers([updated.createdById]);
		return toVersionSummary(updated, users);
	}

	async delete(user: User, skillId: string): Promise<void> {
		const skill = await this.requireAccess(user, skillId, 'delete');
		// The conflict message names only the agents the user may read, as the detail does.
		const agentProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		await this.skillService.deleteSkill(skillId, agentProjectIds ?? 'all');
		await this.skillsTelemetry.deleted(user.id, skill);
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
			latestVersionLabel: latest.version.label,
			skill: content,
			skillHash: getAgentSkillHash(content),
			usedBy: await this.skillRepository.findUsage(skill.id, agentProjectIds ?? 'all'),
		};
	}

	/** A skill the user cannot see answers like a missing one. */
	async requireAccess(
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

	/** The agent of an `attachableTo` filter with its project. An unknown agent can attach nothing. */
	private async attachTarget(
		agentId: string | undefined,
	): Promise<{ agentId: string; projectId: string } | undefined> {
		if (agentId === undefined) return undefined;
		const agent = (await this.skillRepository.findAgents([agentId])).get(agentId);
		if (!agent) throw new NotFoundError('Agent not found');
		return { agentId, projectId: agent.projectId };
	}

	/** Where a create or a move puts the skill. The user needs the create permission there. */
	async targetForCreate(
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
				const agent = (await this.skillRepository.findAgents([agentId])).get(agentId);
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
		const agents = await this.skillRepository.findAgents(
			skills.flatMap((skill) => (skill.agentId ? [skill.agentId] : [])),
		);
		const projectOf = (skill: Skill) =>
			skill.projectId ?? (skill.agentId ? (agents.get(skill.agentId)?.projectId ?? null) : null);
		const [latest, usage, projects, canEdit, canDelete, gitSources] = await Promise.all([
			this.skillRepository.findLatestSummaries(ids),
			this.skillRepository.countUsingAgents(ids),
			this.skillRepository.findProjects(skills.flatMap((skill) => projectOf(skill) ?? [])),
			this.skillService.accessCheck(user, 'update'),
			this.skillService.accessCheck(user, 'delete'),
			this.skillGitSync.sourceInfo(ids),
		]);
		// Creators and the users who saved the latest versions, in one query.
		const users = await this.findUsers([
			...skills.map((skill) => skill.createdById),
			...[...latest.values()].map((summary) => summary.createdById),
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
				createdBy: skill.createdById ? (users.get(skill.createdById) ?? null) : null,
				latestVersion: summary.version,
				latestVersionLabel: summary.label,
				latestVersionSavedBy: summary.createdById ? (users.get(summary.createdById) ?? null) : null,
				usedByAgents: usage.get(skill.id) ?? 0,
				canEdit: canEdit(skill, projectId),
				canDelete: canDelete(skill, projectId),
				gitSource: gitSources.get(skill.id) ?? null,
				createdAt: skill.createdAt.toISOString(),
				updatedAt: skill.updatedAt.toISOString(),
			});
		}
		return items;
	}

	/** The users with these ids, in one query. Null ids and unknown users are skipped. */
	private async findUsers(userIds: Array<string | null>): Promise<Map<string, SkillUserDto>> {
		const ids = [...new Set(userIds.flatMap((id) => id ?? []))];
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

function toVersionSummary(
	version: SkillVersionRow,
	users: Map<string, SkillUserDto>,
): SkillVersionSummary {
	return {
		id: version.id,
		version: version.version,
		label: version.label,
		createdBy: version.createdById ? (users.get(version.createdById) ?? null) : null,
		createdAt: version.createdAt.toISOString(),
		sourceCommitSha: version.sourceCommitSha ?? null,
	};
}
