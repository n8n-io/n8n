import type { PageOverviewWorkflow } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';

import { useOverviewMode } from './useOverviewMode';

const route = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const isPageModuleActive = vi.hoisted(() => ({ value: true }));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => route,
	useRouter: () => router,
}));
vi.mock('./useIsPageModuleActive', () => ({
	useIsPageModuleActive: () => isPageModuleActive,
}));

const toWorkflow = (id: string, isDocumented: boolean) =>
	({
		id,
		name: `Workflow ${id}`,
		page: isDocumented ? { id: `page-${id}` } : undefined,
	}) as PageOverviewWorkflow;

function setOverview(workflows: PageOverviewWorkflow[]) {
	mockedStore(usePageStore).overviewOf.mockReturnValue({ workflows });
}

describe('useOverviewMode', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		route.params = { projectId: 'p1' };
		route.query = {};
		isPageModuleActive.value = true;
		setOverview([]);
	});

	it('should show the list when no workflow has a page', () => {
		setOverview([toWorkflow('w1', false)]);

		const { mode, undocumentedWorkflows } = useOverviewMode();

		expect(mode.value).toBe('list');
		expect(undocumentedWorkflows.value).toEqual([{ id: 'w1', name: 'Workflow w1' }]);
	});

	it('should show the documentation when a workflow has a page', () => {
		setOverview([toWorkflow('w1', true), toWorkflow('w2', false)]);

		expect(useOverviewMode().mode.value).toBe('docs');
	});

	it('should keep the choice of the user from the address', () => {
		setOverview([toWorkflow('w1', true)]);
		route.query = { view: 'list' };

		expect(useOverviewMode().mode.value).toBe('list');
	});

	it('should ignore a choice that is not a mode', () => {
		route.query = { view: 'grid' };

		expect(useOverviewMode().mode.value).toBe('list');
	});

	it('should show the list when the instance has no pages', () => {
		isPageModuleActive.value = false;
		route.query = { view: 'docs' };

		expect(useOverviewMode().mode.value).toBe('list');
	});

	it('should write the choice to the address and keep the other parameters', async () => {
		route.query = { search: 'orders' };

		await useOverviewMode().setMode('docs');

		expect(router.replace).toHaveBeenCalledWith({ query: { search: 'orders', view: 'docs' } });
	});

	it('should load the overview of all projects when the route has no project', async () => {
		route.params = {};
		const pageStore = mockedStore(usePageStore);
		pageStore.fetchOverview.mockResolvedValue({ workflows: [] });

		await useOverviewMode().loadDocumentation();

		expect(pageStore.fetchOverview).toHaveBeenCalledWith(undefined);
	});

	it('should keep the list when the overview does not load', async () => {
		mockedStore(usePageStore).fetchOverview.mockRejectedValue(new Error('offline'));
		const { mode, loadDocumentation } = useOverviewMode();

		await expect(loadDocumentation()).resolves.toBeUndefined();
		expect(mode.value).toBe('list');
	});
});
