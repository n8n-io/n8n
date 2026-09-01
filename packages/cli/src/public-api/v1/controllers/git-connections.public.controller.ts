import {
	CloneGitConnectionDto,
	CreateGitConnectionDto,
	GitConnectionListPublicDto,
	GitConnectionProjectListPublicDto,
	GitConnectionProjectPublicDto,
	GitConnectionPublicDto,
	GitConnectionPullResultDto,
	GitConnectionPushResultDto,
	ListGitConnectionsQueryDto,
	MAX_ITEMS_PER_PAGE,
	PushGitConnectionDto,
	UpdateGitConnectionDto,
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
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';

const tags = ['GitConnections'];

@PublicApiController('/git-connections')
export class GitConnectionsPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async gitConnectionsService() {
		if (!this.moduleRegistry.isActive('git-connections')) {
			throw new ServiceUnavailableError('Git connections module is not enabled');
		}
		const { GitConnectionsService } = await import(
			'@/modules/git-connections.ee/git-connections.service.js'
		);
		return Container.get(GitConnectionsService);
	}

	@Post('/')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:create')
	@GlobalScope('gitConnection:create')
	@ApiSummary('Create a Git connection')
	@ApiDescription(
		'Creates a Git connection and its authentication material. Only one Git connection can exist.',
	)
	@ApiTags(tags)
	@ApiResponse(201, GitConnectionPublicDto)
	@ApiErrorResponse(409)
	async createGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreateGitConnectionDto,
	): Promise<GitConnectionPublicDto> {
		return await (await this.gitConnectionsService()).create(input);
	}

	@Get('/')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:list')
	@GlobalScope('gitConnection:list')
	@ApiSummary('List Git connections')
	@ApiDescription('Returns a cursor-paginated list of Git connections.')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionListPublicDto)
	async getGitConnections(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListGitConnectionsQueryDto,
	): Promise<GitConnectionListPublicDto> {
		let offset = 0;
		let { limit } = query;
		if (query.cursor) {
			try {
				const cursor = decodeCursor(query.cursor);
				if (!('offset' in cursor)) throw new BadRequestError('An invalid cursor was provided');
				offset = cursor.offset;
				limit = cursor.limit;
			} catch (error) {
				if (error instanceof BadRequestError) throw error;
				throw new BadRequestError('An invalid cursor was provided');
			}
			// A cursor is unsigned base64 the client can forge, so re-validate the
			// bounds already enforced on the raw query params before hitting the DB.
			if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
				throw new BadRequestError('An invalid cursor was provided');
			}
			limit = Math.min(limit, MAX_ITEMS_PER_PAGE);
		}
		const { data, count } = await (await this.gitConnectionsService()).list(offset, limit);
		return {
			data,
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('Retrieve a Git connection')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async getGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<GitConnectionPublicDto> {
		return await (await this.gitConnectionsService()).findOne(id);
	}

	@Put('/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Update a Git connection')
	@ApiDescription('Updates only the supplied fields. Secrets are never returned.')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async updateGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body input: UpdateGitConnectionDto,
	): Promise<GitConnectionPublicDto> {
		return await (await this.gitConnectionsService()).update(id, input);
	}

	@Post('/:id/clone')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:clone')
	@GlobalScope('gitConnection:clone')
	@ApiSummary('Clone a Git connection')
	@ApiDescription('Clones the repository into local storage. Safe to call repeatedly.')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async cloneGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body input: CloneGitConnectionDto,
	): Promise<GitConnectionPublicDto> {
		return await (await this.gitConnectionsService()).clone(id, input.branchName);
	}

	@Post('/:id/disconnect')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:clone')
	@GlobalScope('gitConnection:clone')
	@ApiSummary('Disconnect a Git connection')
	@ApiDescription(
		'Removes the local clone. The connection and its authentication material are retained.',
	)
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async disconnectGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<GitConnectionPublicDto> {
		return await (await this.gitConnectionsService()).disconnect(id);
	}

	@Delete('/:id')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:delete')
	@GlobalScope('gitConnection:delete')
	@ApiSummary('Delete a Git connection')
	@ApiDescription('Deletes a Git connection and its local files.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<void> {
		await (await this.gitConnectionsService()).delete(id);
	}

	@Post('/:id/push')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:push')
	@GlobalScope('gitConnection:push')
	@ApiSummary('Push all team projects to a Git connection')
	@ApiDescription(
		'Exports all team projects, commits them, and pushes to the configured branch — or to a new timestamped branch when the connection has `createBranchOnPromotion` enabled. The response reports the branch in `branchName`. Personal projects are ignored. Requires the repository to be cloned first.',
	)
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPushResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async pushGitConnectionProjects(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body input: PushGitConnectionDto,
	): Promise<GitConnectionPushResultDto> {
		return await (await this.gitConnectionsService()).push(id, req.user, input);
	}

	@Get('/:id/projects')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('List projects added to a Git connection')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionProjectListPublicDto)
	@ApiErrorResponse(404)
	async getGitConnectionProjects(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<GitConnectionProjectListPublicDto> {
		return await (await this.gitConnectionsService()).listProjects(id);
	}

	@Post('/:id/projects/:projectId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:manageProjects')
	@GlobalScope('gitConnection:manageProjects')
	@ApiSummary('Add a project to a Git connection')
	@ApiDescription(
		'Adds a team project to the connection. A project can be added to only one connection.',
	)
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionProjectPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async addProjectToGitConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Param('projectId') projectId: string,
	): Promise<GitConnectionProjectPublicDto> {
		return await (await this.gitConnectionsService()).addProject({
			user: req.user,
			connectionId: id,
			projectId,
		});
	}

	@Delete('/:id/projects/:projectId')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:manageProjects')
	@GlobalScope('gitConnection:manageProjects')
	@ApiSummary('Remove a project from a Git connection')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async removeProjectFromGitConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Param('projectId') projectId: string,
	): Promise<void> {
		await (await this.gitConnectionsService()).removeProject({
			user: req.user,
			connectionId: id,
			projectId,
		});
	}

	@Post('/:id/pull')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:pull')
	@GlobalScope('gitConnection:pull')
	@ApiSummary('Pull projects from a Git connection')
	@ApiDescription(
		'Resets the local clone to the configured branch tip and imports projects into the instance, overwriting to match. Requires the repository to be cloned first.',
	)
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPullResultDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(422)
	@ApiErrorResponse(503)
	async pullGitConnectionProjects(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<GitConnectionPullResultDto> {
		return await (await this.gitConnectionsService()).pull(id, req.user);
	}
}
