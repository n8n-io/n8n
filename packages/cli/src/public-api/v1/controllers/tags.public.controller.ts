import {
	ListTagsQueryDto,
	TagListPublicDto,
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
	Get,
	Param,
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
			data: data.map((tag) => ({
				...tag,
				createdAt: tag.createdAt.toISOString(),
				updatedAt: tag.updatedAt.toISOString(),
			})),
			nextCursor: encodeNextCursor({
				offset,
				limit,
				numberOfTotalRecords: count,
			}),
		};
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

		// Every write failure answers 409, including a name the tag service rejects. This repeats what
		// the endpoint published before the migration.
		let updatedTag: TagEntity;
		try {
			updatedTag = await this.tagService.save(tag, 'update');
		} catch {
			throw new ConflictError('Tag already exists');
		}

		return {
			id: updatedTag.id,
			name: updatedTag.name,
			// The write returns only the columns it touched, so `createdAt` is normally absent.
			...(updatedTag.createdAt ? { createdAt: updatedTag.createdAt.toISOString() } : {}),
			updatedAt: updatedTag.updatedAt.toISOString(),
		};
	}
}
