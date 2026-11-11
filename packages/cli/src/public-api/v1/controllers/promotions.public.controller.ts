import {
	ApplyPackageDto,
	ApplyPackageResultDto,
	ApplySelectionDto,
	ContinueApplyPackageDto,
	ContinueApplySelectionDto,
	CreatePromotionEnvironmentDto,
	CreatePromotionProviderDto,
	ListPromotionEnvironmentsQueryDto,
	ListPromotionProvidersQueryDto,
	ListPromotionRepositoriesQueryDto,
	ListPromotionBranchesQueryDto,
	MAX_ITEMS_PER_PAGE,
	MAX_PROMOTION_DISCOVERY_ITEMS_PER_PAGE,
	PromotePackageDto,
	PromotePackageResultDto,
	PromoteSelectionRequestDto,
	PromotionCheckoutPublicDto,
	PromotionEnvironmentListPublicDto,
	PromotionEnvironmentProjectListPublicDto,
	PromotionEnvironmentProjectPublicDto,
	PromotionEnvironmentPublicDto,
	PromotionMissingProjectListPublicDto,
	PromotionInstanceApplyPreviewDto,
	PromotionPreviewDto,
	PromotionProviderCreatedPublicDto,
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	PromotionRepositoryListPublicDto,
	PromotionResourceDetailsDto,
	PromotionResourceDetailsRequestDto,
	PromotionBranchListPublicDto,
	UpdatePromotionEnvironmentDto,
	UpdatePromotionProviderDto,
	projectIdParamSchema,
	promotionDirectionParamSchema,
	promotionEnvironmentIdParamSchema,
	promotionDirectionSchema,
	promotionProviderIdParamSchema,
	promotionRepositoryIdParamSchema,
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
	RateLimitAccess,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';

import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	ServiceUnavailableError,
} from '@n8n/errors';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['Promotions'];

/** Promotions is a preview feature, so every endpoint carries the Beta note of the n8n packages API. */
const BETA_NOTE = '**Beta** — breaking changes may still occur without major version bump.\n\n';

/**
 * Providers hold credentials. An environment points at a remote for one direction
 * and holds the settings of that direction.
 */
