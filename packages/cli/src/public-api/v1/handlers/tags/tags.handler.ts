import { Container } from '@n8n/di';

import type { TagRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TagService } from '@/services/tag.service';

type TagHandlers = {
	updateTag: PublicAPIEndpoint<TagRequest.Update>;
};

const tagHandlers: TagHandlers = {
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
};

export = tagHandlers;
