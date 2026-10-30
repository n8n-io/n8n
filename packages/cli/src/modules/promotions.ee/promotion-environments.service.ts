import type {
	CreatePromotionEnvironmentDto,
	PromotionEnvironmentRemote,
	PromotionDirection,
	PromotionEnvironmentCheckout,
	PromotionEnvironmentProjectListPublicDto,
	PromotionEnvironmentProjectPublicDto,
	PromotionEnvironmentPublicDto,
	PromotionEnvironmentScope,
	PromotionEnvironmentSettings,
	PromotionEnvironmentSummary,
	UpdatePromotionEnvironmentDto,
} from '@n8n/api-types';
import { isPromotionGitHostType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { ProjectRepository, TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { PromotionEnvironment } from './database/entities/promotion-environment.entity';
import type { PromotionProvider } from './database/entities/promotion-provider.entity';
import { PromotionEnvironmentProjectRepository } from './database/repositories/promotion-environment-project.repository';
import {
	PromotionEnvironmentRepository,
	type PromotionEnvironmentFilter,
} from './database/repositories/promotion-environment.repository';
import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import { resolveStoredConfig } from './promotion-config-settings';
import {
	repositoryIdentity,
	resolvePromotionGitRemote,
	resolvePromotionRemote,
	storePromotionRemote,
	type PromotionStoredEnvironmentRemote,
} from './git-hosts/git-host-remote';
import { mapPromotionConflicts } from './promotion-conflicts';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import { buildCacheDescriptor, checkoutBranchName } from './promotions-git.utils';
import type { PromotionReviewCloseReason, ResolvedPromotionConfig } from './promotions.types';

type ManageProjectLinkOptions = {
	user: User;
	environmentId: string;
	projectId: string;
};

type ReviewTarget = {
	provider: Pick<PromotionProvider, 'type'>;
	remote: PromotionStoredEnvironmentRemote;
};

/**
 * Open reviews stay on the repository they were opened in. A new provider type or a new
 * repository leaves them behind. A new base URL alone does not, because it can name the
 * same host.
 */
function invalidatesOpenReviews(current: ReviewTarget, next: ReviewTarget): boolean {
	if (current.provider.type !== next.provider.type) return true;
	return repositoryIdentity(current.remote) !== repositoryIdentity(next.remote);
}

/**
 * Owns environments and their project links. Provider credentials belong to
 * {@link PromotionProvidersService}, so nothing here accepts or returns them.
 */
@Service()
export class PromotionEnvironmentsService {
	constructor(
		private readonly environmentRepository: PromotionEnvironmentRepository,
		private readonly linkRepository: PromotionEnvironmentProjectRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly providersService: PromotionProvidersService,
		private readonly gitService: PromotionsGitService,
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	async create(
		input: CreatePromotionEnvironmentDto,
		actor: User,
	): Promise<PromotionEnvironmentPublicDto> {
		const provider = await this.providersService.getEntity(input.providerId);
		this.gitService.validateRemoteUrl(input.remote.remoteUrl, provider.authType);
		const remote = storePromotionRemote(provider, input.remote);
		const settings = await this.checkSettings(input.direction, input.settings);

		const environment = await mapPromotionConflicts(
			async () =>
				await this.environmentRepository.insertEnvironment({
					name: input.name,
					scope: input.scope,
					providerId: input.providerId,
					remote,
					direction: input.direction,
					settings,
				}),
		);

		this.eventService.emit('promotion-environment-created', {
			user: actor,
			environmentId: environment.id,
			providerType: provider.type,
			direction: input.direction,
			environmentScope: input.scope,
			...('createBranchOnPromotion' in settings && {
				createBranchOnPromotion: settings.createBranchOnPromotion,
			}),
		});

		return await this.toPublic(Object.assign(environment, { provider }));
	}

	async findOne(id: string): Promise<PromotionEnvironmentPublicDto> {
		return await this.toPublic(await this.getEntity(id));
	}

	/** Leaves out environments whose stored settings this version cannot read. */
	async list(offset: number, limit: number, filter: PromotionEnvironmentFilter) {
		const { data, count } = await this.environmentRepository.listEnvironments({
			offset,
			limit,
			filter,
		});
		return {
			count,
			data: data.flatMap((environment) => {
				const resolved = resolveStoredConfig(environment);
				return resolved ? [this.toSummary(environment, resolved)] : [];
			}),
		};
	}

	/**
	 * Direction and scope cannot change. A settings write replaces the whole
	 * settings object and must match the stored direction. A new provider type or
	 * repository closes the open reviews, because they stay on the old target.
	 */
	async update(
		id: string,
		input: UpdatePromotionEnvironmentDto,
		actor: User,
	): Promise<PromotionEnvironmentPublicDto> {
		const current = await this.getEntity(id);

		// A new provider may accept different remote URL forms, so recheck the remote
		// on every reassignment, even when the remote itself did not change.
		const provider = input.providerId
			? await this.providersService.getEntity(input.providerId)
			: current.provider;
		const requested: PromotionEnvironmentRemote =
			input.remote ?? resolvePromotionRemote(current.provider, current.remote);
		this.gitService.validateRemoteUrl(requested.remoteUrl, provider.authType);
		const changesRemote = input.remote !== undefined || provider.id !== current.providerId;
		const remote =
			input.remote === undefined &&
			isPromotionGitHostType(provider.type) &&
			'repositoryPath' in current.remote
				? current.remote
				: changesRemote
					? storePromotionRemote(provider, requested)
					: current.remote;
		const settings =
			input.settings && (await this.checkSettings(current.direction, input.settings));

		const closed = await this.txRunner.run({}, async (ctx) => {
			const updated = await this.environmentRepository.updateEnvironment(
				id,
				current.providerId,
				{
					...(input.name !== undefined && { name: input.name }),
					...(changesRemote && { remote }),
					...(input.providerId !== undefined && { providerId: input.providerId }),
					...(settings && { settings }),
				},
				ctx,
			);
			if (!updated) {
				throw new ConflictError(
					'The environment changed during the update. Reload it and try again.',
				);
			}
			if (!invalidatesOpenReviews(current, { provider, remote })) return 0;
			return await this.reviewRepository.closeOpenByEnvironmentId(id, new Date(), ctx);
		});
		this.logClosedReviews(id, closed, 'environment_target_changed');
		const changedFields = [
			...(input.name !== undefined ? ['name' as const] : []),
			...(input.remote !== undefined ? ['remote' as const] : []),
			...(input.providerId !== undefined && input.providerId !== current.providerId
				? ['provider' as const]
				: []),
			...(input.settings !== undefined ? ['settings' as const] : []),
		];
		if (changedFields.length > 0) {
			this.eventService.emit('promotion-environment-updated', {
				user: actor,
				environmentId: id,
				direction: current.direction,
				changedFields,
			});
		}
		return await this.findOne(id);
	}

	/**
	 * Cascades to this environment's project links and closes its open reviews. The
	 * provider stays, because other environments may use it.
	 */
	async delete(id: string, actor: User): Promise<void> {
		const { id: environmentId, direction, scope } = await this.getEntity(id);
		// Close first: the delete clears the environment of its reviews.
		const { closed, deleted } = await this.txRunner.run({}, async (ctx) => {
			const closed = await this.reviewRepository.closeOpenByEnvironmentId(
				environmentId,
				new Date(),
				ctx,
			);
			const deleted = await this.environmentRepository.deleteEnvironment(environmentId, ctx);
			return { closed, deleted };
		});
		this.logClosedReviews(environmentId, closed, 'environment_deleted');
		if (deleted) {
			this.eventService.emit('promotion-environment-deleted', {
				user: actor,
				environmentId,
				direction,
				environmentScope: scope,
			});
		}
		await this.purgeCache(environmentId);
	}

	async listProjects(id: string): Promise<PromotionEnvironmentProjectListPublicDto> {
		await this.getEntity(id);
		return { projectIds: await this.linkRepository.findProjectIdsByEnvironment(id) };
	}

	async addProject({
		user,
		environmentId,
		projectId,
	}: ManageProjectLinkOptions): Promise<PromotionEnvironmentProjectPublicDto> {
		const environment = await this.getEntity(environmentId);
		this.assertLinkableScope(environment.scope);
		await this.assertProjectAccess(user, projectId);
		await this.assertProjectIsTeam(projectId);

		const link = await mapPromotionConflicts(
			async () =>
				await this.linkRepository.linkProject(projectId, environmentId, environment.direction),
		);
		return { projectId: link.projectId, environmentId: link.environmentId };
	}

	async removeProject({ user, environmentId, projectId }: ManageProjectLinkOptions): Promise<void> {
		const { direction } = await this.getEntity(environmentId);
		await this.assertProjectAccess(user, projectId);

		const existing = await this.linkRepository.findForProject(projectId, direction);
		if (!existing) return;
		if (existing.environmentId !== environmentId) throw this.linkedElsewhere(direction);

		const removed = await this.linkRepository.unlinkProject(projectId, environmentId);
		if (removed > 0) return;

		// The link changed between our read and the delete. A different owner is a
		// conflict; a link that is simply gone stays a no-op.
		const current = await this.linkRepository.findForProject(projectId, direction);
		if (current && current.environmentId !== environmentId) throw this.linkedElsewhere(direction);
	}

	async getEntity(id: string): Promise<PromotionEnvironment> {
		const environment = await this.environmentRepository.findByIdWithProvider(id);
		if (!environment) throw new NotFoundError('Promotion environment not found');
		return environment;
	}

	async toPublic(environment: PromotionEnvironment): Promise<PromotionEnvironmentPublicDto> {
		const resolved = resolveStoredConfig(environment);
		if (!resolved) {
			throw new BadRequestError('The stored promotion environment cannot be read');
		}
		return {
			...this.toSummary(environment, resolved),
			checkout: await this.checkoutStateFor(environment, resolved),
		};
	}

	private toSummary(
		environment: PromotionEnvironment,
		resolved: ResolvedPromotionConfig,
	): PromotionEnvironmentSummary {
		return {
			id: environment.id,
			name: environment.name,
			scope: environment.scope,
			remote: {
				...resolvePromotionRemote(environment.provider, environment.remote),
				...('repositoryPath' in environment.remote && {
					repositoryPath: environment.remote.repositoryPath,
				}),
			},
			provider: this.providersService.toSummary(environment.provider),
			...resolved,
			createdAt: environment.createdAt.toISOString(),
			updatedAt: environment.updatedAt.toISOString(),
		};
	}

	/**
	 * Reads whether this instance holds a usable checkout for the environment. A
	 * package operation needs a checkout that was cloned from the current remote and
	 * branch, so the flags let the UI show Connect, Reconnect, or Connected.
	 */
	private async checkoutStateFor(
		environment: PromotionEnvironment,
		resolved: ResolvedPromotionConfig,
	): Promise<PromotionEnvironmentCheckout> {
		const { repositoryFolder } = this.workingDirectory.paths(environment.id);
		const hasCheckout = await this.gitService.hasCheckout(repositoryFolder);
		if (!hasCheckout) return { hasCheckout: false, matchesEnvironment: false };

		// Read the remote the same way an operation does, so the reported state and the
		// enforced state cannot drift. A remote this version cannot read is not usable.
		let remote: PromotionEnvironmentRemote;
		try {
			remote = resolvePromotionGitRemote(environment.provider, environment.remote);
		} catch {
			return { hasCheckout, matchesEnvironment: false };
		}

		const matchesEnvironment = await this.workingDirectory.matchesDescriptor(
			buildCacheDescriptor({ environmentId: environment.id, remote, config: resolved }),
		);
		return { hasCheckout, matchesEnvironment };
	}

	private async checkSettings(
		direction: PromotionDirection,
		settings: PromotionEnvironmentSettings,
	): Promise<PromotionEnvironmentSettings> {
		const resolved = resolveStoredConfig({ direction, settings });
		if (!resolved) {
			throw new BadRequestError(`The settings do not match the ${direction} direction`);
		}
		await this.gitService.validateBranchName(checkoutBranchName(resolved));
		return resolved.settings;
	}

	/** Only a `projects` environment can hold explicit project links. */
	private assertLinkableScope(scope: PromotionEnvironmentScope) {
		if (scope !== 'projects') {
			throw new BadRequestError('Only a project-scoped environment can have project links');
		}
	}

	// Manage links only for projects the caller can edit, on top of the route's
	// global `promotions:manageProjects` scope.
	private async assertProjectAccess(user: User, projectId: string) {
		const allowed = await userHasScopes(user, ['project:update'], false, { projectId });
		if (!allowed) throw new ForbiddenError('You do not have access to this project');
	}

	private async assertProjectIsTeam(projectId: string) {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new NotFoundError('Project not found');
		if (project.type !== 'team') {
			throw new BadRequestError('Only team projects can be linked to a promotion environment');
		}
	}

	private linkedElsewhere(direction: PromotionDirection) {
		return new ConflictError(`This project uses another ${direction} promotion environment`);
	}

	private logClosedReviews(
		environmentId: string,
		count: number,
		reason: PromotionReviewCloseReason,
	) {
		if (count === 0) return;
		this.logger.info('Closed the open promotion reviews of an environment', {
			environmentId,
			count,
			reason,
		});
	}

	/**
	 * The environment is already gone, and no operation can use a cache without
	 * resolving a live environment, so a failed cleanup only leaves disk in use.
	 */
	private async purgeCache(environmentId: string) {
		try {
			await this.workingDirectory.purge(environmentId);
		} catch (error) {
			this.logger.warn('Failed to remove the local promotion checkout', {
				environmentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
