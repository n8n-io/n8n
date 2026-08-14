import {
	ConnectGitConnectionDto,
	CreateGitConnectionDto,
	GitConnectionListPublicDto,
	GitConnectionPublicDto,
	ListGitConnectionsQueryDto,
	UpdateGitConnectionDto,
} from '@n8n/api-types';
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
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { GitConnectionsPublicApiService } from '@/public-api/v1/services/git-connections-public-api.service';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';

const tags = ['Git connections'];

@PublicApiController('/git-connections')
export class GitConnectionsPublicController {
	constructor(private readonly gitConnections: GitConnectionsPublicApiService) {}

	@Post('/')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('Create a Git connection')
	@ApiDescription('Creates a Git connection and its authentication material.')
	@ApiTags(tags)
	@ApiResponse(201, GitConnectionPublicDto)
	async create(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body input: CreateGitConnectionDto,
	): Promise<GitConnectionPublicDto> {
		return await this.gitConnections.create(input);
	}

	@Get('/')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('List Git connections')
	@ApiDescription('Returns a cursor-paginated list of Git connections.')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionListPublicDto)
	async list(
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
		}
		const { data, count } = await this.gitConnections.list(offset, limit);
		return {
			data,
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/:id')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('Retrieve a Git connection')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async get(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<GitConnectionPublicDto> {
		return await this.gitConnections.findOne(id);
	}

	@Put('/:id')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('Update a Git connection')
	@ApiDescription('Updates only the supplied fields. Secrets are never returned.')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async update(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body input: UpdateGitConnectionDto,
	): Promise<GitConnectionPublicDto> {
		return await this.gitConnections.update(id, input);
	}

	@Post('/:id/connect')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('Connect a Git connection')
	@ApiDescription('Clones the repository into local storage. Safe to call repeatedly.')
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async connect(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body input: ConnectGitConnectionDto,
	): Promise<GitConnectionPublicDto> {
		return await this.gitConnections.connect(id, input.branchName);
	}

	@Post('/:id/disconnect')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('Disconnect a Git connection')
	@ApiDescription(
		'Removes the local clone. The connection and its authentication material are retained.',
	)
	@ApiTags(tags)
	@ApiResponse(200, GitConnectionPublicDto)
	@ApiErrorResponse(404)
	async disconnect(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<GitConnectionPublicDto> {
		return await this.gitConnections.disconnect(id);
	}

	@Delete('/:id')
	@ApiKeyScope('sourceControl:pull')
	@GlobalScope('sourceControl:manage')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiSummary('Delete a Git connection')
	@ApiDescription('Deletes a Git connection and its local files.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async delete(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string): Promise<void> {
		await this.gitConnections.delete(id);
	}
}
