import type { PromotionDirection, PromotionProviderType } from '@n8n/api-types';
import { promotionProviderTypeSchema } from '@n8n/api-types';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError, NotFoundError } from '@n8n/errors';

import type { PromotionEnvironment } from './database/entities/promotion-environment.entity';
import { PromotionEnvironmentProjectRepository } from './database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from './database/repositories/promotion-environment.repository';
import { promotionHostBaseUrl, resolvePromotionGitRemote } from './git-hosts/git-host-remote';
import { resolveStoredConfig } from './promotion-config-settings';
import type { PromotionOperationInput, ResolvedPromotionConfig } from './promotions.types';

type DescribedEnvironment = {
	id: string;
	name: string;
	providerType: PromotionProviderType;
	config: ResolvedPromotionConfig;
};

/**
 * Turns a route into the immutable snapshot an operation runs on. Resolution
 * reads nothing but configuration: it never exports, imports, or claims ownership
 * of content.
 */
@Service()
export class PromotionEnvironmentResolver {
	constructor(
		private readonly environmentRepository: PromotionEnvironmentRepository,
		private readonly linkRepository: PromotionEnvironmentProjectRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	/**
	 * Explicit routing. An operation passes its direction, so an environment of the
	 * other direction is rejected rather than used.
	 */
	async resolveForEnvironment(
		environmentId: string,
		direction?: PromotionDirection,
	): Promise<PromotionOperationInput> {
		const environment = await this.environmentRepository.findByIdWithProvider(environmentId);
		if (!environment) throw new NotFoundError('Promotion environment not found');
		return this.toOperationInput(environment, direction);
	}

	/**
	 * A project's effective environment for one direction. Its own environment for
	 * that direction wins; otherwise the instance environment for that direction
	 * applies.
	 */
	async resolveForProject(
		projectId: string,
		direction: PromotionDirection,
	): Promise<PromotionOperationInput> {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can use a promotion environment');
		}

		const link = await this.linkRepository.findForProject(projectId, direction);
		const environment =
			link?.environment ?? (await this.environmentRepository.findInstanceEnvironment(direction));
		if (!environment) {
			throw new NotFoundError(
				`No ${direction} promotion environment is configured for this instance`,
			);
		}
		return this.toOperationInput(environment, direction);
	}

	/**
	 * The environment that serves a project for each direction, with its stored settings. A
	 * direction is left out when no environment covers the project, or when its settings cannot
	 * be read.
	 */
	async describeForProject(
		projectId: string,
	): Promise<Partial<Record<PromotionDirection, DescribedEnvironment>>> {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') return {};

		const described: Partial<Record<PromotionDirection, DescribedEnvironment>> = {};
		for (const direction of ['promote', 'apply'] as const) {
			const link = await this.linkRepository.findForProject(projectId, direction);
			const environment =
				link?.environment ?? (await this.environmentRepository.findInstanceEnvironment(direction));
			const config = environment ? resolveStoredConfig(environment) : null;
			const providerType = promotionProviderTypeSchema.safeParse(environment?.provider.type);
			if (environment && config && providerType.success) {
				described[direction] = {
					id: environment.id,
					name: environment.name,
					providerType: providerType.data,
					config,
				};
			}
		}
		return described;
	}

	/**
	 * Reads the joined row into plain values, so the transport never sees a live
	 * entity, and rejects a stored payload this version cannot read.
	 */
	private toOperationInput(
		environment: PromotionEnvironment,
		direction?: PromotionDirection,
	): PromotionOperationInput {
		if (direction && environment.direction !== direction) {
			throw new BadRequestError(
				`The promotion environment is for ${environment.direction}, not ${direction}`,
			);
		}
		const { provider } = environment;

		const providerType = promotionProviderTypeSchema.safeParse(provider.type);
		if (!providerType.success) {
			throw new BadRequestError('The stored provider type is not supported');
		}

		const remote = resolvePromotionGitRemote(provider, environment.remote);

		const resolved = resolveStoredConfig(environment);
		if (!resolved) {
			throw new BadRequestError('The stored promotion environment cannot be read');
		}

		return Object.freeze({
			environmentId: environment.id,
			scope: environment.scope,
			providerId: provider.id,
			providerType: providerType.data,
			authType: provider.authType,
			encryptedAuth: provider.auth,
			hostBaseUrl: promotionHostBaseUrl(provider),
			remote,
			config: resolved,
		});
	}
}
