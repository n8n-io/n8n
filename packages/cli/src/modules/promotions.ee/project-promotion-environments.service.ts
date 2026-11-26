import {
	projectPromotionEnvironmentsResponseSchema,
	promotionProviderTypeSchema,
	type ProjectPromotionEnvironmentsResponse,
	type PromotionDirection,
} from '@n8n/api-types';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { PromotionEnvironmentProjectRepository } from './database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from './database/repositories/promotion-environment.repository';
import { PromotionSettingsService } from './promotion-settings.service';

/** Read-only. Writes go through PromotionEnvironmentsService. */
@Service()
export class ProjectPromotionEnvironmentsService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly settingsService: PromotionSettingsService,
		private readonly environmentRepository: PromotionEnvironmentRepository,
		private readonly linkRepository: PromotionEnvironmentProjectRepository,
	) {}

	async get(projectId: string): Promise<ProjectPromotionEnvironmentsResponse> {
		const [project] = await this.projectRepository.findTypesByIds([projectId]);
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can use a promotion environment');
		}

		// Members cannot read the opt-in elsewhere, so "off" is an answer and not an error.
		if (!(await this.settingsService.isProjectEnvironmentsEnabled())) return { enabled: false };

		const [defaults, own] = await Promise.all([
			this.environmentRepository.findInstanceEnvironmentsForDisplay(),
			this.linkRepository.findOwnEnvironmentDirections(projectId),
		]);

		// The own environment wins, as in PromotionEnvironmentResolver.resolveForProject.
		const environmentFor = (direction: PromotionDirection) => {
			if (own.includes(direction)) return { state: 'own' as const };
			const environment = defaults.find((entry) => entry.direction === direction);
			const providerType = promotionProviderTypeSchema.safeParse(environment?.providerType);
			if (!environment || !providerType.success) return { state: 'none' as const };
			return { state: 'default' as const, name: environment.name, providerType: providerType.data };
		};

		return projectPromotionEnvironmentsResponseSchema.parse({
			enabled: true,
			promote: environmentFor('promote'),
			apply: environmentFor('apply'),
		});
	}
}
