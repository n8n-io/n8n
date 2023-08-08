import { Request, Response, NextFunction } from 'express';
import config from '@/config';
import { Authorized, Delete, Get, Middleware, Patch, Post, RestController } from '@/decorators';
import { type ITagWithCountDb } from '@/Interfaces';
import type { TagEntity } from '@db/entities/TagEntity';
import { TagRepository } from '@db/repositories';
import { validateEntity } from '@/GenericHelpers';
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
		private tagsRepository: TagRepository,
		private externalHooks: ExternalHooks,
	) {}

	// TODO: move this into a new decorator `@IfEnabled('workflowTagsDisabled')`
	@Middleware()
	workflowsEnabledMiddleware(req: Request, res: Response, next: NextFunction) {
		if (this.config.getEnv('workflowTagsDisabled'))
			throw new BadRequestError('Workflow tags are disabled');
		next();
	}

	// Retrieves all tags, with or without usage count
	@Get('/')
	async getAll(req: TagsRequest.GetAll): Promise<TagEntity[] | ITagWithCountDb[]> {
		const { withUsageCount } = req.query;
		if (withUsageCount === 'true') {
			return this.tagsRepository
				.find({
					select: ['id', 'name', 'createdAt', 'updatedAt'],
					relations: ['workflowMappings'],
				})
				.then((tags) =>
					tags.map(({ workflowMappings, ...rest }) => ({
						...rest,
						usageCount: workflowMappings.length,
					})),
				);
		}

		return this.tagsRepository.find({ select: ['id', 'name', 'createdAt', 'updatedAt'] });
	}

	// Creates a tag
	@Post('/')
	async createTag(req: TagsRequest.Create): Promise<TagEntity> {
		const newTag = this.tagsRepository.create({ name: req.body.name.trim() });

		await this.externalHooks.run('tag.beforeCreate', [newTag]);
		await validateEntity(newTag);

		const tag = await this.tagsRepository.save(newTag);
		await this.externalHooks.run('tag.afterCreate', [tag]);
		return tag;
	}

	// Updates a tag
	@Patch('/:id(\\w+)')
	async updateTag(req: TagsRequest.Update): Promise<TagEntity> {
		const newTag = this.tagsRepository.create({ id: req.params.id, name: req.body.name.trim() });

		await this.externalHooks.run('tag.beforeUpdate', [newTag]);
		await validateEntity(newTag);

		const tag = await this.tagsRepository.save(newTag);
		await this.externalHooks.run('tag.afterUpdate', [tag]);
		return tag;
	}

	@Authorized(['global', 'owner'])
	@Delete('/:id(\\w+)')
	async deleteTag(req: TagsRequest.Delete) {
		const { id } = req.params;
		await this.externalHooks.run('tag.beforeDelete', [id]);

		await this.tagsRepository.delete({ id });
		await this.externalHooks.run('tag.afterDelete', [id]);
		return true;
	}
}
