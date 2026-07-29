import { UnexpectedError } from 'n8n-workflow';

import { mergeDecoratorDocument, type OpenApiDocument } from '../generate';

/**
 * `mergeDecoratorDocument` folds the decorator-routed operations into the hand-written (eov) spec.
 * Both inputs here stand in for already-bundled documents (all `$ref`s resolved).
 */
describe('mergeDecoratorDocument', () => {
	it('adds a decorator-only path that the eov spec does not define', () => {
		const eov: OpenApiDocument = { paths: { '/tags': { post: { operationId: 'createTag' } } } };
		const decorator: OpenApiDocument = {
			paths: { '/workflows/{id}/history': { get: { operationId: 'getWorkflowHistory' } } },
		};

		const merged = mergeDecoratorDocument(eov, decorator);

		expect(merged.paths?.['/tags']).toEqual({ post: { operationId: 'createTag' } });
		expect(merged.paths?.['/workflows/{id}/history']).toEqual({
			get: { operationId: 'getWorkflowHistory' },
		});
	});

	it('merges a decorator method into a path the eov spec also serves', () => {
		const eov: OpenApiDocument = { paths: { '/tags': { post: { operationId: 'createTag' } } } };
		const decorator: OpenApiDocument = { paths: { '/tags': { get: { operationId: 'getTags' } } } };

		const merged = mergeDecoratorDocument(eov, decorator);

		expect(merged.paths?.['/tags']).toEqual({
			post: { operationId: 'createTag' },
			get: { operationId: 'getTags' },
		});
	});

	it('throws when the same path+method is declared by both sides', () => {
		const eov: OpenApiDocument = { paths: { '/tags': { get: { operationId: 'listTagsEov' } } } };
		const decorator: OpenApiDocument = { paths: { '/tags': { get: { operationId: 'getTags' } } } };

		expect(() => mergeDecoratorDocument(eov, decorator)).toThrow(UnexpectedError);
		expect(() => mergeDecoratorDocument(eov, decorator)).toThrow(/GET \/tags/);
	});

	it('dedupes an identical component that both sides hoisted from the same shared file', () => {
		const unauthorized = { description: 'Unauthorized' };
		const eov: OpenApiDocument = {
			paths: {},
			components: { responses: { Unauthorized: unauthorized } },
		};
		const decorator: OpenApiDocument = {
			paths: {},
			components: { responses: { Unauthorized: { ...unauthorized } } },
		};

		const merged = mergeDecoratorDocument(eov, decorator);

		expect(merged.components?.responses).toEqual({ Unauthorized: unauthorized });
	});

	it('throws when a component name resolves to different definitions', () => {
		const eov: OpenApiDocument = {
			paths: {},
			components: { schemas: { Tag: { type: 'object', properties: { id: {} } } } },
		};
		const decorator: OpenApiDocument = {
			paths: {},
			components: { schemas: { Tag: { type: 'string' } } },
		};

		expect(() => mergeDecoratorDocument(eov, decorator)).toThrow(/components\.schemas\.Tag/);
	});
});
