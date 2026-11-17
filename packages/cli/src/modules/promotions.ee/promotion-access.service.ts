import type { PromotionDirection } from '@n8n/api-types';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import { hasGlobalScope, type Scope } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

import { PromotionEnvironmentProjectRepository } from './database/repositories/promotion-environment-project.repository';
import type { PromotionOperationInput } from './promotions.types';

const GLOBAL_OPERATION_SCOPES = {
	promote: 'promotions:promote',
	apply: 'promotions:apply',
} as const satisfies Record<PromotionDirection, Scope>;

/** Stands in for a project-level promotion right until one exists: a project admin. */
const PROJECT_OPERATION_SCOPE = 'project:update' satisfies Scope;
const PROJECT_READ_SCOPE = 'project:read' satisfies Scope;

/**
 * The only place that answers "can this user promote, apply or read project X".
 *
 * - A user with the global scope of the direction can operate every team project.
 * - Any other user can operate a team project when the user is an admin of it.
 * - A user can read a project when the user holds `project:read` in it.
 *
 * Personal projects are never operable: promotion works on team projects only.
 */
@Service()
export class PromotionAccessService {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectRepository: ProjectRepository,
		private readonly linkRepository: PromotionEnvironmentProjectRepository,
	) {}

	/** True when the user holds the global scope of the direction, so every team project is operable. */
	hasGlobalRight(user: User, direction: PromotionDirection): boolean {
		return hasGlobalScope(user, GLOBAL_OPERATION_SCOPES[direction]);
	}

	async canOperate(user: User, projectId: string, direction: PromotionDirection): Promise<boolean> {
		return (await this.operableProjectIds(user, direction, [projectId])).has(projectId);
	}

	async canRead(user: User, projectId: string): Promise<boolean> {
		return (await this.readableProjectIds(user, [projectId])).has(projectId);
	}

	/**
	 * The team projects that the user can promote or apply. With `projectIds`, only those are
	 * checked. Without it, the result holds every operable team project.
	 */
	async operableProjectIds(
		user: User,
		direction: PromotionDirection,
		projectIds?: readonly string[],
	): Promise<Set<string>> {
		if (projectIds?.length === 0) return new Set();
		const teamIds = await this.teamProjectIds(projectIds);
		if (teamIds.length === 0 || this.hasGlobalRight(user, direction)) return new Set(teamIds);
		return new Set(
			await this.projectService.getProjectIdsWithScope(user, [PROJECT_OPERATION_SCOPE], teamIds),
		);
	}

	/** The projects that the user can read. With `projectIds`, only those are checked. */
	async readableProjectIds(user: User, projectIds?: readonly string[]): Promise<Set<string>> {
		if (projectIds?.length === 0) return new Set();
		return new Set(
			await this.projectService.getProjectIdsWithScope(
				user,
				[PROJECT_READ_SCOPE],
				projectIds ? [...projectIds] : undefined,
			),
		);
	}

	/**
	 * Throws when the user cannot operate one of the projects. The message names no project,
	 * because the user may not be able to read the one that fails.
	 */
	async assertCanOperate(
		user: User,
		projectIds: readonly string[],
		direction: PromotionDirection,
	): Promise<void> {
		const unique = [...new Set(projectIds)];
		const operable = await this.operableProjectIds(user, direction, unique);
		if (unique.every((id) => operable.has(id))) return;
		throw new ForbiddenError(
			unique.length === 1
				? `You do not have the right to ${direction} this project. Ask a project admin or an instance admin.`
				: `You do not have the right to ${direction} every project of this operation. Ask a project admin or an instance admin.`,
		);
	}

	/** Throws when the user cannot read the project. Reads like a missing project. */
	async assertCanRead(user: User, projectId: string): Promise<void> {
		if (await this.canRead(user, projectId)) return;
		throw new ForbiddenError('You do not have access to this project');
	}

	/**
	 * Whether the environment covers the project. An instance environment covers every team
	 * project. A project environment covers the projects that are linked to it.
	 */
	async environmentCovers(input: PromotionOperationInput, projectId: string): Promise<boolean> {
		return (await this.coveredProjectIds(input, [projectId])).has(projectId);
	}

	/** The team projects among `projectIds` that the environment covers. */
	async coveredProjectIds(
		input: PromotionOperationInput,
		projectIds: readonly string[],
	): Promise<Set<string>> {
		if (projectIds.length === 0) return new Set();
		const teamIds = await this.teamProjectIds(projectIds);
		if (input.scope === 'instance') return new Set(teamIds);
		const linked = new Set(
			await this.linkRepository.findProjectIdsByEnvironment(input.environmentId),
		);
		return new Set(teamIds.filter((id) => linked.has(id)));
	}

	/** Every team project that the environment covers. */
	async listCoveredProjectIds(input: PromotionOperationInput): Promise<string[]> {
		if (input.scope === 'instance') return await this.teamProjectIds();
		const linked = await this.linkRepository.findProjectIdsByEnvironment(input.environmentId);
		return linked.length > 0 ? await this.teamProjectIds(linked) : [];
	}

	private async teamProjectIds(projectIds?: readonly string[]): Promise<string[]> {
		if (!projectIds) return await this.projectRepository.findTeamProjectIds();
		const rows = await this.projectRepository.findTypesByIds([...new Set(projectIds)]);
		return rows.filter(({ type }) => type === 'team').map(({ id }) => id);
	}
}
