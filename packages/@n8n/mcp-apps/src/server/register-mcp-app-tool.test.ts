import { describe, expect, it, vi } from 'vitest';

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
});
