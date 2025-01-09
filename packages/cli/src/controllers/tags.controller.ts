import { CreateOrUpdateTagRequestDto, RetrieveTagQueryDto } from '@n8n/api-types';
import { Response } from 'express';

import {
	Delete,
	Get,
	Patch,
	Post,
	RestController,
	GlobalScope,
	Body,
	Param,
	Query,
} from '@/decorators';
import { AuthenticatedRequest } from '@/requests';
import { TagService } from '@/services/tag.service';

@RestController('/tags')
export class TagsController {
	constructor(private readonly tagService: TagService) {}

	@Get('/')
	@GlobalScope('tag:list')
	async getAll(_req: AuthenticatedRequest, _res: Response, @Query query: RetrieveTagQueryDto) {
		return await this.tagService.getAll({ withUsageCount: query.withUsageCount });
	}

	@Post('/')
	@GlobalScope('tag:create')
	async createTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateOrUpdateTagRequestDto,
	) {
		const { name } = payload;
		const tag = this.tagService.toEntity({ name });

		return await this.tagService.save(tag, 'create');
	}

	@Patch('/:id(\\w+)')
	@GlobalScope('tag:update')
	async updateTag(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') tagId: string,
		@Body payload: CreateOrUpdateTagRequestDto,
	) {
		const newTag = this.tagService.toEntity({ id: tagId, name: payload.name });

		return await this.tagService.save(newTag, 'update');
	}

	@Delete('/:id(\\w+)')
	@GlobalScope('tag:delete')
	async deleteTag(_req: AuthenticatedRequest, _res: Response, @Param('id') tagId: string) {
		await this.tagService.delete(tagId);
		return true;
	}
}
