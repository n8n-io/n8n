import type express from 'express';

import type { TagEntity } from '@db/entities/TagEntity';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';
import type { TagRequest } from '../../../types';
import { encodeNextCursor } from '../../shared/services/pagination.service';

import { Container } from 'typedi';
import type { FindManyOptions } from '@n8n/typeorm';
import { TagRepository } from '@db/repositories/tag.repository';
import { TagService } from '@/services/tag.service';

export = {
	createTag: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: TagRequest.Create, res: express.Response): Promise<express.Response> => {
			const { name } = req.body;

			const newTag = Container.get(TagService).toEntity({ name: name.trim() });

			try {
				const createdTag = await Container.get(TagService).save(newTag, 'create');
				return res.status(201).json(createdTag);
			} catch (error) {
				return res.status(409).json({ message: 'Tag already exists' });
			}
		},
	],
	updateTag: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: TagRequest.Update, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const { name } = req.body;

			try {
				await Container.get(TagService).getById(id);
			} catch (error) {
				return res.status(404).json({ message: 'Not Found' });
			}

			const updateTag = Container.get(TagService).toEntity({ id, name: name.trim() });

			try {
				const updatedTag = await Container.get(TagService).save(updateTag, 'update');
				return res.json(updatedTag);
			} catch (error) {
				return res.status(409).json({ message: 'Tag already exists' });
			}
		},
	],
	deleteTag: [
		authorize(['global:owner', 'global:admin']),
		async (req: TagRequest.Delete, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			let tag;
			try {
				tag = await Container.get(TagService).getById(id);
			} catch (error) {
				return res.status(404).json({ message: 'Not Found' });
			}

			await Container.get(TagService).delete(id);
			return res.json(tag);
		},
	],
	getTags: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		validCursor,
		async (req: TagRequest.GetAll, res: express.Response): Promise<express.Response> => {
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
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: TagRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			try {
				const tag = await Container.get(TagService).getById(id);
				return res.json(tag);
			} catch (error) {
				return res.status(404).json({ message: 'Not Found' });
			}
		},
	],
};
