import {
	CreateTagPublicDto,
	ListTagsQueryDto,
	TagListPublicDto,
	TagPublicDto,
	UpdateTagPublicDto,
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
import { TagService } from '@/services/tag.service';

const tags = ['Tags'];

const toTagPublicDto = (tag: TagEntity): TagPublicDto => ({
	id: tag.id,
	name: tag.name,
	createdAt: tag.createdAt.toISOString(),
	updatedAt: tag.updatedAt.toISOString(),
});

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
	@ApiTags(tags)
	@ApiResponse(201, TagPublicDto)
	@ApiErrorResponse(409)
	async createTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateTagPublicDto,
	): Promise<TagPublicDto> {
		const newTag = this.tagService.toEntity({ name: body.name });

		try {
			return toTagPublicDto(await this.tagService.save(newTag, 'create'));
		} catch {
			throw new ConflictError('Tag already exists');
		}
	}

	@Get('/:tagId')
	@ApiKeyScope('tag:read')
	@ApiSummary('Retrieves a tag')
	@ApiDescription('Retrieves a tag.')
	@ApiTags(tags)
	@ApiResponse(200, TagPublicDto)
	@ApiErrorResponse(404)
	async getTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('tagId', tagIdParamSchema) tagId: string,
	): Promise<TagPublicDto> {
		let tag: TagEntity;

		try {
			tag = await this.tagService.getById(tagId);
		} catch {
			throw new NotFoundError('Not Found');
		}

		return toTagPublicDto(tag);
	}

	@Put('/:tagId')
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
		@Param('tagId', tagIdParamSchema) tagId: string,
		@Body body: UpdateTagPublicDto,
	): Promise<UpdatedTagPublicDto> {
		try {
			await this.tagService.getById(tagId);
		} catch {
			throw new NotFoundError('Not Found');
		}

		const tag = this.tagService.toEntity({ id: tagId, name: body.name.trim() });

		let updatedTag: TagEntity;
		try {
			updatedTag = await this.tagService.save(tag, 'update');
		} catch {
			throw new ConflictError('Tag already exists');
		}

		return {
			id: updatedTag.id,
			name: updatedTag.name,
			...(updatedTag.createdAt ? { createdAt: updatedTag.createdAt.toISOString() } : {}),
			...(updatedTag.updatedAt ? { updatedAt: updatedTag.updatedAt.toISOString() } : {}),
		};
	}

	@Delete('/:tagId')
	@ApiKeyScope('tag:delete')
	@ApiSummary('Delete a tag')
	@ApiDescription('Deletes a tag.')
	@ApiTags(tags)
	@ApiResponse(200, TagPublicDto)
	@ApiErrorResponse(404)
	async deleteTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('tagId', tagIdParamSchema) tagId: string,
	): Promise<TagPublicDto> {
		let tag: TagEntity;

		try {
			tag = await this.tagService.getById(tagId);
		} catch {
			throw new NotFoundError('Not Found');
		}

		await this.tagService.delete(tagId);

		return toTagPublicDto(tag);
	}
}
