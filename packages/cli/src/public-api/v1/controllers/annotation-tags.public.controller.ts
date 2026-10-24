import {
	CreateTagPublicDto,
	ListTagsQueryDto,
	TagListPublicDto,
	TagPublicDto,
} from '@n8n/api-types';
import { isUniqueConstraintError } from '@n8n/db';
import type { AuthenticatedRequest } from '@n8n/db';
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
import { ConflictError } from '@n8n/errors';
import type { Response } from 'express';

import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { AnnotationTagService } from '@/services/annotation-tag.service.ee';

const tags = ['Executions'];

const toTagPublicDto = (tag: {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}): TagPublicDto => ({
	id: tag.id,
	name: tag.name,
	createdAt: tag.createdAt.toISOString(),
	updatedAt: tag.updatedAt.toISOString(),
});

@PublicApiController('/annotation-tags')
export class AnnotationTagsPublicController {
	constructor(private readonly annotationTagService: AnnotationTagService) {}

	@Get('/')
	@ApiKeyScope('annotationTag:list')
	@ApiSummary('Retrieve all annotation tags')
	@ApiDescription(
		'Retrieve all annotation tags from your instance. Use the IDs of these tags to assign them to executions.',
	)
	@ApiTags(tags)
	@ApiResponse(200, TagListPublicDto)
	async getAnnotationTags(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListTagsQueryDto,
	): Promise<TagListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { data, count } = await this.annotationTagService.getPaginated({ offset, limit });

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
	@ApiKeyScope('annotationTag:create')
	@ApiSummary('Create an annotation tag')
	@ApiDescription(
		'Create an annotation tag in your instance. Assign the tag to an execution with the execution tags endpoint.',
	)
	@ApiTags(tags)
	@ApiResponse(201, TagPublicDto)
	@ApiErrorResponse(409)
	async createAnnotationTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateTagPublicDto,
	): Promise<TagPublicDto> {
		const newTag = this.annotationTagService.toEntity({ name: body.name });

		try {
			return toTagPublicDto(await this.annotationTagService.save(newTag));
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new ConflictError('Tag already exists');
			throw error;
		}
	}
}
