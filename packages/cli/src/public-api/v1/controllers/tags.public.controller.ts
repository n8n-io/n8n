import {
	ListTagsQueryDto,
	TagListPublicDto,
	TagPublicDto,
	TagWritePublicDto,
	UpdatedTagPublicDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, TagEntity } from '@n8n/db';
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
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { TagService } from '@/services/tag.service';

@PublicApiController('/tags')
export class TagsPublicController {
	constructor(private readonly tagService: TagService) {}

	@Get('/')
	@ApiKeyScope('tag:list')
	@ApiSummary('Retrieve all tags')
	@ApiDescription('Retrieve all tags from your instance.')
	@ApiTags(['Tags'])
	@ApiResponse(200, TagListPublicDto)
	async getTags(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListTagsQueryDto,
	): Promise<TagListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { data, count } = await this.tagService.getPaginated({ offset, limit });

		return {
			data: data.map(toTagPublicDto),
			nextCursor: encodeNextCursor({
				offset,
				limit,
				numberOfTotalRecords: count,
			}),
		};
	}

	@Post('/')
	@ApiKeyScope('tag:create')
	@ApiSummary('Create a tag')
	@ApiDescription('Create a tag in your instance.')
	@ApiTags(['Tags'])
	@ApiResponse(201, TagPublicDto)
	@ApiErrorResponse(409)
	async createTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: TagWritePublicDto,
	): Promise<TagPublicDto> {
		const tag = this.tagService.toEntity({ name: payload.name });

		return toTagPublicDto(await this.saveOrConflict(tag, 'create'));
	}

	@Get('/:id')
	@ApiKeyScope('tag:read')
	@ApiSummary('Retrieves a tag')
	@ApiDescription('Retrieves a tag.')
	@ApiTags(['Tags'])
	@ApiResponse(200, TagPublicDto)
	@ApiErrorResponse(404)
	async getTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<TagPublicDto> {
		return toTagPublicDto(await this.getByIdOrNotFound(id));
	}

	@Put('/:id')
	@ApiKeyScope('tag:update')
	@ApiSummary('Update a tag')
	@ApiDescription('Update a tag.')
	@ApiTags(['Tags'])
	@ApiResponse(200, UpdatedTagPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: TagWritePublicDto,
	): Promise<UpdatedTagPublicDto> {
		await this.getByIdOrNotFound(id);

		const tag = this.tagService.toEntity({ id, name: payload.name });

		return toUpdatedTagPublicDto(await this.saveOrConflict(tag, 'update'));
	}

	@Delete('/:id')
	@ApiKeyScope('tag:delete')
	@ApiSummary('Delete a tag')
	@ApiDescription('Deletes a tag.')
	@ApiTags(['Tags'])
	@ApiResponse(200, TagPublicDto)
	@ApiErrorResponse(404)
	async deleteTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<TagPublicDto> {
		const tag = await this.getByIdOrNotFound(id);

		await this.tagService.delete(id);

		return toTagPublicDto(tag);
	}

	private async getByIdOrNotFound(id: string): Promise<TagEntity> {
		try {
			return await this.tagService.getById(id);
		} catch {
			throw new NotFoundError('Not Found');
		}
	}

	/**
	 * A duplicate name is the failure a caller can act on, so the save reports every failure as a
	 * conflict - including the entity validation the service runs, which is how this endpoint has
	 * always answered a name that is empty or too long.
	 */
	private async saveOrConflict(tag: TagEntity, action: 'create' | 'update'): Promise<TagEntity> {
		try {
			return await this.tagService.save(tag, action);
		} catch {
			throw new ConflictError('Tag already exists');
		}
	}
}

function toTagPublicDto(tag: TagEntity): TagPublicDto {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}

function toUpdatedTagPublicDto(tag: TagEntity): UpdatedTagPublicDto {
	return {
		id: tag.id,
		name: tag.name,
		// An update saves only the fields it changes, so the saved value carries no `createdAt`.
		// The key stays out of the response, rather than becoming `null`.
		...(tag.createdAt ? { createdAt: tag.createdAt.toISOString() } : {}),
		updatedAt: tag.updatedAt.toISOString(),
	};
}
