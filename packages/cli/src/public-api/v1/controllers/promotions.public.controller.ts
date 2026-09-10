import {
	ApplyPackageResultDto,
	CreatePromotionConnectionDto,
	CreatePromotionProviderDto,
	ListPromotionConnectionsQueryDto,
	ListPromotionProvidersQueryDto,
	MAX_ITEMS_PER_PAGE,
	PromotePackageDto,
	PromotePackageResultDto,
	PromotionApplyConfigPublicDto,
	PromotionCheckoutPublicDto,
	PromotionConnectionListPublicDto,
	PromotionConnectionProjectListPublicDto,
	PromotionConnectionProjectPublicDto,
	PromotionConnectionPublicDto,
	PromotionProviderCreatedPublicDto,
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	PromotionPromoteConfigPublicDto,
	UpdatePromotionConnectionDto,
	UpdatePromotionProviderDto,
	UpsertPromotionApplyConfigDto,
	UpsertPromotionPromoteConfigDto,
	projectIdParamSchema,
	promotionConnectionIdParamSchema,
	promotionDirectionParamSchema,
	promotionDirectionSchema,
	promotionProviderIdParamSchema,
	type PromotionDirection,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['Promotions'];

/**
 * Providers hold credentials, connections point at a remote, and each connection
 * has up to one config per direction. A config is addressed by its direction, so
 * there is no config ID in any path.
 */
@PublicApiController('/promotions')
export class PromotionsPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	// -- Providers -----------------------------------------------------------

	@Post('/providers')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:create')
	@GlobalScope('gitConnection:create')
	@ApiSummary('Create a promotion provider')
	@ApiDescription(
		'Creates a provider and its authentication material. An SSH provider returns the generated public key; add it to the remote as a deploy key.',
	)
	@ApiTags(tags)
	@ApiResponse(201, PromotionProviderCreatedPublicDto)
	@ApiErrorResponse(503)
	async createPromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreatePromotionProviderDto,
	): Promise<PromotionProviderCreatedPublicDto> {
		return await (await this.providersService()).create(input);
	}

	@Get('/providers')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:list')
	@GlobalScope('gitConnection:list')
	@ApiSummary('List promotion providers')
	@ApiDescription('Returns a cursor-paginated list of providers, without their public keys.')
	@ApiTags(tags)
	@ApiResponse(200, PromotionProviderListPublicDto)
	@ApiErrorResponse(503)
	async getPromotionProviders(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPromotionProvidersQueryDto,
	): Promise<PromotionProviderListPublicDto> {
		const { offset, limit } = this.resolvePage(query);
		const { data, count } = await (await this.providersService()).list(offset, limit);
		return {
			data,
			nextCursor:
				limit === 0 ? null : encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/providers/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('Retrieve a promotion provider')
	@ApiDescription('Returns the provider with its public configuration. Secrets are never returned.')
	@ApiTags(tags)
	@ApiResponse(200, PromotionProviderPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionProviderIdParamSchema) id: string,
	): Promise<PromotionProviderPublicDto> {
		return await (await this.providersService()).findOne(id);
	}

	@Put('/providers/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Update a promotion provider')
	@ApiDescription(
		'Renames the provider, and replaces its credentials when `auth` is sent. New credentials apply to every connection that uses this provider. The authentication method cannot change.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionProviderPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async updatePromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionProviderIdParamSchema) id: string,
		@Body input: UpdatePromotionProviderDto,
	): Promise<PromotionProviderPublicDto> {
		return await (await this.providersService()).update(id, input);
	}

	@Delete('/providers/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:delete')
	@GlobalScope('gitConnection:delete')
	@ApiSummary('Delete a promotion provider')
	@ApiDescription('A provider used by a connection cannot be deleted.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async deletePromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionProviderIdParamSchema) id: string,
	): Promise<void> {
		await (await this.providersService()).delete(id);
	}

	// -- Connections ---------------------------------------------------------

	@Post('/connections')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:create')
	@GlobalScope('gitConnection:create')
	@ApiSummary('Create a promotion connection')
	@ApiDescription(
		'Creates a connection on an existing provider, with up to one initial configuration for each direction. Only one instance connection can exist.',
	)
	@ApiTags(tags)
	@ApiResponse(201, PromotionConnectionPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async createPromotionConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreatePromotionConnectionDto,
	): Promise<PromotionConnectionPublicDto> {
		return await (await this.connectionsService()).create(input);
	}

	@Get('/connections')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:list')
	@GlobalScope('gitConnection:list')
	@ApiSummary('List promotion connections')
	@ApiDescription(
		'Returns a cursor-paginated list of connections with their configurations. Filter by `scope` for the instance connection, or by `providerId` to see which connections a provider edit affects.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionConnectionListPublicDto)
	@ApiErrorResponse(503)
	async getPromotionConnections(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPromotionConnectionsQueryDto,
	): Promise<PromotionConnectionListPublicDto> {
		const { offset, limit } = this.resolvePage(query);
		const { data, count } = await (await this.connectionsService()).list(offset, limit, {
			scope: query.scope,
			providerId: query.providerId,
		});
		return {
			data,
			nextCursor:
				limit === 0 ? null : encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/connections/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('Retrieve a promotion connection')
	@ApiDescription('Returns the connection with its provider summary and its configurations.')
	@ApiTags(tags)
	@ApiResponse(200, PromotionConnectionPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
	): Promise<PromotionConnectionPublicDto> {
		return await (await this.connectionsService()).findOne(id);
	}

	@Put('/connections/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Update a promotion connection')
	@ApiDescription(
		'Updates the name, target, or provider. Scope cannot change, and configurations have their own routes.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionConnectionPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async updatePromotionConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Body input: UpdatePromotionConnectionDto,
	): Promise<PromotionConnectionPublicDto> {
		return await (await this.connectionsService()).update(id, input);
	}

	@Delete('/connections/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:delete')
	@GlobalScope('gitConnection:delete')
	@ApiSummary('Delete a promotion connection')
	@ApiDescription(
		'Deletes the connection with its configurations, project links, and local checkouts. Its provider is kept.',
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async deletePromotionConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
	): Promise<void> {
		await (await this.connectionsService()).delete(id);
	}

	// -- Configurations ------------------------------------------------------

	@Put('/connections/:id/configs/apply')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Create or replace the Apply configuration')
	@ApiDescription(
		'Replaces the whole configuration, so an omitted name resets it to "Apply". Answers 200 whether it created or replaced.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionApplyConfigPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async upsertPromotionApplyConfig(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Body input: UpsertPromotionApplyConfigDto,
	): Promise<PromotionApplyConfigPublicDto> {
		return await (await this.connectionsService()).upsertConfig(id, {
			config: { direction: 'apply', settings: input.settings },
			name: input.name,
		});
	}

	@Put('/connections/:id/configs/promote')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Create or replace the Promote configuration')
	@ApiDescription(
		'Replaces the whole configuration, so an omitted name resets it to "Promote" and `createBranchOnPromotion` is always required. Answers 200 whether it created or replaced.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionPromoteConfigPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async upsertPromotionPromoteConfig(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Body input: UpsertPromotionPromoteConfigDto,
	): Promise<PromotionPromoteConfigPublicDto> {
		return await (await this.connectionsService()).upsertConfig(id, {
			config: { direction: 'promote', settings: input.settings },
			name: input.name,
		});
	}

	@Delete('/connections/:id/configs/:direction')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Remove one direction')
	@ApiDescription('Deletes the configuration and its local checkout. Nothing in Git changes.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async deletePromotionConfig(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Param('direction', promotionDirectionParamSchema) direction: string,
	): Promise<void> {
		await (await this.connectionsService()).deleteConfig(id, parseDirection(direction));
	}

	// -- Local checkouts -----------------------------------------------------

	@Post('/connections/:id/:direction/clone')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:clone')
	@GlobalScope('gitConnection:clone')
	@ApiSummary("Clone one direction's repository")
	@ApiDescription(
		'Clones the configured branch into local storage on the instance that handles the request. Safe to call repeatedly. Cloning one direction does not make the other ready.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionCheckoutPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async clonePromotionCheckout(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Param('direction', promotionDirectionParamSchema) direction: string,
	): Promise<PromotionCheckoutPublicDto> {
		return await (await this.promotionsService()).clone(id, parseDirection(direction));
	}

	@Post('/connections/:id/:direction/disconnect')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:clone')
	@GlobalScope('gitConnection:clone')
	@ApiSummary("Remove one direction's local checkout")
	@ApiDescription(
		'Removes the local checkout and keeps the configuration, its credentials, and the trusted SSH host keys.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionCheckoutPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async disconnectPromotionCheckout(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Param('direction', promotionDirectionParamSchema) direction: string,
	): Promise<PromotionCheckoutPublicDto> {
		return await (await this.promotionsService()).disconnect(id, parseDirection(direction));
	}

	// -- Project links -------------------------------------------------------

	@Get('/connections/:id/projects')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('List projects linked to a promotion connection')
	@ApiTags(tags)
	@ApiResponse(200, PromotionConnectionProjectListPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionConnectionProjects(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
	): Promise<PromotionConnectionProjectListPublicDto> {
		return await (await this.connectionsService()).listProjects(id);
	}

	@Post('/connections/:id/projects/:projectId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:manageProjects')
	@GlobalScope('gitConnection:manageProjects')
	@ApiSummary('Link a project to a promotion connection')
	@ApiDescription(
		'Links a team project to a project-scoped connection. A project can be linked to only one connection.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionConnectionProjectPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async addProjectToPromotionConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<PromotionConnectionProjectPublicDto> {
		return await (await this.connectionsService()).addProject({
			user: req.user,
			connectionId: id,
			projectId,
		});
	}

	@Delete('/connections/:id/projects/:projectId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:manageProjects')
	@GlobalScope('gitConnection:manageProjects')
	@ApiSummary('Unlink a project from a promotion connection')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async removeProjectFromPromotionConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<void> {
		await (await this.connectionsService()).removeProject({
			user: req.user,
			connectionId: id,
			projectId,
		});
	}

	// -- Package operations --------------------------------------------------

	@Post('/connections/:id/promote')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:push')
	@GlobalScope('gitConnection:push')
	@ApiSummary('Promote all team projects')
	@ApiDescription(
		'Exports every team project, commits it, and pushes to the configured branch. Personal projects are ignored. Requires the Promote direction to be cloned first, and is available on the instance connection only. The API key also needs variable:list when the workflows reference variables.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotePackageResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async promotePackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
		@Body input: PromotePackageDto,
	): Promise<PromotePackageResultDto> {
		return await (await this.promotionsService()).promote(id, req.user, {
			...input,
			canExportVariableValues: req.tokenGrant?.apiKeyScopes?.includes('variable:list') ?? false,
		});
	}

	@Post('/connections/:id/apply')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:pull')
	@GlobalScope('gitConnection:pull')
	@ApiSummary('Apply a package to the instance')
	@ApiDescription(
		'Resets the local checkout to the configured branch tip and imports the package, overwriting to match. Requires the Apply direction to be cloned first, and is available on the instance connection only.',
	)
	@ApiTags(tags)
	@ApiResponse(200, ApplyPackageResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(422)
	@ApiErrorResponse(503)
	async applyPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id', promotionConnectionIdParamSchema) id: string,
	): Promise<ApplyPackageResultDto> {
		return await (await this.promotionsService()).apply(id, req.user);
	}

	// -- Module access -------------------------------------------------------

	private assertModuleActive() {
		if (!this.moduleRegistry.isActive('promotions')) {
			throw new ServiceUnavailableError('Promotions module is not enabled');
		}
	}

	private async providersService() {
		this.assertModuleActive();
		const { PromotionProvidersService } = await import(
			'@/modules/promotions.ee/promotion-providers.service.js'
		);
		return Container.get(PromotionProvidersService);
	}

	private async connectionsService() {
		this.assertModuleActive();
		const { PromotionConnectionsService } = await import(
			'@/modules/promotions.ee/promotion-connections.service.js'
		);
		return Container.get(PromotionConnectionsService);
	}

	private async promotionsService() {
		this.assertModuleActive();
		const { PromotionsService } = await import('@/modules/promotions.ee/promotions.service.js');
		return Container.get(PromotionsService);
	}

	private resolvePage(query: { cursor?: string; limit: number }) {
		const page = resolveOffsetPagination(query);
		if (!query.cursor) return page;
		// A cursor is unsigned base64 the client can forge, so recheck the bounds the
		// raw query params already enforce.
		if (
			!Number.isInteger(page.offset) ||
			page.offset < 0 ||
			!Number.isInteger(page.limit) ||
			page.limit < 1
		) {
			throw new BadRequestError('An invalid cursor was provided');
		}
		return { offset: page.offset, limit: Math.min(page.limit, MAX_ITEMS_PER_PAGE) };
	}
}

/** An unknown direction addresses nothing, so it is a 404 rather than a 400. */
function parseDirection(value: string): PromotionDirection {
	const parsed = promotionDirectionSchema.safeParse(value);
	if (!parsed.success) throw new NotFoundError(`Unknown promotion direction: ${value}`);
	return parsed.data;
}
