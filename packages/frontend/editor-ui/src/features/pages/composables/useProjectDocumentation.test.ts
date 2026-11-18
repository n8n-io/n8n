import type { PageOverviewWorkflow } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';

import { useProjectDocumentation } from './useProjectDocumentation';

const route = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
}));
const isPageModuleActive = vi.hoisted(() => ({ value: true }));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => route,
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

describe('useProjectDocumentation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		route.params = { projectId: 'p1' };
		isPageModuleActive.value = true;
	});

	it('should report no documentation before the overview loads', () => {
		mockedStore(usePageStore).overviewOf.mockReturnValue(undefined);

		const { hasDocumentation, undocumentedWorkflows } = useProjectDocumentation();

		expect(hasDocumentation.value).toBe(false);
		expect(undocumentedWorkflows.value).toEqual([]);
	});

	it('should report no documentation when no workflow has a page', () => {
		setOverview([toWorkflow('w1', false)]);

		const { hasDocumentation, undocumentedWorkflows } = useProjectDocumentation();

		expect(hasDocumentation.value).toBe(false);
		expect(undocumentedWorkflows.value).toEqual([{ id: 'w1', name: 'Workflow w1' }]);
	});

	it('should report documentation when a workflow has a page', () => {
		setOverview([toWorkflow('w1', true), toWorkflow('w2', false)]);

		const { hasDocumentation, undocumentedWorkflows } = useProjectDocumentation();

		expect(hasDocumentation.value).toBe(true);
		expect(undocumentedWorkflows.value).toEqual([{ id: 'w2', name: 'Workflow w2' }]);
	});

	it('should load the overview of the project of the route', async () => {
		const pageStore = mockedStore(usePageStore);
		pageStore.fetchOverview.mockResolvedValue({ workflows: [] });

		await useProjectDocumentation().loadDocumentation();

		expect(pageStore.fetchOverview).toHaveBeenCalledWith('p1');
	});

	it('should not load the overview when the instance has no pages', async () => {
		isPageModuleActive.value = false;

		await useProjectDocumentation().loadDocumentation();

		expect(mockedStore(usePageStore).fetchOverview).not.toHaveBeenCalled();
	});

	it('should keep the last state when the overview does not load', async () => {
		mockedStore(usePageStore).fetchOverview.mockRejectedValue(new Error('offline'));

		await expect(useProjectDocumentation().loadDocumentation()).resolves.toBeUndefined();
	});
});
