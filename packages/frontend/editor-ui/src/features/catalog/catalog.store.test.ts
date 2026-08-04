import { createPinia, setActivePinia } from 'pinia';

import * as api from '@/features/catalog/catalog.api';
import { useCatalogStore } from '@/features/catalog/catalog.store';

vi.mock('@/features/catalog/catalog.api');

const entry = (id: string) => ({ id, name: `Workflow ${id}`, description: null, fields: [] });

describe('catalog.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(api.fetchCatalogRunsApi).mockResolvedValue({ runs: [], count: 0, estimated: false });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should surface a truncated listing so the UI can say so', async () => {
		vi.mocked(api.fetchCatalogWorkflowsApi).mockResolvedValue({
			workflows: [entry('a')],
			truncated: true,
		});

		const store = useCatalogStore();
		await store.fetchWorkflows();

		expect(store.workflows).toHaveLength(1);
		expect(store.truncated).toBe(true);
		expect(store.isEmpty).toBe(false);
	});

	it('should report an empty catalog', async () => {
		vi.mocked(api.fetchCatalogWorkflowsApi).mockResolvedValue({
			workflows: [],
			truncated: false,
		});

		const store = useCatalogStore();
		await store.fetchWorkflows();

		expect(store.isEmpty).toBe(true);
	});

	it('should refresh history after a run so the new one is visible', async () => {
		vi.mocked(api.runCatalogWorkflowApi).mockResolvedValue({ executionId: 'exec-1' });

		const store = useCatalogStore();
		const result = await store.run('wf-1', { customer: 'Acme Corp' });

		expect(api.runCatalogWorkflowApi).toHaveBeenCalledWith(expect.anything(), 'wf-1', {
			customer: 'Acme Corp',
		});
		expect(api.fetchCatalogRunsApi).toHaveBeenCalled();
		expect(result).toEqual({ executionId: 'exec-1' });
	});
});
