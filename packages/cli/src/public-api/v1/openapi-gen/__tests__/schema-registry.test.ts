import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Z } from '@n8n/api-types';
import { z } from 'zod';

// Pulls in zod-extend (via the generate -> decorator-routes import chain) so `.openapi()`/registry
// metadata is patched onto zod before we build schemas below.
import { buildArtifactsFromRegistry, registerSharedSchemas } from '../generate';

function makeNamedResponseDto(className: string, shape: Parameters<typeof Z.class>[0]) {
	return { [className]: class extends Z.class(shape) {} }[className];
}

/**
 * Proves the shared-schema registry: a schema referenced by more than one operation is emitted once
 * as its own fragment file and `$ref`d from each operation, rather than inlined into every one.
 */
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

		// Both operations reference it by relative file path — not a dangling internal pointer, and
		// not an inlined copy of the object.
		const relRef = '$ref: ../../../../shared/spec/schemas/widget.generated.yml';
		const [op1, op2] = ['getWidgets', 'getWidget'].map(
			(name) => artifacts.find((a) => a.outputPath.endsWith(`${name}.generated.yml`))?.content,
		);
		expect(op1).toContain(relRef);
		expect(op2).toContain(relRef);
		expect(op1).not.toContain('#/components/schemas');
		expect(op1).not.toContain('label:');
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
		// Two distinct classes (different identity) that happen to share a `.name` - not the same
		// DTO reused, which is the only case that's supposed to count as "shared".
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
