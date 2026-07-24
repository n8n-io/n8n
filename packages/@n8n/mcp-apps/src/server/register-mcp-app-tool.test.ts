import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';

import { RESOURCE_URI_META_KEY } from './constants';
import { registerMcpAppTool } from './register-mcp-app-tool';

const TEST_URI = 'ui://workflow-preview/workflow-preview.html';

function createServerMock() {
	return {
		registerTool: vi.fn((_name: string, config: unknown, _handler: unknown) => ({ config })),
	};
}

describe('registerMcpAppTool', () => {
	it('adds legacy ui/resourceUri when modern _meta.ui.resourceUri is provided', () => {
		const server = createServerMock();

		registerMcpAppTool(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			server as any,
			'tool-with-modern-meta',
			{
				description: 'Tool with modern UI meta',
				_meta: {
					ui: { resourceUri: TEST_URI },
				},
			},
			vi.fn() as unknown as Parameters<typeof registerMcpAppTool>[3],
		);

		const callArgs = server.registerTool.mock.calls[0];
		const passedConfig = callArgs[1] as Record<string, unknown>;
		const meta = passedConfig._meta as Record<string, unknown>;
		const uiMeta = meta.ui as Record<string, unknown>;

		expect(uiMeta.resourceUri).toBe(TEST_URI);
		expect(meta[RESOURCE_URI_META_KEY]).toBe(TEST_URI);
	});

	it('adds modern _meta.ui.resourceUri when legacy ui/resourceUri is provided', () => {
		const server = createServerMock();

		registerMcpAppTool(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			server as any,
			'tool-with-legacy-meta',
			{
				description: 'Tool with legacy UI meta',
				_meta: {
					[RESOURCE_URI_META_KEY]: TEST_URI,
				},
			},
			vi.fn() as unknown as Parameters<typeof registerMcpAppTool>[3],
		);

		const callArgs = server.registerTool.mock.calls[0];
		const passedConfig = callArgs[1] as Record<string, unknown>;
		const meta = passedConfig._meta as Record<string, unknown>;
		const uiMeta = meta.ui as Record<string, unknown>;

		expect(meta[RESOURCE_URI_META_KEY]).toBe(TEST_URI);
		expect(uiMeta.resourceUri).toBe(TEST_URI);
	});

	it('preserves both keys when caller already provides both', () => {
		const server = createServerMock();
		const customUri = 'ui://example/custom.html';

		registerMcpAppTool(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			server as any,
			'tool-with-both-meta',
			{
				_meta: {
					ui: { resourceUri: customUri },
					[RESOURCE_URI_META_KEY]: customUri,
				},
			},
			vi.fn() as unknown as Parameters<typeof registerMcpAppTool>[3],
		);

		const callArgs = server.registerTool.mock.calls[0];
		const passedConfig = callArgs[1] as Record<string, unknown>;
		const meta = passedConfig._meta as Record<string, unknown>;
		const uiMeta = meta.ui as Record<string, unknown>;

		expect(uiMeta.resourceUri).toBe(customUri);
		expect(meta[RESOURCE_URI_META_KEY]).toBe(customUri);
	});

	it('passes name and handler through to server.registerTool', () => {
		const server = createServerMock();
		const handler = vi.fn() as unknown as Parameters<typeof registerMcpAppTool>[3];

		registerMcpAppTool(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			server as any,
			'my-tool',
			{
				_meta: { ui: { resourceUri: TEST_URI } },
			},
			handler,
		);

		expect(server.registerTool).toHaveBeenCalledTimes(1);
		const [name, , passedHandler] = server.registerTool.mock.calls[0];
		expect(name).toBe('my-tool');
		expect(passedHandler).toBe(handler);
	});

	describe('input/output schema bridge (asMcpSchema)', () => {
		// Reaches through registerMcpAppTool into the private asMcpSchema graft. The SDK
		// reads a tool's schemas via `~standard.jsonSchema.{input,output}()`, so that
		// converter is the contract clients ultimately consume — assert it directly.
		function jsonSchemaOf(bridged: unknown): {
			input: () => Record<string, unknown>;
			output: () => Record<string, unknown>;
		} {
			return (
				bridged as {
					// eslint-disable-next-line @typescript-eslint/naming-convention -- Standard Schema spec key
					'~standard': {
						jsonSchema: {
							input: () => Record<string, unknown>;
							output: () => Record<string, unknown>;
						};
					};
				}
			)['~standard'].jsonSchema;
		}

		function registerWithSchemas() {
			const server = createServerMock();
			registerMcpAppTool(
				server as unknown as Parameters<typeof registerMcpAppTool>[0],
				'tool-with-schemas',
				{
					_meta: {},
					inputSchema: {
						name: z.string().describe('a name'),
						count: z.number().default(0),
					},
					outputSchema: {
						ok: z.boolean(),
					},
				},
				vi.fn() as unknown as Parameters<typeof registerMcpAppTool>[3],
			);
			return server.registerTool.mock.calls[0][1] as {
				inputSchema: unknown;
				outputSchema: unknown;
			};
		}

		it('exposes the input schema as JSON Schema via ~standard.jsonSchema.input()', () => {
			const config = registerWithSchemas();

			expect(jsonSchemaOf(config.inputSchema).input()).toMatchObject({
				type: 'object',
				properties: {
					name: { type: 'string', description: 'a name' },
					count: { type: 'number', default: 0 },
				},
				// `count` has a default, so it is optional on the way in.
				required: ['name'],
			});
		});

		it('threads the io direction so input() and output() differ for the same schema', () => {
			const inputSchema = jsonSchemaOf(registerWithSchemas().inputSchema);

			// The output projection always applies the default, so `count` becomes
			// required. A bridge that ignored `io` (or hard-coded one direction) fails here.
			expect(inputSchema.input().required).toEqual(['name']);
			expect(inputSchema.output().required).toEqual(['name', 'count']);
		});

		it('exposes the output schema as JSON Schema via ~standard.jsonSchema.output()', () => {
			const config = registerWithSchemas();

			expect(jsonSchemaOf(config.outputSchema).output()).toMatchObject({
				type: 'object',
				properties: { ok: { type: 'boolean' } },
				required: ['ok'],
			});
		});
	});
});
