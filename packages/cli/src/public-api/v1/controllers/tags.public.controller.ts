import { ListTagsQueryDto, TagListPublicDto, TagPublicDto, tagIdParamSchema } from '@n8n/api-types';
import type { AuthenticatedRequest, TagEntity } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Delete,
	Get,
	Param,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { TagService } from '@/services/tag.service';

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

	@Delete('/:tagId')
	@ApiKeyScope('tag:delete')
	@ApiSummary('Delete a tag')
	@ApiDescription('Deletes a tag.')
	@ApiTags(['Tags'])
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
