import { Request, Response, NextFunction } from 'express';
import config from '@/config';
import { Authorized, Delete, Get, Middleware, Patch, Post, RestController } from '@/decorators';
import { TagService } from '@/services/tag.service';
import { BadRequestError } from '@/ResponseHelper';
import { TagsRequest } from '@/requests';
import { Service } from 'typedi';
import { ExternalHooks } from '@/ExternalHooks';

@Authorized()
@RestController('/tags')
@Service()
export class TagsController {
	private config = config;

	constructor(
		private externalHooks: ExternalHooks,
		private tagService: TagService,
	) {}

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

		await this.externalHooks.run('tag.beforeCreate', [tag]);

		const savedTag = await this.tagService.save(tag);

		await this.externalHooks.run('tag.afterCreate', [tag]);

		return savedTag;
	}

	@Patch('/:id(\\w+)')
	async updateTag(req: TagsRequest.Update) {
		const newTag = this.tagService.toEntity({ id: req.params.id, name: req.body.name.trim() });

		await this.externalHooks.run('tag.beforeUpdate', [newTag]);

		const savedTag = await this.tagService.save(newTag);

		await this.externalHooks.run('tag.afterUpdate', [newTag]);

		return savedTag;
	}

	@Authorized(['global', 'owner'])
	@Delete('/:id(\\w+)')
	async deleteTag(req: TagsRequest.Delete) {
		const { id } = req.params;

		await this.externalHooks.run('tag.beforeDelete', [id]);

		await this.tagService.delete(id);

		await this.externalHooks.run('tag.afterDelete', [id]);

		return true;
	}
}
