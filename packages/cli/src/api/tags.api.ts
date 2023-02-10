/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-invalid-void-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */

import express from 'express';

import * as Db from '@/Db';
import { ExternalHooks } from '@/ExternalHooks';
import type { IExternalHooksClass, ITagWithCountDb } from '@/Interfaces';
import * as ResponseHelper from '@/ResponseHelper';
import config from '@/config';
import * as TagHelpers from '@/TagHelpers';
import { validateEntity } from '@/GenericHelpers';
import { TagEntity } from '@db/entities/TagEntity';
import type { TagsRequest } from '@/requests';

export const externalHooks: IExternalHooksClass = ExternalHooks();

export const tagsController = express.Router();

const workflowsEnabledMiddleware: express.RequestHandler = (req, res, next) => {
	if (config.getEnv('workflowTagsDisabled')) {
		throw new ResponseHelper.BadRequestError('Workflow tags are disabled');
	}
	next();
};

// Retrieves all tags, with or without usage count
tagsController.get(
	'/',
	workflowsEnabledMiddleware,
	ResponseHelper.send(async (req: express.Request): Promise<TagEntity[] | ITagWithCountDb[]> => {
		if (req.query.withUsageCount === 'true') {
			const tablePrefix = config.getEnv('database.tablePrefix');
			return TagHelpers.getTagsWithCountDb(tablePrefix);
		}

		return Db.collections.Tag.find({ select: ['id', 'name', 'createdAt', 'updatedAt'] });
	}),
);

// Creates a tag
tagsController.post(
	'/',
	workflowsEnabledMiddleware,
	ResponseHelper.send(async (req: express.Request): Promise<TagEntity | void> => {
		const newTag = new TagEntity();
		newTag.name = req.body.name.trim();

		await externalHooks.run('tag.beforeCreate', [newTag]);

		await validateEntity(newTag);
		const tag = await Db.collections.Tag.save(newTag);

		await externalHooks.run('tag.afterCreate', [tag]);

		return tag;
	}),
);

// Updates a tag
tagsController.patch(
	'/:id(\\d+)',
	workflowsEnabledMiddleware,
	ResponseHelper.send(async (req: express.Request): Promise<TagEntity | void> => {
		const { name } = req.body;
		const { id } = req.params;

		const newTag = new TagEntity();
		// @ts-ignore
		newTag.id = id;
		newTag.name = name.trim();

		await externalHooks.run('tag.beforeUpdate', [newTag]);

		await validateEntity(newTag);
		const tag = await Db.collections.Tag.save(newTag);

		await externalHooks.run('tag.afterUpdate', [tag]);

		return tag;
	}),
);

tagsController.delete(
	'/:id(\\d+)',
	workflowsEnabledMiddleware,
	ResponseHelper.send(async (req: TagsRequest.Delete): Promise<boolean> => {
		if (
			config.getEnv('userManagement.isInstanceOwnerSetUp') === true &&
			req.user.globalRole.name !== 'owner'
		) {
			throw new ResponseHelper.UnauthorizedError(
				'You are not allowed to perform this action',
				'Only owners can remove tags',
			);
		}
		const id = req.params.id;

		await externalHooks.run('tag.beforeDelete', [id]);

		await Db.collections.Tag.delete({ id });

		await externalHooks.run('tag.afterDelete', [id]);

		return true;
	}),
);
