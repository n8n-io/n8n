import {
	CreateOrUpdateTagPublicDto,
	ListTagsQueryDto,
	TagListPublicDto,
	TagPublicDto,
	UpdatedTagPublicDto,
	tagIdParamSchema,
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
import { toPublicTag } from '@/public-api/v1/shared/tag.mapper';
import { TagService } from '@/services/tag.service';

const tags = ['Tags'];

@PublicApiController('/tags')
export class TagsPublicController {
	constructor(private readonly tagService: TagService) {}

	@Get('/')
	@ApiKeyScope('tag:list')
	@ApiSummary('Retrieve all tags')
	@ApiDescription('Retrieve all tags from your instance.')
	@ApiTags(tags)
	@ApiResponse(200, TagListPublicDto)
	async getTags(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListTagsQueryDto,
	): Promise<TagListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { data, count } = await this.tagService.getPaginated({ offset, limit });

		return {
			data: data.map(toPublicTag),
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
	@ApiTags(tags)
	@ApiResponse(201, TagPublicDto)
	@ApiErrorResponse(409)
	async createTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateOrUpdateTagPublicDto,
	): Promise<TagPublicDto> {
		const newTag = this.tagService.toEntity({ name: body.name });

		return toPublicTag(await this.saveOrConflict(newTag, 'create'));
	}

	@Get('/:id')
	@ApiKeyScope('tag:read')
	@ApiSummary('Retrieves a tag')
	@ApiDescription('Retrieves a tag.')
	@ApiTags(tags)
	@ApiResponse(200, TagPublicDto)
	@ApiErrorResponse(404)
	async getTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', tagIdParamSchema) id: string,
	): Promise<TagPublicDto> {
		return toPublicTag(await this.getTagOrNotFound(id));
	}

	@Put('/:id')
	@ApiKeyScope('tag:update')
	@ApiSummary('Update a tag')
	@ApiDescription('Update a tag.')
	@ApiTags(tags)
	@ApiResponse(200, UpdatedTagPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', tagIdParamSchema) id: string,
		@Body body: CreateOrUpdateTagPublicDto,
	): Promise<UpdatedTagPublicDto> {
		await this.getTagOrNotFound(id);

		const updateTag = this.tagService.toEntity({ id, name: body.name });
		const updatedTag = await this.saveOrConflict(updateTag, 'update');

		return {
			id: updatedTag.id,
			name: updatedTag.name,
			// An update writes the row without reading it back, so the entity carries no `createdAt`
			// and the answer has never held one.
			...(updatedTag.createdAt ? { createdAt: updatedTag.createdAt.toISOString() } : {}),
			updatedAt: updatedTag.updatedAt.toISOString(),
		};
	}

	@Delete('/:id')
	@ApiKeyScope('tag:delete')
	@ApiSummary('Delete a tag')
	@ApiDescription('Deletes a tag.')
	@ApiTags(tags)
	@ApiResponse(200, TagPublicDto)
	@ApiErrorResponse(404)
	async deleteTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', tagIdParamSchema) id: string,
	): Promise<TagPublicDto> {
		const tag = await this.getTagOrNotFound(id);

		await this.tagService.delete(id);

		return toPublicTag(tag);
	}

	private async getTagOrNotFound(id: string): Promise<TagEntity> {
		try {
			return await this.tagService.getById(id);
		} catch {
			throw new NotFoundError('Not Found');
		}
	}

	/** A name the entity rejects reaches the caller as a conflict too, as it always has. */
	private async saveOrConflict(tag: TagEntity, action: 'create' | 'update'): Promise<TagEntity> {
		try {
			return await this.tagService.save(tag, action);
		} catch {
			throw new ConflictError('Tag already exists');
		}
	}
}
