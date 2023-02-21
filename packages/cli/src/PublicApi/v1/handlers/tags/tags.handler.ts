import type express from 'express';

import {
	getTags,
	getTagsCount,
	createTag,
	updateTag,
	deleteTag,
	getTagById,
} from './tags.service';
import config from '@/config';
import { TagEntity } from '@db/entities/TagEntity';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';
import type { TagRequest } from '../../../types';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { InternalHooksManager } from '@/InternalHooksManager';
import { ExternalHooks } from '@/ExternalHooks';
import { validateEntity } from '@/GenericHelpers';

import { FindManyOptions, QueryFailedError } from 'typeorm';
import * as ResponseHelper from '@/ResponseHelper';

export = {
	createTag: [
		authorize(['owner', 'member']),
		async (req: TagRequest.Create, res: express.Response): Promise<express.Response> => {
			const { name } = req.body;

			const newTag = new TagEntity();
			newTag.name = name.trim();

			await ExternalHooks().run('tag.beforeCreate', [newTag]);

			await validateEntity(newTag);

			let tag;
			try {
				tag = await createTag(newTag);
			} catch (error) {
				if (error instanceof QueryFailedError && error.message.includes("SQLITE_CONSTRAINT")) {
					return res.status(409).json({ message: 'Tag already exists' });
				} else {
					throw error;
				}
			}

			await ExternalHooks().run('tag.afterCreate', [tag]);

			return res.json(tag);
		},
	],
	updateTag: [
		authorize(['owner', 'member']),
		async (req: TagRequest.Update, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const { name } = req.body;

			let tag = await getTagById(id);

			if (tag === null) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const newTag = new TagEntity();
			newTag.id = id;
			newTag.name = name.trim();

			await ExternalHooks().run('tag.beforeUpdate', [newTag]);

			await validateEntity(newTag);

			try {
				await updateTag(id, newTag);
			} catch (error) {
				if (error instanceof QueryFailedError && error.message.includes("SQLITE_CONSTRAINT")) {
					return res.status(409).json({ message: 'Tag already exists' });
				} else {
					throw error;
				}
			}

			await ExternalHooks().run('tag.afterUpdate', [tag]);

			tag = await getTagById(id);

			return res.json(tag);
		},
	],
	deleteTag: [
		authorize(['owner', 'member']),
		async (req: TagRequest.Delete, res: express.Response): Promise<express.Response> => {
			if (
				config.getEnv('userManagement.isInstanceOwnerSetUp') === true &&
				req.user.globalRole.name !== 'owner'
			) {
				throw new ResponseHelper.UnauthorizedError(
					'You are not allowed to perform this action',
					'Only owners can remove tags',
				);
			}
			
			const { id } = req.params;

			let tag = await getTagById(id);

			if (tag === null) {
				return res.status(404).json({ message: 'Not Found' });
			}

			await ExternalHooks().run('tag.beforeDelete', [id]);

			await deleteTag(id);

			await ExternalHooks().run('tag.afterUpdate', [id]);

			return res.json(tag);
		},
	],
	getTags: [
		authorize(['owner', 'member']),
		validCursor,
		async (req: TagRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const {
				offset = 0,
				limit = 100,
			} = req.query;

			let tags: TagEntity[];
			let count: number;

			const query: FindManyOptions<TagEntity> = {
				skip: offset,
				take: limit,
			};

			tags = await getTags(query);
			count = await getTagsCount(query);

			void InternalHooksManager.getInstance().onUserRetrievedAllTags({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json({
				data: tags,
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	getTag: [
		authorize(['owner', 'member']),
		async (req: TagRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			let tag = await getTagById(id);

			if (tag === null) {
				return res.status(404).json({ message: 'Not Found' });
			}

			return res.json(tag);
		},
	],
};
