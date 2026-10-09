import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Z } from '@n8n/api-types';
import { ApiResponse, ControllerRegistryMetadata, Get, Patch } from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { parse } from 'yaml';
import { z } from 'zod';

import { markPublicApiController } from '@/public-api/__tests__/public-api-controller-test-utils';

import {
	assembleSpec,
	buildArtifactsFromRegistry,
	DECORATOR_ROOT_FILENAME,
	getGeneratedArtifacts,
	registerSharedSchemas,
	type OpenApiDocument,
} from '../generate';
import { buildBinarySuccessResponse } from '../decorator-routes';

function makeNamedResponseDto(className: string, shape: Parameters<typeof Z.class>[0]) {
	return { [className]: class extends Z.class(shape) {} }[className];
}

describe('getGeneratedArtifacts path parameter names', () => {
	beforeEach(() => {
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	const getRootPaths = (): string[] => {
		const root = getGeneratedArtifacts().find((a) => a.outputPath === DECORATOR_ROOT_FILENAME);
		const document = parse(root?.content ?? '') as OpenApiDocument;
		return Object.keys(document.paths ?? {}).sort();
	};

	it('keeps different static paths with the same parameter positions separate', () => {
		class CredentialsPublicController {
			@Get('/:id')
			@ApiResponse(200)
			method() {}
		}
		class CredentialTypesPublicController {
			@Get('/:name')
			@ApiResponse(200)
			method() {}
		}
		markPublicApiController(CredentialsPublicController as Controller, '/credentials');
		markPublicApiController(CredentialTypesPublicController as Controller, '/credential-types');

		expect(getRootPaths()).toEqual(['/credential-types/{name}', '/credentials/{id}']);
	});

	it('throws when equivalent paths use different parameter names', () => {
		class CredentialsGetController {
			@Get('/:id')
			@ApiResponse(200)
			method() {}
		}
		class CredentialsPatchController {
			@Patch('/:credentialId')
			@ApiResponse(200)
			method() {}
		}
		markPublicApiController(CredentialsGetController as Controller, '/credentials');
		markPublicApiController(CredentialsPatchController as Controller, '/credentials');

		expect(() => getGeneratedArtifacts()).toThrow(UnexpectedError);
		expect(() => getGeneratedArtifacts()).toThrow(
			/Equivalent OpenAPI paths use different parameter names/,
		);
	});
});

describe('assembleSpec', () => {
	it('takes paths and components from the generated document', () => {
		const envelope: OpenApiDocument = { openapi: '3.0.0', paths: {} };
		const generated: OpenApiDocument = {
			paths: { '/tags': { get: { operationId: 'getTags' } } },
			components: { schemas: { Tag: { type: 'object' } } },
		};

		const assembled = assembleSpec(envelope, generated);

		expect(assembled.paths).toEqual({ '/tags': { get: { operationId: 'getTags' } } });
		expect(assembled.components).toEqual({ schemas: { Tag: { type: 'object' } } });
	});

	it('keeps the envelope keys and its security schemes', () => {
		const envelope: OpenApiDocument = {
			openapi: '3.0.0',
			info: { title: 'n8n Public API', version: '1.1.1' },
			security: [{ ApiKeyAuth: [] }],
			tags: [{ name: 'Tags' }],
			paths: {},
			components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header' } } },
		};

		const assembled = assembleSpec(envelope, {
			paths: {},
			components: { schemas: { Tag: { type: 'object' } } },
		});

		expect(assembled).toMatchObject({
			openapi: '3.0.0',
			info: { title: 'n8n Public API', version: '1.1.1' },
			security: [{ ApiKeyAuth: [] }],
			tags: [{ name: 'Tags' }],
		});
		expect(assembled.components).toEqual({
			schemas: { Tag: { type: 'object' } },
			securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header' } },
		});
	});

	it('throws when the envelope and the generated document define the same component', () => {
		const envelope: OpenApiDocument = {
			paths: {},
			components: { schemas: { Tag: { type: 'string' } } },
		};
		const generated: OpenApiDocument = {
			paths: {},
			components: { schemas: { Tag: { type: 'object' } } },
		};

		expect(() => assembleSpec(envelope, generated)).toThrow(UnexpectedError);
		expect(() => assembleSpec(envelope, generated)).toThrow(/components\.schemas\.Tag/);
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

	it('strips the untyped nullable an unknown array item generates, leaving items: {}', () => {
		const registry = new OpenAPIRegistry();
		const widget = registry.register(
			'Widget',
			z.object({ id: z.string(), nodes: z.array(z.unknown()) }),
		);

		registry.registerPath({
			method: 'get',
			path: '/widgets',
			responses: {
				200: { description: 'ok', content: { 'application/json': { schema: widget } } },
			},
		});

		const artifacts = buildArtifactsFromRegistry(registry, [
			{
				outputPath: 'handlers/widgets/spec/paths/getWidgets.generated.yml',
				pathKey: '/widgets',
				method: 'get',
			},
		]);

		const schemaFile = artifacts.find(
			(a) => a.outputPath === 'shared/spec/schemas/widget.generated.yml',
		);
		expect(schemaFile?.content).toContain('nodes:\n    type: array\n    items: {}\n');
		expect(schemaFile?.content).not.toContain('nullable');
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

	it('emits a binary response body with format: binary and its header descriptions', () => {
		const registry = new OpenAPIRegistry();
		registry.registerPath({
			method: 'get',
			path: '/exports',
			responses: {
				200: buildBinarySuccessResponse({
					mediaType: 'application/gzip',
					description: 'An archive.',
					headers: { 'X-Archive-Size': { description: 'Size of the archive' } },
				}),
			},
		});

		const [artifact] = buildArtifactsFromRegistry(registry, [
			{
				outputPath: 'handlers/exports/spec/paths/export.generated.yml',
				pathKey: '/exports',
				method: 'get',
			},
		]);

		expect(artifact.content).toContain('application/gzip:');
		expect(artifact.content).toContain('format: binary');
		expect(artifact.content).toContain('X-Archive-Size:');
		expect(artifact.content).toContain('Size of the archive');
	});
});
