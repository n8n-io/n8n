import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Z } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import {
	buildArtifactsFromRegistry,
	mergeDecoratorDocument,
	registerSharedSchemas,
	type OpenApiDocument,
} from '../generate';

function makeNamedResponseDto(className: string, shape: Parameters<typeof Z.class>[0]) {
	return { [className]: class extends Z.class(shape) {} }[className];
}

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

describe('shared schema registry', () => {
	it('emits a reused schema once and references it by file path from each operation', () => {
		const registry = new OpenAPIRegistry();
		const widget = registry.register('Widget', z.object({ id: z.string(), label: z.string() }));

		const responses = {
			200: { description: 'ok', content: { 'application/json': { schema: widget } } },
		};
		registry.registerPath({ method: 'get', path: '/widgets', responses });
		registry.registerPath({ method: 'get', path: '/widgets/{id}', responses });

		const artifacts = buildArtifactsFromRegistry(registry, [
			{
				outputPath: 'handlers/widgets/spec/paths/getWidgets.generated.yml',
				pathKey: '/widgets',
				method: 'get',
			},
			{
				outputPath: 'handlers/widgets/spec/paths/getWidget.generated.yml',
				pathKey: '/widgets/{id}',
				method: 'get',
			},
		]);

		// The object is defined exactly once, in its own shared file.
		const schemaFile = artifacts.find(
			(a) => a.outputPath === 'shared/spec/schemas/widget.generated.yml',
		);
		expect(schemaFile).toBeDefined();
		expect(schemaFile?.content).toContain('label:');

		// Both operations reference it by relative file path
		const relRef = '$ref: ../../../../shared/spec/schemas/widget.generated.yml';
		const [op1, op2] = ['getWidgets', 'getWidget'].map(
			(name) => artifacts.find((a) => a.outputPath.endsWith(`${name}.generated.yml`))?.content,
		);
		expect(op1).toContain(relRef);
		expect(op2).toContain(relRef);
		expect(op1).not.toContain('#/components/schemas');
		expect(op1).not.toContain('label:');
		// $ref must stay POSIX-style regardless of host OS
		expect(op1).not.toContain('\\');
	});

	it('inlines a schema referenced by only one operation', () => {
		const registry = new OpenAPIRegistry();
		// A schema not registered as a component stays inline wherever it is used.
		const inline = z.object({ id: z.string(), label: z.string() });

		registry.registerPath({
			method: 'get',
			path: '/gadgets',
			responses: {
				200: { description: 'ok', content: { 'application/json': { schema: inline } } },
			},
		});

		const [artifact] = buildArtifactsFromRegistry(registry, [
			{
				outputPath: 'handlers/gadgets/spec/paths/getGadgets.generated.yml',
				pathKey: '/gadgets',
				method: 'get',
			},
		]);

		expect(artifact.content).toContain('label:');
		expect(artifact.content).not.toContain('$ref');
	});

	it('throws if two different shared DTOs are both named the same', () => {
		const dtoA = makeNamedResponseDto('Widget', { id: z.string() });
		const dtoB = makeNamedResponseDto('Widget', { label: z.string() });

		const sharedResponseSchemas = new Map([
			[dtoA, dtoA.schema],
			[dtoB, dtoB.schema],
		]);

		expect(() => registerSharedSchemas(new OpenAPIRegistry(), sharedResponseSchemas)).toThrow(
			/Two different shared response DTOs are both named 'Widget'/,
		);
	});

	it('registers two different shared DTOs with different names without colliding', () => {
		const dtoA = makeNamedResponseDto('Widget', { id: z.string() });
		const dtoB = makeNamedResponseDto('Gadget', { label: z.string() });

		const sharedResponseSchemas = new Map([
			[dtoA, dtoA.schema],
			[dtoB, dtoB.schema],
		]);

		const registered = registerSharedSchemas(new OpenAPIRegistry(), sharedResponseSchemas);

		expect(registered.get(dtoA)).toBeDefined();
		expect(registered.get(dtoB)).toBeDefined();
	});
});
