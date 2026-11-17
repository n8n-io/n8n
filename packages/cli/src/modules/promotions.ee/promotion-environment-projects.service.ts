import type { PromotionDirection, PromotionEnvironmentChangesProject } from '@n8n/api-types';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { ProjectService } from '@/services/project.service.ee';

import { compare } from './package-references';
import { PromotionAccessService } from './promotion-access.service';
import type { PromotionOperationInput } from './promotions.types';

/** The projects of an environment as one user sees them. */
export type EnvironmentProjects = {
	/** The projects of the changes view: covered by the environment and readable by the user. */
	projects: PromotionEnvironmentChangesProject[];
	/** The projects whose content the user can export, so that the view can compare them. */
	exportableProjectIds: Set<string>;
	/** The listed projects that exist on this instance. A branch project can be new here. */
	existingProjectIds: Set<string>;
};

/**
 * Answers which projects an operation on an environment can show and touch.
 * - An instance environment covers every team project. A projects environment covers its
 *   linked projects only.
 * - The user sees the covered projects that the user can read.
 * - `PromotionAccessService` decides the right to operate in each project.
 */
@Service()
export class PromotionEnvironmentProjectsService {
	constructor(
		private readonly accessService: PromotionAccessService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
	) {}

	/**
	 * The projects of the changes view. For Apply, `branchProjects` are the projects of the
	 * package: one that this instance lacks is listed only for a user with the global right on
	 * an instance environment, because the Apply creates it.
	 */
	async forView(
		user: User,
		input: PromotionOperationInput,
		direction: PromotionDirection,
		branchProjects: ReadonlyArray<{ id: string; name: string }> = [],
	): Promise<EnvironmentProjects> {
		const coveredIds = await this.accessService.listCoveredProjectIds(input);
		const [readable, operable, exportable, info] = await Promise.all([
			this.accessService.readableProjectIds(user, coveredIds),
			this.accessService.operableProjectIds(user, direction, coveredIds),
			coveredIds.length > 0
				? this.projectService.getProjectIdsWithScope(user, ['project:export'], coveredIds)
				: [],
			this.projectRepository.findTeamProjectInfoByIds(coveredIds),
		]);
		const projects: PromotionEnvironmentChangesProject[] = info
			.filter(({ id }) => readable.has(id) || operable.has(id))
			.map(({ id, name }) => ({ id, name, canOperate: operable.has(id) }));
		const existingProjectIds = new Set(projects.map(({ id }) => id));

		if (
			direction === 'apply' &&
			input.scope === 'instance' &&
			this.accessService.hasGlobalRight(user, direction)
		) {
			const known = new Set(
				(await this.projectRepository.findTypesByIds(branchProjects.map(({ id }) => id))).map(
					({ id }) => id,
				),
			);
			for (const { id, name } of branchProjects) {
				if (!known.has(id)) projects.push({ id, name, canOperate: true });
			}
		}

		projects.sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id));
		return { projects, exportableProjectIds: new Set(exportable), existingProjectIds };
	}

	/**
	 * Checks the projects of an operation across projects, and throws on the first failure:
	 * - each project is in the scope of the environment;
	 * - the user has the right of the direction in each project.
	 * A project of an Apply that this instance lacks needs the global right on an instance
	 * environment. Returns the ids of those projects.
	 */
	async assertCanOperate(
		user: User,
		input: PromotionOperationInput,
		direction: PromotionDirection,
		projectIds: readonly string[],
	): Promise<{ newProjectIds: Set<string> }> {
		const existing = new Set(
			(await this.projectRepository.findTypesByIds([...projectIds])).map(({ id }) => id),
		);
		const newProjectIds = new Set(projectIds.filter((id) => !existing.has(id)));
		const creates =
			direction === 'apply' &&
			input.scope === 'instance' &&
			this.accessService.hasGlobalRight(user, direction);
		const existingIds = projectIds.filter((id) => existing.has(id));
		const covered = await this.accessService.coveredProjectIds(input, existingIds);
		// The message names no project, because the user may not be able to read the one that fails.
		if ((newProjectIds.size > 0 && !creates) || existingIds.some((id) => !covered.has(id))) {
			throw new BadRequestError(
				'This environment does not cover every project of the selection. Reload and try again.',
			);
		}
		await this.accessService.assertCanOperate(user, existingIds, direction);
		return { newProjectIds };
	}
}