@PublicApiController('/promotions')
export class PromotionsPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	// -- Providers -----------------------------------------------------------

	@Post('/providers')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:create')
	@GlobalScope('promotions:create')
	@ApiSummary('Beta: Create a promotion provider')
	@ApiDescription(
		BETA_NOTE +
			'Creates a provider and its authentication material. A Git host provider validates authenticated API access before it saves. For GitLab, the service uses n8n as the Git transport username. Its auth.username is optional. The service ignores any supplied username. Plain Git token authentication requires auth.username. An SSH provider returns the generated public key; add it to the remote as a deploy key.',
	)
	@ApiTags(tags)
	@ApiResponse(201, PromotionProviderCreatedPublicDto)
	@ApiErrorResponse(503)
	async createPromotionProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreatePromotionProviderDto,
	): Promise<PromotionProviderCreatedPublicDto> {
		return await (await this.providersService()).create(input, req.user);
	}

	@Get('/providers')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:list')
	@GlobalScope('promotions:list')
	@ApiSummary('Beta: List promotion providers')
	@ApiDescription(
		BETA_NOTE + 'Returns a cursor-paginated list of providers, without their public configuration.',
	)
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

	@Get('/providers/:promotionProviderId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:read')
	@GlobalScope('promotions:read')
	@ApiSummary('Beta: Retrieve a promotion provider')
	@ApiDescription(
		BETA_NOTE + 'Returns the provider with its public configuration. Secrets are never returned.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionProviderPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema)
		promotionProviderId: string,
	): Promise<PromotionProviderPublicDto> {
		return await (await this.providersService()).findOne(promotionProviderId);
	}

	@Put('/providers/:promotionProviderId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:update')
	@GlobalScope('promotions:update')
	@ApiSummary('Beta: Update a promotion provider')
	@ApiDescription(
		BETA_NOTE +
			'Renames the provider, and replaces its credentials when `auth` is sent. A Git host provider can also update its base URL. A different API destination requires `auth` in the same request. Changed credentials and host settings are validated before they save. If another request changes the credentials or configuration before this update saves, the update returns 409. Reload the provider and try again. For GitLab, the service uses n8n as the Git transport username. Its auth.username is optional. The service ignores any supplied username. Plain Git token authentication requires auth.username. New credentials apply to every environment that uses this provider. The authentication method cannot change.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionProviderPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async updatePromotionProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema)
		promotionProviderId: string,
		@Body input: UpdatePromotionProviderDto,
	): Promise<PromotionProviderPublicDto> {
		return await (await this.providersService()).update(promotionProviderId, input, req.user);
	}

	@Delete('/providers/:promotionProviderId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:delete')
	@GlobalScope('promotions:delete')
	@ApiSummary('Beta: Delete a promotion provider')
	@ApiDescription(BETA_NOTE + 'A provider used by an environment cannot be deleted.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async deletePromotionProvider(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema)
		promotionProviderId: string,
	): Promise<void> {
		await (await this.providersService()).delete(promotionProviderId, req.user);
	}

	@Get('/providers/:promotionProviderId/repositories')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:discover')
	@GlobalScope('promotions:discover')
	@ApiSummary('Beta: List repositories of a promotion provider')
	@ApiDescription(
		BETA_NOTE +
			'Lists repositories where the GitLab token identity has at least the Developer role. The token also needs Git write scope for promotions. Protected branches can restrict pushes. Use remoteUrl as an environment remote. Search matches names and namespaces in similarity order. Unfiltered results use ascending repository ID order. The limit is an upper bound. GitLab returns at most 100 items per page. Follow nextCursor even when a page has fewer items than the requested limit. A saved environment is not required. Invalid credentials return an error, not an empty list. If a response is too large, restart the list with a smaller limit and no cursor.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionRepositoryListPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionProviderRepositories(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema) promotionProviderId: string,
		@Query query: ListPromotionRepositoriesQueryDto,
	): Promise<PromotionRepositoryListPublicDto> {
		const { offset, limit } = this.resolveDiscoveryPage(query);
		const { data, hasNextPage } = await (await this.providersService()).listRepositories(
			promotionProviderId,
			{ offset, limit, search: query.search },
		);
		return {
			data,
			nextCursor: hasNextPage
				? encodeNextCursor({ offset, limit, numberOfTotalRecords: offset + limit + 1 })
				: null,
		};
	}

	@Get('/providers/:promotionProviderId/repositories/:repositoryId/branches')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:discover')
	@GlobalScope('promotions:discover')
	@ApiSummary('Beta: List branches of a promotion repository')
	@ApiDescription(
		BETA_NOTE +
			'Lists branches of the selected GitLab repository and identifies its default branch. Pass the URL-encoded fullPath from repository discovery, or the repositoryPath of a saved GitLab environment, as repositoryId. GitLab project IDs are also accepted, but environments do not store them. Supports branch search and cursor pagination. The limit is an upper bound. GitLab returns at most 100 items per page. Follow nextCursor even when a page has fewer items than the requested limit. A saved environment is not required. Invalid credentials and inaccessible repositories return errors, not empty lists. If a response is too large, restart the list with a smaller limit and no cursor.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionBranchListPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionProviderRepositoryBranches(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema) promotionProviderId: string,
		@Param('repositoryId', promotionRepositoryIdParamSchema) repositoryId: string,
		@Query query: ListPromotionBranchesQueryDto,
	): Promise<PromotionBranchListPublicDto> {
		const { offset, limit } = this.resolveDiscoveryPage(query);
		const { data, hasNextPage } = await (await this.providersService()).listBranches(
			promotionProviderId,
			repositoryId,
			{ offset, limit, search: query.search },
		);
		return {
			data,
			nextCursor: hasNextPage
				? encodeNextCursor({ offset, limit, numberOfTotalRecords: offset + limit + 1 })
				: null,
		};
	}

	// -- Environments --------------------------------------------------------

	@Post('/environments')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:create')
	@GlobalScope('promotions:create')
	@ApiSummary('Beta: Create a promotion environment')
	@ApiDescription(
		BETA_NOTE +
			'Creates an environment for one direction on an existing provider. The settings must match the direction. A GitLab remote URL must belong to the saved provider. The environment stores only the repository path and derives remoteUrl from the current provider base URL. Plain Git environments keep the full remote URL. The instance can have one environment for each direction.',
	)
	@ApiTags(tags)
	@ApiResponse(201, PromotionEnvironmentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async createPromotionEnvironment(
		req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreatePromotionEnvironmentDto,
	): Promise<PromotionEnvironmentPublicDto> {
		return await (await this.environmentsService()).create(input, req.user);
	}

	@Get('/environments')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:list')
	@GlobalScope('promotions:list')
	@ApiSummary('Beta: List promotion environments')
	@ApiDescription(
		BETA_NOTE +
			'Returns a cursor-paginated list of environments. Filter by `scope` and `direction` for the instance environments, or by `providerId` to see which environments a provider edit affects.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionEnvironmentListPublicDto)
	@ApiErrorResponse(503)
	async getPromotionEnvironments(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPromotionEnvironmentsQueryDto,
	): Promise<PromotionEnvironmentListPublicDto> {
		const { offset, limit } = this.resolvePage(query);
		const { data, count } = await (await this.environmentsService()).list(offset, limit, {
			scope: query.scope,
			direction: query.direction,
			providerId: query.providerId,
		});
		return {
			data,
			nextCursor:
				limit === 0 ? null : encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/environments/:promotionEnvironmentId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:read')
	@GlobalScope('promotions:read')
	@ApiSummary('Beta: Retrieve a promotion environment')
	@ApiDescription(
		BETA_NOTE +
			'Returns the environment with its provider summary and the state of its local checkout.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionEnvironmentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionEnvironment(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionEnvironmentPublicDto> {
		return await (await this.environmentsService()).findOne(promotionEnvironmentId);
	}

	@Put('/environments/:promotionEnvironmentId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:update')
	@GlobalScope('promotions:update')
	@ApiSummary('Beta: Update a promotion environment')
	@ApiDescription(
		BETA_NOTE +
			'Updates the name, provider, remote, or settings. A remote replaces the whole saved remote, and settings replace the whole saved settings. The settings must match the direction of the environment, so `createBranchOnPromotion` is always required for Promote. GitLab environments store a repository path and derive remoteUrl from the provider. Plain Git environments keep the full remote URL. A new provider type or repository closes the open promotion reviews of the environment in n8n. Their merge requests stay open on the Git host. If the provider changes during the update, the update returns 409. Reload the environment and try again. Direction and scope cannot change.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionEnvironmentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async updatePromotionEnvironment(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Body input: UpdatePromotionEnvironmentDto,
	): Promise<PromotionEnvironmentPublicDto> {
		return await (await this.environmentsService()).update(promotionEnvironmentId, input, req.user);
	}

	@Delete('/environments/:promotionEnvironmentId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:delete')
	@GlobalScope('promotions:delete')
	@ApiSummary('Beta: Delete a promotion environment')
	@ApiDescription(
		BETA_NOTE +
			'Deletes the environment with its project links and local checkout. Its provider is kept. Nothing in the Git repository changes. The open promotion reviews of the environment close in n8n. Their merge requests stay open on the Git host.',
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async deletePromotionEnvironment(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<void> {
		await (await this.environmentsService()).delete(promotionEnvironmentId, req.user);
	}

	// -- Local checkouts -----------------------------------------------------

	@Post('/environments/:promotionEnvironmentId/connect')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:connect')
	@GlobalScope('promotions:connect')
	@ApiSummary('Beta: Connect an environment')
	@ApiDescription(
		BETA_NOTE +
			'Prepares the environment on the instance that handles the request. For a Git provider, this clones the configured branch into local storage. Safe to call repeatedly. Connecting one environment does not make another ready.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionCheckoutPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async connectPromotionCheckout(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionCheckoutPublicDto> {
		return await (await this.promotionsService()).clone(promotionEnvironmentId, req.user);
	}

	@Post('/environments/:promotionEnvironmentId/disconnect')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:connect')
	@GlobalScope('promotions:connect')
	@ApiSummary("Beta: Remove an environment's local checkout")
	@ApiDescription(
		BETA_NOTE +
			'Removes the local checkout on this instance, asks the other main instances to remove theirs, and keeps the environment, its credentials, and the trusted SSH host keys.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionCheckoutPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async disconnectPromotionCheckout(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionCheckoutPublicDto> {
		return await (await this.promotionsService()).disconnect(promotionEnvironmentId);
	}

	// -- Project links -------------------------------------------------------

	@Get('/environments/:promotionEnvironmentId/projects')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:read')
	@GlobalScope('promotions:read')
	@ApiSummary('Beta: List projects linked to a promotion environment')
	@ApiDescription(BETA_NOTE.trim())
	@ApiTags(tags)
	@ApiResponse(200, PromotionEnvironmentProjectListPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionEnvironmentProjects(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionEnvironmentProjectListPublicDto> {
		return await (await this.environmentsService()).listProjects(promotionEnvironmentId);
	}

	// No pagination. The list comes from one read of the Apply branch, so there is no second page to fetch.
	@Get('/environments/:promotionEnvironmentId/missing-projects')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:read')
	@GlobalScope('promotions:read')
	@ApiSummary('Beta: List package projects that are missing on this instance')
	@ApiDescription(
		BETA_NOTE +
			'Reads the package at the Apply branch tip and returns its team projects whose IDs do not exist on this instance. Projects are matched by ID, not by name. An ID that a personal project uses counts as existing. Create each project with `POST /projects`, using the returned id, name, icon, description, and customTelemetryTags. The new project is empty, and the caller becomes its project admin. Then use the project Apply flow to apply its resources. An empty `data` means that no setup is needed. `git` is null when the branch has no package yet. Requires a connected Apply environment with instance scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionMissingProjectListPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionEnvironmentMissingProjects(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionMissingProjectListPublicDto> {
		return await (await this.promotionsService()).listMissingProjects(promotionEnvironmentId);
	}

	@Post('/environments/:promotionEnvironmentId/projects/:projectId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:manageProjects')
	@GlobalScope('promotions:manageProjects')
	@ApiSummary('Beta: Link a project to a promotion environment')
	@ApiDescription(
		BETA_NOTE +
			'Links a team project to a project-scoped environment. A project can have one environment for each direction. A direction without a project environment uses the instance environment.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionEnvironmentProjectPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async addProjectToPromotionEnvironment(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<PromotionEnvironmentProjectPublicDto> {
		return await (await this.environmentsService()).addProject({
			user: req.user,
			environmentId: promotionEnvironmentId,
			projectId,
		});
	}

	@Delete('/environments/:promotionEnvironmentId/projects/:projectId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:manageProjects')
	@GlobalScope('promotions:manageProjects')
	@ApiSummary('Beta: Unlink a project from a promotion environment')
	@ApiDescription(BETA_NOTE.trim())
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async removeProjectFromPromotionEnvironment(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<void> {
		await (await this.environmentsService()).removeProject({
			user: req.user,
			environmentId: promotionEnvironmentId,
			projectId,
		});
	}

	// -- Package operations --------------------------------------------------

	@Post('/environments/:promotionEnvironmentId/promote')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:promote')
	@GlobalScope('promotions:promote')
	@ApiSummary('Beta: Promote all team projects')
	@ApiDescription(
		BETA_NOTE +
			"Exports every team project, commits it, and pushes to the configured base branch or a new timestamped branch. The response reports the target branch in `git.branchName`. Personal projects are ignored. A workflow on the branch that moved to a personal project is refused with 400, because the destination would delete it. A workflow or folder on the branch that moved to another team project is refused with 400 while its old project still exists, because Apply can't move it between projects. Requires a connected Promote environment with instance scope. The API key also needs variable:list when the workflows reference variables.",
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotePackageResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async promotePackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Body input: PromotePackageDto,
	): Promise<PromotePackageResultDto> {
		return await (await this.promotionsService()).promote(promotionEnvironmentId, req.user, {
			...input,
			canExportVariableValues: req.tokenGrant?.apiKeyScopes?.includes('variable:list') ?? false,
		});
	}

	@Post('/environments/:promotionEnvironmentId/apply')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:apply')
	@GlobalScope('promotions:apply')
	@ApiSummary('Beta: Apply a package to the instance')
	@ApiDescription(
		BETA_NOTE +
			'Checks the full package at the configured branch tip. Optionally send expectedSource with the environmentId, branchName, and full commitSha from the reviewed change preview; status `source-changed` means the branch moved since that review and nothing was imported. Optionally send expectedPreviewRevision with the `revision` of the reviewed preview; status `preview-changed` means this instance changed since that review and nothing was imported. Returns status `blocked` before import writes if bindings need setup, if the import conflicts with this instance, or if the apply would delete team projects that the package does not hold. Retain environmentId and git for Continue. Status `applied` includes counts and warnings. Inspect status before reading counts. Existing target variable values, including empty strings, are preserved. Workflows and folders move within their project to match the branch, and folders take the name on the branch. Apply cannot move a workflow or folder between projects. It returns a `moved` conflict in `blocked` with both projects. For a personal project, the conflict gives only the ID. Requires a connected Apply environment with instance scope. The importer checks user write permissions; granular API-key write scopes are not passed to it.',
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
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Body input: ApplyPackageDto,
	): Promise<ApplyPackageResultDto> {
		return await (await this.promotionsService()).apply(promotionEnvironmentId, req.user, input);
	}

	@Post('/environments/:promotionEnvironmentId/apply/continue')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:apply')
	@GlobalScope('promotions:apply')
	@ApiSummary('Beta: Continue Apply after binding setup')
	@ApiDescription(
		BETA_NOTE +
			'Rechecks the configured source and current target bindings. Send expectedSource with the environmentId, branchName, and full commitSha from the reviewed Apply result. Send `confirmDestructiveChanges: true` to also apply destructive data table changes and delete the reported team projects. Send expectedPreviewRevision to confirm only what the reviewed preview showed. Status `source-changed` or `preview-changed` requires a new Apply review. Status `blocked` returns every blocker again, without import writes. Status `applied` includes counts and warnings. Inspect status before reading counts. Existing target variable values are preserved. Requires the same connected instance environment and permissions as Apply. The importer checks user write permissions; granular API-key write scopes are not passed to it. No server session or exactly-once guarantee is provided.',
	)
	@ApiTags(tags)
	@ApiResponse(200, ApplyPackageResultDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(422)
	@ApiErrorResponse(503)
	async continueApplyPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Body input: ContinueApplyPackageDto,
	): Promise<ApplyPackageResultDto> {
		return await (await this.promotionsService()).continueApply(
			promotionEnvironmentId,
			req.user,
			input,
		);
	}

	// -- Change preview ------------------------------------------------------

	@Get('/environments/:promotionEnvironmentId/changes')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:apply')
	@GlobalScope('promotions:apply')
	@ApiSummary('Beta: Preview the Apply of the whole instance')
	@ApiDescription(
		BETA_NOTE +
			'Shows what applying the branch tip of an instance Apply environment changes on this instance, for every project of the package. `resources` and `dependencies` have the same shape as the project change preview. Resources are not selectable: Apply applies the whole package. A team project that the package does not hold is listed as `deleted`, with the folders, workflows, credentials, data tables and variables that it owns. Workflows and folders that a kept project no longer holds are listed as `deleted` too. `check` lists what blocks the Apply. A `project-deletion` conflict needs `confirmDestructiveChanges` on Continue. Send `revision` as expectedPreviewRevision and `commitSha` in expectedSource to apply only what this preview shows. Requires a connected Apply environment with instance scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionInstanceApplyPreviewDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getInstanceApplyChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionInstanceApplyPreviewDto> {
		return await (await this.changeService()).getInstanceApplyPreview(
			req.user,
			promotionEnvironmentId,
		);
	}

	@Post('/environments/:promotionEnvironmentId/changes/details')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:apply')
	@GlobalScope('promotions:apply')
	@RateLimitAccess('read')
	@ApiSummary('Beta: Read the content of resources in the whole-instance Apply preview')
	@ApiDescription(
		BETA_NOTE +
			'Returns the content before and after the change for up to 50 resources of the whole-instance Apply preview. Send the `commitSha` and the resource `key` values from the preview. The branch side is read at that commit. The instance side is read now, so a `revision` that differs from the preview means the resource changed after the preview. A data table that a deleted project owns but no workflow uses has its current content as `before`. `missingKeys` lists requested resources that neither side holds anymore, and such credentials and variables, which have no content to show. Credential content holds expressions only. Variable values are left out, and `valueHidden` is true, unless the API key and the user have the variable:list scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionResourceDetailsDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getInstanceApplyChangeDetails(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Body input: PromotionResourceDetailsRequestDto,
	): Promise<PromotionResourceDetailsDto> {
		return await (await this.changeService()).getInstanceApplyDetails(
			req.user,
			promotionEnvironmentId,
			input,
			{
				canSeeVariableValues:
					hasGlobalScope(req.user, 'variable:list') &&
					(req.tokenGrant?.apiKeyScopes?.includes('variable:list') ?? false),
			},
		);
	}

	@Get('/projects/:projectId/changes/:direction')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope({ anyOf: ['promotions:promote', 'promotions:apply'] })
	@ApiSummary('Beta: Preview the changes of a project in one direction')
	@ApiDescription(
		BETA_NOTE +
			'Compares a team project on this instance with the branch of its promotion environment for that direction. For `promote` the preview is what a promotion sends to the branch, and the key needs the promotions:promote scope. For `apply` the preview is what applying the branch changes on this instance, and the key needs the promotions:apply scope. `resources` lists the changed projects, folders, workflows, credentials, data tables, variables and tags, each with its `key`, `type`, `id`, `change` and the `parentKey` of the project or folder that holds it. It also lists unchanged resources that give context, such as parent folders. Select the workflows and folders where `selectable` is true by `workflowIds` and `folderIds`; the project itself is always included. `dependencies` links each workflow to the resources it uses; selecting the workflow sends a dependency when `included` is true. A deleted promote workflow with `movedToProject`, or an added one with `movedFromProject`, moved between projects; promoting it is refused until it moves back. `blocker` is set when an open review holds the changes of a Promote. For `apply`, `check` lists what blocks the Apply, and `revision` identifies this preview: send it as expectedPreviewRevision. `commitSha` is the commit the preview was read from. Requires the environment to be connected first.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionPreviewDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('direction', promotionDirectionParamSchema) direction: string,
	): Promise<PromotionPreviewDto> {
		const parsedDirection = this.parseDirectionWithKeyScope(req, direction);
		return await (await this.changeService()).getPreview(req.user, projectId, parsedDirection);
	}

	@Post('/projects/:projectId/changes/:direction/details')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope({ anyOf: ['promotions:promote', 'promotions:apply'] })
	@RateLimitAccess('read')
	@ApiSummary('Beta: Read the content of changed resources')
	@ApiDescription(
		BETA_NOTE +
			'Returns the content before and after the change for up to 50 resources of a change preview. Send the `commitSha` and the resource `key` values from the preview. The branch side is read at that commit. The instance side is read now, so a `revision` that differs from the preview means the resource changed after the preview. `missingKeys` lists requested resources that neither side holds anymore. Credential content holds expressions only. Variable values are left out, and `valueHidden` is true, unless the API key and the user have the variable:list scope. The key needs the same scope as the preview for that direction.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionResourceDetailsDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionChangeDetails(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('direction', promotionDirectionParamSchema) direction: string,
		@Body input: PromotionResourceDetailsRequestDto,
	): Promise<PromotionResourceDetailsDto> {
		const parsedDirection = this.parseDirectionWithKeyScope(req, direction);
		return await (await this.changeService()).getDetails(
			req.user,
			projectId,
			parsedDirection,
			input,
			{
				canSeeVariableValues:
					hasGlobalScope(req.user, 'variable:list') &&
					(req.tokenGrant?.apiKeyScopes?.includes('variable:list') ?? false),
			},
		);
	}

	// -- Selective promote ---------------------------------------------------

	@Post('/projects/:projectId/promote')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:promote')
	@GlobalScope('promotions:promote')
	@ApiSummary("Beta: Promote a selection of a project's workflows and folders")
	@ApiDescription(
		BETA_NOTE +
			"Promotes a chosen set of a team project's workflows and folders to the branch of the project's Promote environment. The project's own details (name, icon, description and telemetry tags) are always written, so a request without workflowIds and folderIds promotes only the project. A selected folder is written with the folders above it; a renamed or moved folder moves the workflows inside it on the branch, without changing their content. Status 400 with 'Nothing to promote' means the branch already matches the selection. Send ids only; the server reads each one now, so the push carries the current state. Live and archived workflows the project owns are exported, so an archived id stays on the branch as archived; an id whose workflow is gone from the instance leaves the branch, matching the project's change list. A workflow that moved into or out of the project since the branch was written is refused with 400; move it back first. A deletion the branch does not hold under this project rejects the whole request before any write. Requires a Promote environment to resolve for the project (its own Promote environment, otherwise the instance Promote environment), and requires it to be connected first. The API key also needs variable:list when the workflows reference variables.",
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotePackageResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async promoteProjectSelection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body input: PromoteSelectionRequestDto,
	): Promise<PromotePackageResultDto> {
		return await (await this.promotionsService()).promoteProjectSelection(projectId, req.user, {
			...input,
			// Variable values only travel when the key may list them.
			canExportVariableValues: req.tokenGrant?.apiKeyScopes?.includes('variable:list') ?? false,
		});
	}

	// -- Selective apply -----------------------------------------------------

	@Post('/projects/:projectId/apply')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:apply')
	@GlobalScope('promotions:apply')
	@ApiSummary("Beta: Apply a selection of a project's workflows and folders")
	@ApiDescription(
		BETA_NOTE +
			"Applies selected changes from the project's Apply branch. The project's name, icon, description and telemetry tags always come from the branch, so a request without workflowIds and folderIds applies only the project. The server imports the selected workflow IDs present on the branch for this project. It removes a selected workflow owned by this project when the branch does not hold it. Duplicate or invalid IDs reject the whole request. Unselected content stays unchanged. A selected workflow or folder is created, or moved within the project to match the branch, together with the folders above it, and those folders take the name on the branch; other folders stay as they are. Optionally send expectedSource with the environmentId, branchName, and full commitSha from the reviewed change preview. Status `source-changed` means the source changed since that review and nothing was imported. Optionally send expectedPreviewRevision with the revision of the reviewed Apply preview. Status `preview-changed` means this instance changed since that review and nothing was imported. Status `blocked` returns the blockers before import writes: bindings that need setup and conflicts with this instance. Apply cannot move a selected workflow or a folder of this project between projects. It returns a `moved` conflict in `blocked` with both projects. For a personal project, the conflict gives only the ID. Retain environmentId and git for Continue. Status `applied` includes counts and warnings. Inspect status before reading counts. Requires a connected Apply environment for the project: its own Apply environment, otherwise the instance Apply environment. The importer checks user write permissions.",
	)
	@ApiTags(tags)
	@ApiResponse(200, ApplyPackageResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(422)
	@ApiErrorResponse(503)
	async applyProjectSelection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body input: ApplySelectionDto,
	): Promise<ApplyPackageResultDto> {
		return await (await this.promotionsService()).applyProjectSelection(projectId, req.user, input);
	}

	@Post('/projects/:projectId/apply/continue')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ApiKeyScope('promotions:apply')
	@GlobalScope('promotions:apply')
	@ApiSummary('Beta: Continue applying a selection after binding setup')
	@ApiDescription(
		BETA_NOTE +
			"Rechecks the project's Apply source and the current bindings for the selection. Resend the full selection: workflowIds and folderIds. Send the required expectedSource with the environmentId, branchName, and full commitSha from the reviewed Apply result. Optionally send expectedPreviewRevision with the revision of the reviewed Apply preview. Send `confirmDestructiveChanges: true` to also apply destructive data table changes. The server does not keep a session. Status `source-changed` or `preview-changed` requires a new Apply review. Status `blocked` returns every blocker again, before import writes. Status `applied` includes counts and warnings. Inspect status before reading counts. Unselected content stays unchanged. Requires the same connected Apply environment and permissions as the initial selection apply. The importer checks user write permissions.",
	)
	@ApiTags(tags)
	@ApiResponse(200, ApplyPackageResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(422)
	@ApiErrorResponse(503)
	async continueApplyProjectSelection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body input: ContinueApplySelectionDto,
	): Promise<ApplyPackageResultDto> {
		return await (await this.promotionsService()).continueApplyProjectSelection(
			projectId,
			req.user,
			input,
		);
	}

	/** The route accepts a key with either scope. The direction decides which one this call needs. */
	private parseDirectionWithKeyScope(req: AuthenticatedRequest, value: string) {
		const direction = parseDirection(value);
		const requiredScope = direction === 'apply' ? 'promotions:apply' : 'promotions:promote';
		if (!(req.tokenGrant?.apiKeyScopes?.includes(requiredScope) ?? false)) {
			throw new ForbiddenError(`The ${direction} direction requires the ${requiredScope} scope`);
		}
		return direction;
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

	private async environmentsService() {
		this.assertModuleActive();
		const { PromotionEnvironmentsService } = await import(
			'@/modules/promotions.ee/promotion-environments.service.js'
		);
		return Container.get(PromotionEnvironmentsService);
	}

	private async promotionsService() {
		this.assertModuleActive();
		const { PromotionsService } = await import('@/modules/promotions.ee/promotions.service.js');
		return Container.get(PromotionsService);
	}

	private async changeService() {
		this.assertModuleActive();
		const { PromotionChangeService } = await import(
			'@/modules/promotions.ee/promotion-change.service.js'
		);
		return Container.get(PromotionChangeService);
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

	private resolveDiscoveryPage(query: { cursor?: string; limit: number }) {
		const page = this.resolvePage(query);
		const limit = Math.min(page.limit, MAX_PROMOTION_DISCOVERY_ITEMS_PER_PAGE);
		// GitLab uses page numbers, so the offset must start a complete page.
		if (
			!Number.isSafeInteger(page.offset) ||
			(query.cursor && page.limit > MAX_PROMOTION_DISCOVERY_ITEMS_PER_PAGE) ||
			page.offset % limit !== 0
		) {
			throw new BadRequestError('An invalid cursor was provided');
		}
		return { offset: page.offset, limit };
	}
}

/** An unknown direction addresses nothing, so it is a 404 rather than a 400. */
function parseDirection(value: string): PromotionDirection {
	const parsed = promotionDirectionSchema.safeParse(value);
	if (!parsed.success) throw new NotFoundError(`Unknown promotion direction: ${value}`);
	return parsed.data;
}
