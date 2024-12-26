import { UpdateTagRequestDto, CreateTagRequestDto } from '@n8n/api-types';
import { RetrieveTagQueryDto } from '@n8n/api-types/src/dto/tag/retrieve-tag-query.dto';
import { Request, Response, NextFunction } from 'express';

import config from '@/config';
import {
	Delete,
	Get,
	Middleware,
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
	private config = config;

	constructor(private readonly tagService: TagService) {}

	// TODO: move this into a new decorator `@IfEnabled('workflowTagsDisabled')`
	@Middleware()
	workflowsEnabledMiddleware(_req: Request, res: Response, next: NextFunction) {
		if (this.config.getEnv('workflowTagsDisabled')) {
			res.status(400).json({ message: 'Workflow tags are disabled' });
			return;
		}
		next();
	}

	@Get('/')
	@GlobalScope('tag:list')
	async getAll(_req: AuthenticatedRequest, _res: Response, @Query query: RetrieveTagQueryDto) {
		return await this.tagService.getAll({ withUsageCount: query.withUsageCount === 'true' });
	}

	@Post('/')
	@GlobalScope('tag:create')
	async createTag(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateTagRequestDto) {
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
		@Body payload: UpdateTagRequestDto,
	) {
		const newTag = this.tagService.toEntity({ id: tagId, name: payload.name.trim() });

		return await this.tagService.save(newTag, 'update');
	}

	@Delete('/:id(\\w+)')
	@GlobalScope('tag:delete')
	async deleteTag(_req: AuthenticatedRequest, _res: Response, @Param('id') tagId: string) {
		await this.tagService.delete(tagId);
		return true;
	}
}
