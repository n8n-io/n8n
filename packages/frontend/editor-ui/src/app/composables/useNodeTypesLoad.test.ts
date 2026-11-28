import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import type { INodeTypeDescription } from 'n8n-workflow';
import * as nodeTypesApi from '@n8n/rest-api-client/api/nodeTypes';
import { useNodeTypesLoad } from './useNodeTypesLoad';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		baseUrl: 'http://localhost:5678/',
		restApiContext: { baseUrl: 'http://localhost:5678', pushRef: 'test' },
		defaultLocale: 'en',
		versionCli: '2.0.0',
	})),
}));

// The real module spawns the SharedWorker and dedicated worker on import.
vi.mock('@/app/workers', () => ({}));

vi.mock('@n8n/rest-api-client/api/nodeTypes');

const nodeType = {
	displayName: 'Set',
	name: 'n8n-nodes-base.set',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: {},
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
} as INodeTypeDescription;

const partialNodeType = {
	...nodeType,
	name: 'n8n-nodes-base.partial',
	displayName: 'Partial',
} as INodeTypeDescription;

describe('useNodeTypesLoad', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		window.localStorage.clear();
	});

	it('reports loading while the request is pending, then loaded', async () => {
		const { promise, resolve } = Promise.withResolvers<INodeTypeDescription[]>();
		vi.mocked(nodeTypesApi.getNodeTypes).mockReturnValueOnce(promise);

		const { isLoading, isLoaded, error, whenLoaded } = useNodeTypesLoad();

		expect(isLoading.value).toBe(true);
		expect(isLoaded.value).toBe(false);

		resolve([nodeType]);
		await expect(whenLoaded()).resolves.toBeUndefined();

		expect(isLoading.value).toBe(false);
		expect(isLoaded.value).toBe(true);
		expect(error.value).toBeUndefined();
	});

	it('reports the error and stops loading when the request fails', async () => {
		const loadError = new Error('node types');
		vi.mocked(nodeTypesApi.getNodeTypes).mockRejectedValueOnce(loadError);

		const { isLoading, isLoaded, error, whenLoaded, whenSettled } = useNodeTypesLoad();

		await expect(whenSettled()).resolves.toBeUndefined();
		await expect(whenLoaded()).rejects.toBe(loadError);
		expect(error.value).toBe(loadError);
		expect(isLoading.value).toBe(false);
		expect(isLoaded.value).toBe(false);
	});

	it('reports loaded when the request succeeds with no node types, and does not retry', async () => {
		vi.mocked(nodeTypesApi.getNodeTypes).mockResolvedValueOnce([]);

		const { isLoading, isLoaded, whenSettled } = useNodeTypesLoad();
		await whenSettled();

		expect(isLoading.value).toBe(false);
		// The full load completed; an empty catalog is a finished load, not a retry case.
		expect(isLoaded.value).toBe(true);

		const second = useNodeTypesLoad();
		await second.whenSettled();
		expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(1);
	});

	it('loads the full catalog when a partial catalog is already present, sharing one request', async () => {
		const store = useNodeTypesStore();
		store.setNodeTypes([partialNodeType]);

		const { promise, resolve } = Promise.withResolvers<INodeTypeDescription[]>();
		vi.mocked(nodeTypesApi.getNodeTypes).mockReturnValueOnce(promise);

		const first = useNodeTypesLoad();
		const second = useNodeTypesLoad();

		// A non-empty catalog is not a finished load.
		expect(first.isLoading.value).toBe(true);
		expect(first.isLoaded.value).toBe(false);

		resolve([nodeType]);
		await Promise.all([first.whenLoaded(), second.whenLoaded()]);

		expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(1);
		expect(first.isLoaded.value).toBe(true);
		expect(store.getNodeType(nodeType.name)).toBeDefined();
		expect(store.getNodeType(partialNodeType.name)).toBeDefined();
	});

	it('shares one request between instances, and sends none once the types are loaded', async () => {
		const { promise, resolve } = Promise.withResolvers<INodeTypeDescription[]>();
		vi.mocked(nodeTypesApi.getNodeTypes).mockReturnValueOnce(promise);

		const first = useNodeTypesLoad();
		const second = useNodeTypesLoad();
		resolve([nodeType]);
		await Promise.all([first.whenLoaded(), second.whenLoaded()]);

		const third = useNodeTypesLoad();
		await third.whenLoaded();

		expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(1);
		expect(third.isLoading.value).toBe(false);
	});

	it('reports loaded at once when the types are already in the store', async () => {
		vi.mocked(nodeTypesApi.getNodeTypes).mockResolvedValueOnce([nodeType]);
		await useNodeTypesLoad().whenLoaded();

		const { isLoading, isLoaded } = useNodeTypesLoad();

		expect(isLoading.value).toBe(false);
		expect(isLoaded.value).toBe(true);
	});

	it('sends a new request from a new instance after a failed load', async () => {
		vi.mocked(nodeTypesApi.getNodeTypes)
			.mockRejectedValueOnce(new Error('node types'))
			.mockResolvedValueOnce([nodeType]);

		await useNodeTypesLoad().whenSettled();
		const retry = useNodeTypesLoad();
		await retry.whenLoaded();
		await flushPromises();

		expect(nodeTypesApi.getNodeTypes).toHaveBeenCalledTimes(2);
		expect(retry.isLoaded.value).toBe(true);
		expect(retry.error.value).toBeUndefined();
	});
});
