import { Container } from '@n8n/di';

import type { TagRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TagService } from '@/services/tag.service';

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
	/**
	 * Not the reference implementation — that is TagsPublicController
	 * (PublicApiControllerRegistry mounts before eov and owns runtime GET /tags).
	 *
	 * Kept only so scope-parity.test.ts can match openapi.yml `x-required-scope`
	 * against a handler middleware tagged with `__apiKeyScope`. Once that test
	 * also reads `@ApiKeyScope` from public controllers, this stub can go.
	 */
	getTags: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'tag:list' }),
		async (_req, res) => {
			return res.status(500).json({
				message: 'Unexpected: GET /tags should be handled by TagsPublicController',
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
