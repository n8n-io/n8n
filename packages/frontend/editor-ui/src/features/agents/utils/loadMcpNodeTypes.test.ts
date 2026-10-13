import type { AgentJsonMcpServerConfig } from '@n8n/api-types';

import type { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

type Store = ReturnType<typeof useNodeTypesStore>;

const REGISTRY_NODE_TYPE = '@n8n/mcp-registry.notion';

function server(nodeTypeName?: string): AgentJsonMcpServerConfig {
	return {
		name: 'notion',
		url: 'https://mcp.notion.com/mcp',
		transport: 'streamableHttp',
		authentication: 'none',
		...(nodeTypeName ? { metadata: { nodeTypeName } } : {}),
	};
}

function createStore(loaded: Set<string>, getNodeTypes = vi.fn().mockResolvedValue(undefined)) {
	const store = {
		getNodeType: vi.fn((name: string) => (loaded.has(name) ? { name } : null)),
		getNodeTypes,
	};
	return { store: store as unknown as Store, getNodeTypes };
}

// The loader keeps its state at module level, so each test imports a fresh copy.
async function importLoader() {
	vi.resetModules();
	return await import('./loadMcpNodeTypes');
}

describe('loadMissingMcpNodeTypes', () => {
	it('returns undefined when every node type is loaded', async () => {
		const { loadMissingMcpNodeTypes } = await importLoader();
		const { store, getNodeTypes } = createStore(new Set([REGISTRY_NODE_TYPE]));

		expect(loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store)).toBeUndefined();
		expect(getNodeTypes).not.toHaveBeenCalled();
	});

	it('shares one pending load between concurrent calls', async () => {
		const { loadMissingMcpNodeTypes } = await importLoader();
		const { store, getNodeTypes } = createStore(new Set());

		const first = loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store);
		const second = loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store);

		expect(second).toBe(first);
		await first;
		expect(getNodeTypes).toHaveBeenCalledTimes(1);
	});

	it('does not load again for a node type it already requested', async () => {
		const { loadMissingMcpNodeTypes } = await importLoader();
		const { store, getNodeTypes } = createStore(new Set());

		await loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store);
		await loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store);

		expect(getNodeTypes).toHaveBeenCalledTimes(1);
	});

	it('retries a failed load only when asked to', async () => {
		const { loadMissingMcpNodeTypes } = await importLoader();
		const { store, getNodeTypes } = createStore(
			new Set(),
			vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined),
		);

		await expect(loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store)).rejects.toThrow(
			'offline',
		);
		await loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store);
		expect(getNodeTypes).toHaveBeenCalledTimes(1);

		await loadMissingMcpNodeTypes([server(REGISTRY_NODE_TYPE)], store, { retryFailed: true });
		expect(getNodeTypes).toHaveBeenCalledTimes(2);
	});
});
