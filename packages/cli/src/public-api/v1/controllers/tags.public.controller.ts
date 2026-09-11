import {
	CreateTagPublicDto,
	ListTagsQueryDto,
	TagListPublicDto,
	TagPublicDto,
	UpdatedTagPublicDto,
	UpdateTagPublicDto,
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

/** `createdAt` is insert-only, so the row an update writes back leaves it unset. */
const toUpdatedTagPublicDto = ({
	id,
	name,
	createdAt,
	updatedAt,
}: TagEntity): UpdatedTagPublicDto => ({
	id,
	name,
	...(createdAt ? { createdAt: createdAt.toISOString() } : {}),
	updatedAt: updatedAt.toISOString(),
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
		const tag = this.tagService.toEntity({ name: body.name });

		return toTagPublicDto(await this.save(tag, 'create'));
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
		return toTagPublicDto(await this.findOrNotFound(tagId));
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
		await this.findOrNotFound(tagId);

		const tag = this.tagService.toEntity({ id: tagId, name: body.name });

		return toUpdatedTagPublicDto(await this.save(tag, 'update'));
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
		const tag = await this.findOrNotFound(tagId);

		await this.tagService.delete(tagId);

		return toTagPublicDto(tag);
	}

	private async findOrNotFound(tagId: string): Promise<TagEntity> {
		try {
			return await this.tagService.getById(tagId);
		} catch {
			throw new NotFoundError('Not Found');
		}
	}

	/** The unique index on `name` is the only expected failure, so any save error is a conflict. */
	private async save(tag: TagEntity, action: 'create' | 'update'): Promise<TagEntity> {
		try {
			return await this.tagService.save(tag, action);
		} catch {
			throw new ConflictError('Tag already exists');
		}
	}
}
