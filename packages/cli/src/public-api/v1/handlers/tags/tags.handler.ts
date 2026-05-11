import type { TagEntity } from '@n8n/db';
import { TagRepository } from '@n8n/db';
import { Container } from '@n8n/di';

// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindManyOptions } from '@n8n/typeorm';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TagService } from '@/services/tag.service';

import type { TagRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type TagHandlers = {
	createTag: PublicAPIEndpoint<TagRequest.Create>;
	updateTag: PublicAPIEndpoint<TagRequest.Update>;
	deleteTag: PublicAPIEndpoint<TagRequest.Delete>;
	getTags: PublicAPIEndpoint<TagRequest.GetAll>;
	getTag: PublicAPIEndpoint<TagRequest.Get>;
};

const tagHandlers: TagHandlers = {
	createTag: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'tag:create' }),
		async (req, res) => {
			const { name } = req.body;

			const newTag = Container.get(TagService).toEntity({ name: name.trim() });

			try {
				const createdTag = await Container.get(TagService).save(newTag, 'create');
				return res.status(201).json(createdTag);
			} catch {
				throw new ConflictError('Tag already exists');
			}
		},
	],
	updateTag: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'tag:update' }),
		async (req, res) => {
			const { id } = req.params;
			const { name } = req.body;

			try {
				await Container.get(TagService).getById(id);
			} catch (error) {
				throw new NotFoundError('Not Found');
			}

			const updateTag = Container.get(TagService).toEntity({ id, name: name.trim() });

			try {
				const updatedTag = await Container.get(TagService).save(updateTag, 'update');
				return res.json(updatedTag);
			} catch {
				throw new ConflictError('Tag already exists');
			}
		},
	],
	deleteTag: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'tag:delete' }),
		async (req, res) => {
			const { id } = req.params;

			let tag;
			try {
				tag = await Container.get(TagService).getById(id);
			} catch (error) {
				throw new NotFoundError('Not Found');
			}

			await Container.get(TagService).delete(id);
			return res.json(tag);
		},
	],
	getTags: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'tag:list' }),
		validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100 } = req.query;

			const query: FindManyOptions<TagEntity> = {
				skip: offset,
				take: limit,
			};

			const [tags, count] = await Container.get(TagRepository).findAndCount(query);

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
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'tag:read' }),
		async (req, res) => {
			const { id } = req.params;

			try {
				const tag = await Container.get(TagService).getById(id);
				return res.json(tag);
			} catch (error) {
				throw new NotFoundError('Not Found');
			}
		},
	],
};

export = tagHandlers;
