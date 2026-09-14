import { Container } from '@n8n/di';

import type { TagRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TagService } from '@/services/tag.service';

type TagHandlers = {
	deleteTag: PublicAPIEndpoint<TagRequest.Delete>;
	getTag: PublicAPIEndpoint<TagRequest.Get>;
};

const tagHandlers: TagHandlers = {
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
