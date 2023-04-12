import { Request, Response, NextFunction } from 'express';
import type { Config } from '@/config';
import { Delete, Get, Middleware, Patch, Post, RestController } from '@/decorators';
import type { IDatabaseCollections, IExternalHooksClass, ITagWithCountDb } from '@/Interfaces';
import { TagEntity } from '@db/entities/TagEntity';
import type { TagRepository } from '@db/repositories';
import { validateEntity } from '@/GenericHelpers';
import { BadRequestError, UnauthorizedError } from '@/ResponseHelper';
import { TagsRequest } from '@/requests';

@RestController('/tags')
export class TagsController {
	private config: Config;

	private externalHooks: IExternalHooksClass;

	private tagsRepository: TagRepository;

	constructor({
		config,
		externalHooks,
		repositories,
	}: {
		config: Config;
		externalHooks: IExternalHooksClass;
		repositories: Pick<IDatabaseCollections, 'Tag'>;
	}) {
		this.config = config;
		this.externalHooks = externalHooks;
		this.tagsRepository = repositories.Tag;
	}

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
		const newTag = new TagEntity();
		newTag.name = req.body.name.trim();

		await this.externalHooks.run('tag.beforeCreate', [newTag]);
		await validateEntity(newTag);

		const tag = await this.tagsRepository.save(newTag);
		await this.externalHooks.run('tag.afterCreate', [tag]);
		return tag;
	}

	// Updates a tag
	@Patch('/:id(\\d+)')
	async updateTag(req: TagsRequest.Update): Promise<TagEntity> {
		const { name } = req.body;
		const { id } = req.params;

		const newTag = new TagEntity();
		newTag.id = id;
		newTag.name = name.trim();

		await this.externalHooks.run('tag.beforeUpdate', [newTag]);
		await validateEntity(newTag);

		const tag = await this.tagsRepository.save(newTag);
		await this.externalHooks.run('tag.afterUpdate', [tag]);
		return tag;
	}

	@Delete('/:id(\\d+)')
	async deleteTag(req: TagsRequest.Delete) {
		const isInstanceOwnerSetUp = this.config.getEnv('userManagement.isInstanceOwnerSetUp');
		if (isInstanceOwnerSetUp && req.user.globalRole.name !== 'owner') {
			throw new UnauthorizedError(
				'You are not allowed to perform this action',
				'Only owners can remove tags',
			);
		}
		const { id } = req.params;
		await this.externalHooks.run('tag.beforeDelete', [id]);

		await this.tagsRepository.delete({ id });
		await this.externalHooks.run('tag.afterDelete', [id]);
		return true;
	}
}
