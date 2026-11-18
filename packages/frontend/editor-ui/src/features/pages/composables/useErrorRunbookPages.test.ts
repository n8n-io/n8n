import type { PageSummary } from '@n8n/api-types';
import { flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

import {
	MAX_RUNBOOK_PAGES,
	toRunbookPages,
	useErrorRunbookPages,
	type FailureLocation,
} from './useErrorRunbookPages';

const mocks = vi.hoisted(() => ({
	listReferencing: vi.fn(),
	isPageModuleActive: undefined as unknown as { value: boolean },
}));

vi.mock('@n8n/frontend-module-page', () => ({
	usePageStore: () => ({ listReferencing: mocks.listReferencing }),
}));
vi.mock('./useIsPageModuleActive', () => ({
	useIsPageModuleActive: () => mocks.isPageModuleActive,
}));

const toSummary = (id: string, updatedAt = '2026-11-01T00:00:00.000Z'): PageSummary => ({
	id,
	title: `Page ${id}`,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt,
});

const idsOf = (pages: PageSummary[]) => pages.map((page) => page.id);

function givenPages(pagesByResourceType: Record<string, PageSummary[]>) {
	mocks.listReferencing.mockImplementation(
		async ({ resourceType }: { resourceType: string }) => pagesByResourceType[resourceType] ?? [],
	);
}

describe('toRunbookPages', () => {
	it('should put the pages of the node before the pages of the workflow', () => {
		const pages = toRunbookPages([toSummary('node-page')], [toSummary('workflow-page')]);

		expect(idsOf(pages)).toEqual(['node-page', 'workflow-page']);
	});

	it('should list a page that links to the node and to the workflow one time, as a node page', () => {
		const pages = toRunbookPages(
			[toSummary('both')],
			[toSummary('workflow-page'), toSummary('both')],
		);

		expect(idsOf(pages)).toEqual(['both', 'workflow-page']);
	});

	it('should keep the first pages only, up to the cap', () => {
		const nodePages = ['a', 'b'].map((id) => toSummary(id));
		const workflowPages = ['c', 'd', 'e'].map((id) => toSummary(id));

		const pages = toRunbookPages(nodePages, workflowPages);

		expect(MAX_RUNBOOK_PAGES).toBe(3);
		expect(idsOf(pages)).toEqual(['a', 'b', 'c']);
	});

	it('should give no page when no page links to the node or the workflow', () => {
		expect(toRunbookPages([], [])).toEqual([]);
	});
});

describe('useErrorRunbookPages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isPageModuleActive = ref(true);
		givenPages({});
	});

	it('should load the pages of the node and of the workflow, node pages first', async () => {
		givenPages({ node: [toSummary('node-page')], workflow: [toSummary('workflow-page')] });

		const pages = useErrorRunbookPages({ workflowId: 'w1', nodeId: 'n1' });
		await flushPromises();

		expect(mocks.listReferencing).toHaveBeenCalledWith({ resourceType: 'node', resourceId: 'n1' });
		expect(mocks.listReferencing).toHaveBeenCalledWith({
			resourceType: 'workflow',
			resourceId: 'w1',
		});
		expect(idsOf(pages.value)).toEqual(['node-page', 'workflow-page']);
	});

	it('should fall back to the pages of the workflow when no page links to the node', async () => {
		givenPages({ workflow: [toSummary('workflow-page')] });

		const pages = useErrorRunbookPages({ workflowId: 'w1', nodeId: 'n1' });
		await flushPromises();

		expect(idsOf(pages.value)).toEqual(['workflow-page']);
	});

	it('should load only the pages of the workflow when the node is not known', async () => {
		givenPages({ workflow: [toSummary('workflow-page')] });

		const pages = useErrorRunbookPages({ workflowId: 'w1' });
		await flushPromises();

		expect(mocks.listReferencing).toHaveBeenCalledExactlyOnceWith({
			resourceType: 'workflow',
			resourceId: 'w1',
		});
		expect(idsOf(pages.value)).toEqual(['workflow-page']);
	});

	it('should cap the list and remove the duplicates', async () => {
		givenPages({
			node: [toSummary('a'), toSummary('b')],
			workflow: [toSummary('b'), toSummary('c'), toSummary('d')],
		});

		const pages = useErrorRunbookPages({ workflowId: 'w1', nodeId: 'n1' });
		await flushPromises();

		expect(idsOf(pages.value)).toEqual(['a', 'b', 'c']);
	});

	it('should give no page and send no request when the page module is off', async () => {
		mocks.isPageModuleActive.value = false;
		givenPages({ node: [toSummary('node-page')], workflow: [toSummary('workflow-page')] });

		const pages = useErrorRunbookPages({ workflowId: 'w1', nodeId: 'n1' });
		await flushPromises();

		expect(pages.value).toEqual([]);
		expect(mocks.listReferencing).not.toHaveBeenCalled();
	});

	it('should give no page and send no request when the workflow is not known', async () => {
		const pages = useErrorRunbookPages({ nodeId: 'n1' });
		await flushPromises();

		expect(pages.value).toEqual([]);
		expect(mocks.listReferencing).not.toHaveBeenCalled();
	});

	it('should load the pages of the new failure when the failure changes', async () => {
		givenPages({ workflow: [toSummary('workflow-page')] });
		const failure = ref<FailureLocation>({});

		const pages = useErrorRunbookPages(failure);
		await flushPromises();
		expect(pages.value).toEqual([]);

		failure.value = { workflowId: 'w1' };
		await flushPromises();

		expect(idsOf(pages.value)).toEqual(['workflow-page']);
	});
});
