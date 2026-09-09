import type { PromotionDirection } from '@n8n/api-types';
import { promotionConnectionTargetSchema, promotionProviderTypeSchema } from '@n8n/api-types';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { PromotionConfig } from './database/entities/promotion-config.entity';
import { PromotionConfigRepository } from './database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from './database/repositories/promotion-connection-project.repository';
import { PromotionConnectionRepository } from './database/repositories/promotion-connection.repository';
import { resolveStoredConfig } from './promotion-config-settings';
import type { PromotionOperationInput } from './promotions.types';

/**
 * Turns a route into the immutable snapshot an operation runs on. Resolution
 * reads nothing but configuration: it never exports, imports, or claims ownership
 * of content.
 */
@Service()
export class PromotionConfigResolver {
	constructor(
		private readonly configRepository: PromotionConfigRepository,
		private readonly connectionRepository: PromotionConnectionRepository,
		private readonly linkRepository: PromotionConnectionProjectRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	/**
	 * Explicit routing. The direction comes from the route, so there is no expected
	 * direction to compare: the addressed config either exists or the request is a
	 * 404.
	 */
	async resolveForConnection(
		connectionId: string,
		direction: PromotionDirection,
	): Promise<PromotionOperationInput> {
		const config = await this.configRepository.findResolved(connectionId, direction);
		if (!config) {
			const connection = await this.connectionRepository.findByIdWithProvider(connectionId);
			if (!connection) throw new NotFoundError('Promotion connection not found');
			throw new NotFoundError(`This connection has no ${direction} configuration`);
		}
		return this.toOperationInput(config);
	}

	/**
	 * A project's effective config for one direction. Its own connection wins;
	 * otherwise the instance connection applies. A resolved connection that lacks the
	 * direction is a clear error, never a second fallback.
	 */
	async resolveForProject(
		projectId: string,
		direction: PromotionDirection,
	): Promise<PromotionOperationInput> {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can use a promotion connection');
		}

		const link = await this.linkRepository.findByProjectId(projectId);
		if (link) {
			const config = await this.configRepository.findResolved(link.connectionId, direction);
			if (!config) {
				throw new BadRequestError(
					`The promotion connection for this project has no ${direction} configuration`,
				);
			}
			return this.toOperationInput(config);
		}

		const instance = await this.connectionRepository.findInstanceConnection();
		if (!instance) {
			throw new NotFoundError('No promotion connection is configured for this instance');
		}
		const config = await this.configRepository.findResolved(instance.id, direction);
		if (!config) {
			throw new BadRequestError(
				`The instance promotion connection has no ${direction} configuration`,
			);
		}
		return this.toOperationInput(config);
	}

	/**
	 * Reads the joined row into plain values, so the transport never sees a live
	 * entity, and rejects a stored payload this version cannot read.
	 */
	private toOperationInput(config: PromotionConfig): PromotionOperationInput {
		const { connection } = config;
		const { provider } = connection;

		const providerType = promotionProviderTypeSchema.safeParse(provider.type);
		if (!providerType.success) {
			throw new BadRequestError('The stored provider type is not supported');
		}

		const target = promotionConnectionTargetSchema.safeParse(connection.target);
		if (!target.success) {
			throw new BadRequestError('The stored connection target cannot be read');
		}

		const resolved = resolveStoredConfig(config);
		if (!resolved) {
			throw new BadRequestError('The stored promotion configuration cannot be read');
		}

		return Object.freeze({
			connectionId: connection.id,
			connectionScope: connection.scope,
			configId: config.id,
			providerId: provider.id,
			providerType: providerType.data,
			authType: provider.authType,
			encryptedAuth: provider.auth,
			target: target.data,
			config: resolved,
		});
	}
}
