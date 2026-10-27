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
	PromotionChangesDto,
	PromotionChangesQueryDto,
	PromotionCheckoutPublicDto,
	PromotionEnvironmentListPublicDto,
	PromotionEnvironmentProjectListPublicDto,
	PromotionEnvironmentProjectPublicDto,
	PromotionEnvironmentPublicDto,
	PromotionProviderCreatedPublicDto,
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	PromotionRepositoryListPublicDto,
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
} from '@n8n/decorators';
import { Container } from '@n8n/di';
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

/**
 * Providers hold credentials. An environment points at a remote for one direction
 * and holds the settings of that direction.
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
		'Creates a provider and its authentication material. A Git host provider validates authenticated API access before it saves. For GitLab, the service uses n8n as the Git transport username. Its auth.username is optional. The service ignores any supplied username. Plain Git token authentication requires auth.username. An SSH provider returns the generated public key; add it to the remote as a deploy key.',
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
	@ApiDescription(
		'Returns a cursor-paginated list of providers, without their public configuration.',
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
		@Param('promotionProviderId', promotionProviderIdParamSchema)
		promotionProviderId: string,
	): Promise<PromotionProviderPublicDto> {
		return await (await this.providersService()).findOne(promotionProviderId);
	}

	@Put('/providers/:promotionProviderId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Update a promotion provider')
	@ApiDescription(
		'Renames the provider, and replaces its credentials when `auth` is sent. A Git host provider can also update its base URL. A different API destination requires `auth` in the same request. Changed credentials and host settings are validated before they save. If another request changes the credentials or configuration before this update saves, the update returns 409. Reload the provider and try again. For GitLab, the service uses n8n as the Git transport username. Its auth.username is optional. The service ignores any supplied username. Plain Git token authentication requires auth.username. New credentials apply to every environment that uses this provider. The authentication method cannot change.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionProviderPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async updatePromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema)
		promotionProviderId: string,
		@Body input: UpdatePromotionProviderDto,
	): Promise<PromotionProviderPublicDto> {
		return await (await this.providersService()).update(promotionProviderId, input);
	}

	@Delete('/providers/:promotionProviderId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:delete')
	@GlobalScope('gitConnection:delete')
	@ApiSummary('Delete a promotion provider')
	@ApiDescription('A provider used by an environment cannot be deleted.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async deletePromotionProvider(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionProviderId', promotionProviderIdParamSchema)
		promotionProviderId: string,
	): Promise<void> {
		await (await this.providersService()).delete(promotionProviderId);
	}

	@Get('/providers/:promotionProviderId/repositories')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:discover')
	@GlobalScope('gitConnection:discover')
	@ApiSummary('List repositories of a promotion provider')
	@ApiDescription(
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:discover')
	@GlobalScope('gitConnection:discover')
	@ApiSummary('List branches of a promotion repository')
	@ApiDescription(
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:create')
	@GlobalScope('gitConnection:create')
	@ApiSummary('Create a promotion environment')
	@ApiDescription(
		'Creates an environment for one direction on an existing provider. The settings must match the direction. A GitLab remote URL must belong to the saved provider. The environment stores only the repository path and derives remoteUrl from the current provider base URL. Plain Git environments keep the full remote URL. The instance can have one environment for each direction.',
	)
	@ApiTags(tags)
	@ApiResponse(201, PromotionEnvironmentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async createPromotionEnvironment(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreatePromotionEnvironmentDto,
	): Promise<PromotionEnvironmentPublicDto> {
		return await (await this.environmentsService()).create(input);
	}

	@Get('/environments')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:list')
	@GlobalScope('gitConnection:list')
	@ApiSummary('List promotion environments')
	@ApiDescription(
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('Retrieve a promotion environment')
	@ApiDescription(
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Update a promotion environment')
	@ApiDescription(
		'Updates the name, provider, remote, or settings. A remote replaces the whole saved remote, and settings replace the whole saved settings. The settings must match the direction of the environment, so `createBranchOnPromotion` is always required for Promote. GitLab environments store a repository path and derive remoteUrl from the provider. Plain Git environments keep the full remote URL. If the provider changes during the update, the update returns 409. Reload the environment and try again. Direction and scope cannot change.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionEnvironmentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async updatePromotionEnvironment(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
		@Body input: UpdatePromotionEnvironmentDto,
	): Promise<PromotionEnvironmentPublicDto> {
		return await (await this.environmentsService()).update(promotionEnvironmentId, input);
	}

	@Delete('/environments/:promotionEnvironmentId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:delete')
	@GlobalScope('gitConnection:delete')
	@ApiSummary('Delete a promotion environment')
	@ApiDescription(
		'Deletes the environment with its project links and local checkout. Its provider is kept. Nothing in Git changes.',
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async deletePromotionEnvironment(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<void> {
		await (await this.environmentsService()).delete(promotionEnvironmentId);
	}

	// -- Local checkouts -----------------------------------------------------

	@Post('/environments/:promotionEnvironmentId/connect')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:clone')
	@GlobalScope('gitConnection:clone')
	@ApiSummary('Connect an environment')
	@ApiDescription(
		'Prepares the environment on the instance that handles the request. For a Git provider, this clones the configured branch into local storage. Safe to call repeatedly. Connecting one environment does not make another ready.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionCheckoutPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async connectPromotionCheckout(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionEnvironmentId', promotionEnvironmentIdParamSchema)
		promotionEnvironmentId: string,
	): Promise<PromotionCheckoutPublicDto> {
		return await (await this.promotionsService()).clone(promotionEnvironmentId);
	}

	@Post('/environments/:promotionEnvironmentId/disconnect')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:clone')
	@GlobalScope('gitConnection:clone')
	@ApiSummary("Remove an environment's local checkout")
	@ApiDescription(
		'Removes the local checkout and keeps the environment, its credentials, and the trusted SSH host keys.',
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('List projects linked to a promotion environment')
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

	@Post('/environments/:promotionEnvironmentId/projects/:projectId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:manageProjects')
	@GlobalScope('gitConnection:manageProjects')
	@ApiSummary('Link a project to a promotion environment')
	@ApiDescription(
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:manageProjects')
	@GlobalScope('gitConnection:manageProjects')
	@ApiSummary('Unlink a project from a promotion environment')
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:push')
	@GlobalScope('gitConnection:push')
	@ApiSummary('Promote all team projects')
	@ApiDescription(
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:pull')
	@GlobalScope('gitConnection:pull')
	@ApiSummary('Apply a package to the instance')
	@ApiDescription(
		'Checks the full package at the configured branch tip. Optionally send expectedSource with the environmentId, branchName, and full commitSha from the reviewed change preview; status `source-changed` means the branch moved since that review and nothing was imported. Returns status `blocked` before import writes if bindings need setup or if the apply would delete team projects that the package does not hold. Retain environmentId and git for Continue. Status `applied` includes counts and warnings. Inspect status before reading counts. Existing target variable values, including empty strings, are preserved. Workflows and folders move within their project to match the branch, and folders take the name on the branch; a workflow or folder that the branch and the instance hold in different projects is refused with 409 before any write. Requires a connected Apply environment with instance scope. The API key needs the gitConnection:pull scope. The importer checks user write permissions; granular API-key write scopes are not passed to it.',
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
		return await (await this.promotionsService()).apply(
			promotionEnvironmentId,
			req.user,
			input.expectedSource,
		);
	}

	@Post('/environments/:promotionEnvironmentId/apply/continue')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:pull')
	@GlobalScope('gitConnection:pull')
	@ApiSummary('Continue Apply after binding setup')
	@ApiDescription(
		'Rechecks the configured source and current target bindings. Send expectedSource with the environmentId, branchName, and full commitSha from the reviewed Apply result. Send `confirmDestructiveChanges: true` to also apply destructive data table changes and delete the reported team projects. Status `source-changed` requires a new Apply review. Status `blocked` returns fresh binding details without import writes. Status `applied` includes counts and warnings. Inspect status before reading counts. Existing target variable values are preserved. Requires the same connected instance environment and permissions as Apply. The importer checks user write permissions; granular API-key write scopes are not passed to it. No server session or exactly-once guarantee is provided.',
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

	@Get('/projects/:projectId/changes/:direction')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope({ anyOf: ['gitConnection:push', 'gitConnection:pull'] })
	@ApiSummary('List the changes of a project in one direction')
	@ApiDescription(
		'Compares a team project on this instance with the branch of its promotion environment for that direction and lists the workflows that differ. For `promote` the rows are what a promotion sends to the branch, and the key needs the gitConnection:push scope. A `deleted` or `new` promote row can be a workflow that moved between projects; promoting it is refused until it moves back. For `apply` the rows are what applying the branch changes on this instance, and the key needs the gitConnection:pull scope. `commitSha` is the commit the rows were read from. Requires the environment to be connected first.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PromotionChangesDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getPromotionChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('direction', promotionDirectionParamSchema) direction: string,
		@Query query: PromotionChangesQueryDto,
	): Promise<PromotionChangesDto> {
		const parsedDirection = parseDirection(direction);
		// The route accepts a key with either scope. The direction decides which one this call needs.
		const requiredScope = parsedDirection === 'apply' ? 'gitConnection:pull' : 'gitConnection:push';
		if (!(req.tokenGrant?.apiKeyScopes?.includes(requiredScope) ?? false)) {
			throw new ForbiddenError(
				`The ${parsedDirection} direction requires the ${requiredScope} scope`,
			);
		}
		return await (await this.changeService()).getChanges(
			req.user,
			projectId,
			parsedDirection,
			query,
		);
	}

	// -- Selective promote ---------------------------------------------------

	@Post('/projects/:projectId/promote')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:push')
	@GlobalScope('gitConnection:push')
	@ApiSummary("Promote a selection of a project's workflows")
	@ApiDescription(
		"Promotes a chosen set of a team project's workflows to the branch of the project's Promote environment. Send workflow ids only; the server reads each one now, so the push carries the current state. Live and archived workflows the project owns are exported, so an archived id stays on the branch as archived; an id whose workflow is gone from the instance leaves the branch, matching the project's change list. A workflow that moved into or out of the project since the branch was written is refused with 400; move it back first. A deletion the branch does not hold under this project rejects the whole request before any write. Requires a Promote environment to resolve for the project (its own Promote environment, otherwise the instance Promote environment), and requires it to be connected first. The API key also needs variable:list when the workflows reference variables.",
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:pull')
	@GlobalScope('gitConnection:pull')
	@ApiSummary("Apply a selection of a project's workflows")
	@ApiDescription(
		"Applies selected workflow changes from the project's Apply branch. Send the selected change-list IDs in workflowIds. The server imports IDs present on the branch for this project. It removes instance workflows owned by this project when their IDs are absent from the branch. Duplicate or invalid IDs reject the whole request. Unselected content stays unchanged. A selected workflow moves within the project to match the branch, together with the folders that hold it, and those folders take the name on the branch; other folders stay as they are. A selected workflow, or a folder the branch holds in this project, that the branch and the instance hold in different projects is refused with 409 before any write. Optionally send expectedSource with the environmentId, branchName, and full commitSha from the reviewed change preview. Status `source-changed` means the source changed since that review and nothing was imported. Status `blocked` returns binding details before import writes when the selection needs binding setup. Retain environmentId and git for Continue. Status `applied` includes counts and warnings. Inspect status before reading counts. Requires a connected Apply environment for the project: its own Apply environment, otherwise the instance Apply environment. The API key needs the gitConnection:pull scope. The importer checks user write permissions.",
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
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:pull')
	@GlobalScope('gitConnection:pull')
	@ApiSummary('Continue applying a selection after binding setup')
	@ApiDescription(
		"Rechecks the project's Apply source and the current bindings for the selection. Resend the full selection in workflowIds. Send the required expectedSource with the environmentId, branchName, and full commitSha from the reviewed Apply result. Send `confirmDestructiveChanges: true` to also apply destructive data table changes. The server does not keep a session. Status `source-changed` requires a new Apply review. Status `blocked` returns fresh binding details before import writes. Status `applied` includes counts and warnings. Inspect status before reading counts. Unselected content stays unchanged. Requires the same connected Apply environment and permissions as the initial selection apply. The API key needs the gitConnection:pull scope. The importer checks user write permissions.",
	)
	@ApiTags(tags)
	@ApiResponse(200, ApplyPackageResultDto)
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
