import { Request, Response, NextFunction } from 'express';
import config from '@/config';
import { Authorized, Delete, Get, Middleware, Patch, Post, RestController } from '@/decorators';
import { TagService } from '@/services/tag.service';
import { BadRequestError } from '@/ResponseHelper';
import { TagsRequest } from '@/requests';
import { Service } from 'typedi';

@Authorized()
@RestController('/tags')
@Service()
export class TagsController {
	private config = config;

	constructor(private tagService: TagService) {}

	// TODO: move this into a new decorator `@IfEnabled('workflowTagsDisabled')`
	@Middleware()
	workflowsEnabledMiddleware(req: Request, res: Response, next: NextFunction) {
		if (this.config.getEnv('workflowTagsDisabled'))
			throw new BadRequestError('Workflow tags are disabled');
		next();
	}

	@Get('/')
	async getAll(req: TagsRequest.GetAll) {
		return this.tagService.getAll({ withUsageCount: req.query.withUsageCount === 'true' });
	}

	@Post('/')
	async createTag(req: TagsRequest.Create) {
		const tag = this.tagService.toEntity({ name: req.body.name });

		return this.tagService.save(tag, 'create');
	}

	@Patch('/:id(\\w+)')
	async updateTag(req: TagsRequest.Update) {
		const newTag = this.tagService.toEntity({ id: req.params.id, name: req.body.name.trim() });

		return this.tagService.save(newTag, 'update');
	}

	@Authorized(['global', 'owner'])
	@Delete('/:id(\\w+)')
	async deleteTag(req: TagsRequest.Delete) {
		const { id } = req.params;

		await this.tagService.delete(id);

		return true;
	}
}
