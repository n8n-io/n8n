/* eslint-disable @typescript-eslint/no-shadow */
import type { RequestHandler } from 'express';
import { Request } from 'express';
import type { Repository } from 'typeorm';
import type { Config } from '@/config';
import config from '@/config';
import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import type { IDatabaseCollections, IExternalHooksClass, ITagWithCountDb } from '@/Interfaces';
import { TagEntity } from '@db/entities/TagEntity';
import { getTagsWithCountDb } from '@/TagHelpers';
import { validateEntity } from '@/GenericHelpers';
import { BadRequestError, UnauthorizedError } from '@/ResponseHelper';
import { TagsRequest } from '@/requests';

// TODO: convert this into a decorator `@IfEnabled('workflowTagsDisabled')`
const workflowsEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (config.getEnv('workflowTagsDisabled'))
		throw new BadRequestError('Workflow tags are disabled');
	next();
};

@RestController('/tags', workflowsEnabledMiddleware)
export class TagsController {
	private config: Config;

	private externalHooks: IExternalHooksClass;

	private tagsRepository: Repository<TagEntity>;

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

	// Retrieves all tags, with or without usage count
	@Get('/')
	async getALL(
		req: Request<{}, {}, {}, { withUsageCount: string }>,
	): Promise<TagEntity[] | ITagWithCountDb[]> {
		const { withUsageCount } = req.query;
		if (withUsageCount === 'true') {
			const tablePrefix = this.config.getEnv('database.tablePrefix');
			return getTagsWithCountDb(tablePrefix);
		}

		return this.tagsRepository.find({ select: ['id', 'name', 'createdAt', 'updatedAt'] });
	}

	// Creates a tag
	@Post('/')
	async createTag(req: Request<{}, {}, { name: string }>): Promise<TagEntity> {
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
	async updateTag(req: Request<{ id: string }, {}, { name: string }>): Promise<TagEntity> {
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
