import type express from 'express';

import {
	getTags,
	getTagsCount,
} from './tags.service';
import config from '@/config';
import { TagEntity } from '@db/entities/TagEntity';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';
import type { TagRequest } from '../../../types';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { InternalHooksManager } from '@/InternalHooksManager';

import type { FindManyOptions } from 'typeorm';

export = {
	getTags: [
		authorize(['owner', 'member']),
		validCursor,
		async (req: TagRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const {
				offset = 0,
				limit = 100,
			} = req.query;

			if (config.getEnv('workflowTagsDisabled')) {
				return res.status(406).json({ message: 'Workflow Tags Disabled' });
			}

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
};
