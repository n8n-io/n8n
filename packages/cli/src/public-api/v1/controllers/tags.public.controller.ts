import {
	CreateTagPublicDto,
	ListTagsQueryDto,
	TagListPublicDto,
	TagPublicDto,
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
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
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
			// Every save failure answers 409, an entity validation failure included. The published
			// endpoint replies the same way, so keep it until a follow-up ticket changes the contract.
			throw new ConflictError('Tag already exists');
		}
	}
}
