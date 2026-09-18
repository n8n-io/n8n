import type {
	CreatePromotionConnectionDto,
	PromotionApplyConfigPublicDto,
	PromotionConnectionConfigsPublic,
	PromotionConnectionProjectListPublicDto,
	PromotionConnectionProjectPublicDto,
	PromotionConnectionPublicDto,
	PromotionConnectionScope,
	PromotionConnectionTarget,
	PromotionDirection,
	PromotionPromoteConfigPublicDto,
	UpdatePromotionConnectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { DIRECTION_LABELS } from './constants';
import type { PromotionConfig } from './database/entities/promotion-config.entity';
import type { PromotionConnection } from './database/entities/promotion-connection.entity';
import { PromotionConfigRepository } from './database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from './database/repositories/promotion-connection-project.repository';
import {
	PromotionConnectionRepository,
	type PromotionConnectionFilter,
} from './database/repositories/promotion-connection.repository';
import { resolveStoredConfig } from './promotion-config-settings';
import { mapPromotionConflicts } from './promotion-conflicts';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import { checkoutBranchName } from './promotions-git.utils';
import type { ResolvedPromotionConfig } from './promotions.types';

/**
 * One config write: the direction with its settings, plus an optional name. The
 * per-direction aliases let a caller keep the response type of its own direction.
 */
export type PromotionConfigWrite = { config: ResolvedPromotionConfig; name?: string };
export type PromotionApplyConfigWrite = PromotionConfigWrite & {
	config: { direction: 'apply' };
};
export type PromotionPromoteConfigWrite = PromotionConfigWrite & {
	config: { direction: 'promote' };
};

type ManageProjectLinkOptions = {
	user: User;
	connectionId: string;
	projectId: string;
};

/**
 * Owns connections, their per-direction configs, and their project links.
 * Provider credentials belong to {@link PromotionProvidersService}, so nothing
 * here accepts or returns them.
 */
@Service()
export class PromotionConnectionsService {
	constructor(
		private readonly connectionRepository: PromotionConnectionRepository,
		private readonly configRepository: PromotionConfigRepository,
		private readonly linkRepository: PromotionConnectionProjectRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly providersService: PromotionProvidersService,
		private readonly gitService: PromotionsGitService,
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/**
	 * Validates the whole proposed state first, then writes the connection and its
	 * initial configs in one transaction. Starting with no configs is allowed, so an
	 * admin can read the provider's public key before the remote accepts a clone.
	 */
	async create(input: CreatePromotionConnectionDto): Promise<PromotionConnectionPublicDto> {
		const provider = await this.providersService.getEntity(input.providerId);
		this.gitService.validateRemoteUrl(input.target.remoteUrl, provider.authType);

		const writes = requestedConfigWrites(input.configs);
		// Branch validation runs Git, so it happens before the transaction opens.
		for (const { config } of writes) {
			await this.gitService.validateBranchName(checkoutBranchName(config));
		}

		const created = await mapPromotionConflicts(
			async () =>
				await this.txRunner.run({}, async (ctx) => {
					const connection = await this.connectionRepository.insertConnection(
						{
							name: input.name,
							scope: input.scope,
							providerId: input.providerId,
							target: input.target,
						},
						ctx,
					);
					const configs: PromotionConfig[] = [];
					for (const write of writes) {
						configs.push(await this.insertConfig(connection.id, write, ctx));
					}
					return { connection, configs };
				}),
		);

		return this.toPublic({ ...created.connection, provider }, created.configs);
	}

	async findOne(id: string): Promise<PromotionConnectionPublicDto> {
		const connection = await this.getEntity(id);
		const configs = await this.configRepository.findByConnectionIds([id]);
		return this.toPublic(connection, configs);
	}

	async list(offset: number, limit: number, filter: PromotionConnectionFilter) {
		const { data, count } = await this.connectionRepository.listConnections({
			offset,
			limit,
			filter,
		});
		const configs = await this.configRepository.findByConnectionIds(data.map(({ id }) => id));
		return {
			count,
			data: data.map((connection) =>
				this.toPublic(
					connection,
					configs.filter((config) => config.connectionId === connection.id),
				),
			),
		};
	}

	/**
	 * Accepts connection fields only. Configs, project links, and package operations
	 * each have their own route. Scope cannot change.
	 */
	async update(
		id: string,
		input: UpdatePromotionConnectionDto,
	): Promise<PromotionConnectionPublicDto> {
		if (Object.keys(input).length === 0) {
			throw new BadRequestError('At least one field is required');
		}
		const current = await this.getEntity(id);

		// A new provider may accept different remote URL forms, so recheck the target
		// on every reassignment, even when the target itself did not change.
		const provider = input.providerId
			? await this.providersService.getEntity(input.providerId)
			: current.provider;
		const target: PromotionConnectionTarget = input.target ?? current.target;
		this.gitService.validateRemoteUrl(target.remoteUrl, provider.authType);

		await this.connectionRepository.updateConnection(id, {
			...(input.name !== undefined && { name: input.name }),
			...(input.target !== undefined && { target: input.target }),
			...(input.providerId !== undefined && { providerId: input.providerId }),
		});
		return await this.findOne(id);
	}

	/**
	 * Cascades to this connection's configs and project links. The provider stays,
	 * because other connections may use it.
	 */
	async delete(id: string): Promise<void> {
		await this.getEntity(id);
		const configs = await this.configRepository.findByConnectionIds([id]);
		await this.connectionRepository.deleteConnection(id);
		for (const config of configs) await this.purgeCache(config.id);
	}

	/**
	 * Creates or replaces one direction, and answers 200 either way. The whole
	 * settings object is replaced, so an omitted name falls back to the direction
	 * label.
	 */
	async upsertConfig(
		connectionId: string,
		write: PromotionApplyConfigWrite,
	): Promise<PromotionApplyConfigPublicDto>;
	async upsertConfig(
		connectionId: string,
		write: PromotionPromoteConfigWrite,
	): Promise<PromotionPromoteConfigPublicDto>;
	async upsertConfig(
		connectionId: string,
		write: PromotionConfigWrite,
	): Promise<PromotionApplyConfigPublicDto | PromotionPromoteConfigPublicDto> {
		await this.getEntity(connectionId);
		await this.gitService.validateBranchName(checkoutBranchName(write.config));

		const { direction } = write.config;
		const existing = await this.configRepository.findByConnectionAndDirection(
			connectionId,
			direction,
		);
		const stored = existing
			? await this.replaceConfig(existing.id, write)
			: await mapPromotionConflicts(async () => await this.insertConfig(connectionId, write));

		return this.toConfigPublic(stored);
	}

	/** Removing a direction also drops its local checkout. */
	async deleteConfig(connectionId: string, direction: PromotionDirection): Promise<void> {
		await this.getEntity(connectionId);
		const config = await this.configRepository.findByConnectionAndDirection(
			connectionId,
			direction,
		);
		if (!config) throw new NotFoundError('Promotion configuration not found');
		await this.configRepository.deleteConfig(config.id);
		await this.purgeCache(config.id);
	}

	async listProjects(id: string): Promise<PromotionConnectionProjectListPublicDto> {
		await this.getEntity(id);
		return { projectIds: await this.linkRepository.findProjectIdsByConnection(id) };
	}

	async addProject({
		user,
		connectionId,
		projectId,
	}: ManageProjectLinkOptions): Promise<PromotionConnectionProjectPublicDto> {
		const connection = await this.getEntity(connectionId);
		this.assertLinkableScope(connection.scope);
		await this.assertProjectAccess(user, projectId);
		await this.assertProjectIsTeam(projectId);

		const link = await mapPromotionConflicts(
			async () => await this.linkRepository.linkProject(projectId, connectionId),
		);
		return { projectId: link.projectId, connectionId: link.connectionId };
	}

	async removeProject({ user, connectionId, projectId }: ManageProjectLinkOptions): Promise<void> {
		await this.getEntity(connectionId);
		await this.assertProjectAccess(user, projectId);

		const existing = await this.linkRepository.findByProjectId(projectId);
		if (!existing) return;
		if (existing.connectionId !== connectionId) throw this.linkedElsewhere();

		const removed = await this.linkRepository.unlinkProject(projectId, connectionId);
		if (removed > 0) return;

		// The link changed between our read and the delete. A different owner is a
		// conflict; a link that is simply gone stays a no-op.
		const current = await this.linkRepository.findByProjectId(projectId);
		if (current && current.connectionId !== connectionId) throw this.linkedElsewhere();
	}

	async getEntity(id: string): Promise<PromotionConnection> {
		const connection = await this.connectionRepository.findByIdWithProvider(id);
		if (!connection) throw new NotFoundError('Promotion connection not found');
		return connection;
	}

	toPublic(
		connection: PromotionConnection,
		configs: PromotionConfig[],
	): PromotionConnectionPublicDto {
		return {
			id: connection.id,
			name: connection.name,
			scope: connection.scope,
			target: connection.target,
			provider: this.providersService.toSummary(connection.provider),
			configs: this.toConfigsPublic(configs),
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),
		};
	}

	private toConfigsPublic(configs: PromotionConfig[]): PromotionConnectionConfigsPublic {
		const byDirection: PromotionConnectionConfigsPublic = {};
		for (const config of configs) {
			const resolved = resolveStoredConfig(config);
			if (!resolved) continue;
			if (resolved.direction === 'apply') {
				byDirection.apply = { ...this.configFields(config), settings: resolved.settings };
			} else {
				byDirection.promote = { ...this.configFields(config), settings: resolved.settings };
			}
		}
		return byDirection;
	}

	private toConfigPublic(
		config: PromotionConfig,
	): PromotionApplyConfigPublicDto | PromotionPromoteConfigPublicDto {
		const resolved = resolveStoredConfig(config);
		if (!resolved) {
			throw new BadRequestError('The stored promotion configuration cannot be read');
		}
		// Keep separate branches so TypeScript narrows the settings union by direction.
		return resolved.direction === 'apply'
			? { ...this.configFields(config), settings: resolved.settings }
			: { ...this.configFields(config), settings: resolved.settings };
	}

	private configFields(config: PromotionConfig) {
		return {
			id: config.id,
			name: config.name,
			createdAt: config.createdAt.toISOString(),
			updatedAt: config.updatedAt.toISOString(),
		};
	}

	private async insertConfig(
		connectionId: string,
		{ config, name }: PromotionConfigWrite,
		ctx: OperationContext = {},
	) {
		return await this.configRepository.insertConfig(
			{
				connectionId,
				direction: config.direction,
				name: name ?? DIRECTION_LABELS[config.direction],
				settings: config.settings,
			},
			ctx,
		);
	}

	private async replaceConfig(id: string, { config, name }: PromotionConfigWrite) {
		await this.configRepository.replaceConfig(id, {
			name: name ?? DIRECTION_LABELS[config.direction],
			settings: config.settings,
		});
		const stored = await this.configRepository.findById(id);
		if (!stored) throw new NotFoundError('Promotion configuration not found');
		return stored;
	}

	/** Only a `projects` connection can hold explicit project links. */
	private assertLinkableScope(scope: PromotionConnectionScope) {
		if (scope !== 'projects') {
			throw new BadRequestError('Only a project-scoped connection can have project links');
		}
	}

	// Manage links only for projects the caller can edit, on top of the route's
	// global `gitConnection:manageProjects` scope.
	private async assertProjectAccess(user: User, projectId: string) {
		const allowed = await userHasScopes(user, ['project:update'], false, { projectId });
		if (!allowed) throw new ForbiddenError('You do not have access to this project');
	}

	private async assertProjectIsTeam(projectId: string) {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can be linked to a promotion connection');
		}
	}

	private linkedElsewhere() {
		return new ConflictError('This project is linked to another promotion connection');
	}

	/**
	 * The configuration is already gone, and no operation can use a cache without
	 * resolving a live config, so a failed cleanup only leaves disk in use.
	 */
	private async purgeCache(configId: string) {
		try {
			await this.workingDirectory.purge(configId);
		} catch (error) {
			this.logger.warn('Failed to remove the local promotion checkout', {
				configId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

/** Initial configs as writes, in a stable order. */
function requestedConfigWrites(
	configs: CreatePromotionConnectionDto['configs'],
): PromotionConfigWrite[] {
	const writes: PromotionConfigWrite[] = [];
	if (configs?.apply) {
		writes.push({
			config: { direction: 'apply', settings: configs.apply.settings },
			name: configs.apply.name,
		});
	}
	if (configs?.promote) {
		writes.push({
			config: { direction: 'promote', settings: configs.promote.settings },
			name: configs.promote.name,
		});
	}
	return writes;
}
