import { createPinia, setActivePinia } from 'pinia';

import * as api from '@/features/catalog/catalog.api';
import { useCatalogStore } from '@/features/catalog/catalog.store';
import type { CatalogEntry, CatalogSubscription } from '@/features/catalog/catalog.types';

vi.mock('@/features/catalog/catalog.api');

const entry = (id: string): CatalogEntry => ({
	id,
	name: `Workflow ${id}`,
	description: null,
	trigger: 'manual-trigger',
	fields: [],
});

const subscription = (id: string, workflowId: string): CatalogSubscription => ({
	id,
	workflowId,
	workflowName: `Workflow ${workflowId}`,
	cronExpression: '0 0 9 * * *',
	timezone: 'Europe/Berlin',
	inputs: {},
	enabled: true,
	nextRunAt: '2026-02-01T09:00:00.000Z',
});

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

	it('should group schedules by workflow so a card can show its own', async () => {
		vi.mocked(api.fetchCatalogSubscriptionsApi).mockResolvedValue([
			subscription('s1', 'a'),
			subscription('s2', 'a'),
			subscription('s3', 'b'),
		]);

		const store = useCatalogStore();
		await store.fetchSubscriptions();

		expect(store.subscriptionsByWorkflow.a).toHaveLength(2);
		expect(store.subscriptionsByWorkflow.b).toHaveLength(1);
		expect(store.subscriptionsByWorkflow.c).toBeUndefined();
	});

	it('should drop a removed schedule without refetching', async () => {
		vi.mocked(api.fetchCatalogSubscriptionsApi).mockResolvedValue([subscription('s1', 'a')]);
		vi.mocked(api.deleteCatalogSubscriptionApi).mockResolvedValue({ success: true });

		const store = useCatalogStore();
		await store.fetchSubscriptions();
		await store.unsubscribe('s1');

		expect(store.subscriptions).toEqual([]);
		expect(api.fetchCatalogSubscriptionsApi).toHaveBeenCalledTimes(1);
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
