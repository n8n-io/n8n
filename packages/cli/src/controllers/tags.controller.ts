import { Request, Response, NextFunction } from 'express';
import config from '@/config';
import {
	Authorized,
	Delete,
	Get,
	Middleware,
	Patch,
	Post,
	RestController,
	RequireGlobalScope,
} from '@/decorators';
import { TagService } from '@/services/tag.service';
import { TagsRequest } from '@/requests';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@Authorized()
@RestController('/tags')
export class TagsController {
	private config = config;

	constructor(private readonly tagService: TagService) {}

	// TODO: move this into a new decorator `@IfEnabled('workflowTagsDisabled')`
	@Middleware()
	workflowsEnabledMiddleware(req: Request, res: Response, next: NextFunction) {
		if (this.config.getEnv('workflowTagsDisabled'))
			throw new BadRequestError('Workflow tags are disabled');
		next();
	}

	@Get('/')
	@RequireGlobalScope('tag:list')
	async getAll(req: TagsRequest.GetAll) {
		return await this.tagService.getAll({ withUsageCount: req.query.withUsageCount === 'true' });
	}

	@Post('/')
	@RequireGlobalScope('tag:create')
	async createTag(req: TagsRequest.Create) {
		const tag = this.tagService.toEntity({ name: req.body.name });

		return await this.tagService.save(tag, 'create');
	}

	@Patch('/:id(\\w+)')
	@RequireGlobalScope('tag:update')
	async updateTag(req: TagsRequest.Update) {
		const newTag = this.tagService.toEntity({ id: req.params.id, name: req.body.name.trim() });

		return await this.tagService.save(newTag, 'update');
	}

	@Delete('/:id(\\w+)')
	@RequireGlobalScope('tag:delete')
	async deleteTag(req: TagsRequest.Delete) {
		const { id } = req.params;

		await this.tagService.delete(id);

		return true;
	}
}
