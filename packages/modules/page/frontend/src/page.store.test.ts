import { createOverviewWorkflow, createPage } from './__tests__/fixtures';
import { usePageStore } from './page.store';

const api = vi.hoisted(() => ({
	listPages: vi.fn(),
	getPage: vi.fn(),
	getPageById: vi.fn(),
	createPage: vi.fn(),
	updatePage: vi.fn(),
	deletePage: vi.fn(),
	listReferencingPages: vi.fn(),
	listAllPages: vi.fn(),
	listNodeReferences: vi.fn(),
	getPageBacklinks: vi.fn(),
	getPageOverview: vi.fn(),
}));

vi.mock('./page.api', () => api);

const context = { baseUrl: 'http://localhost/rest', pushRef: 'test' };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: context }),
}));

function toSummary({ content: _content, ...summary }: ReturnType<typeof createPage>) {
	return summary;
}

describe('usePageStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads the page list of a project', async () => {
		const summaries = [toSummary(createPage())];
		api.listPages.mockResolvedValue(summaries);
		const store = usePageStore();

		expect(store.isListLoaded('project-1')).toBe(false);
		await store.fetchPages('project-1');

		expect(api.listPages).toHaveBeenCalledWith(context, 'project-1');
		expect(store.pagesOf('project-1')).toEqual(summaries);
		expect(store.isListLoaded('project-1')).toBe(true);
	});

	it('puts a created page first in a loaded list', async () => {
		api.listPages.mockResolvedValue([toSummary(createPage())]);
		api.createPage.mockResolvedValue(createPage({ id: 'page-2', title: 'Untitled' }));
		const store = usePageStore();
		await store.fetchPages('project-1');

		const page = await store.createPage('project-1', { title: 'Untitled' });

		expect(api.createPage).toHaveBeenCalledWith(context, 'project-1', { title: 'Untitled' });
		expect(store.pagesOf('project-1').map(({ id }) => id)).toEqual(['page-2', 'page-1']);
		expect(store.pagesById['page-2']).toEqual(page);
	});

	it('sends the base version and keeps the saved version', async () => {
		api.listPages.mockResolvedValue([
			toSummary(createPage({ id: 'page-0' })),
			toSummary(createPage()),
		]);
		api.updatePage.mockResolvedValue(createPage({ title: 'Renamed', version: 2 }));
		const store = usePageStore();
		await store.fetchPages('project-1');

		await store.updatePage('project-1', 'page-1', { title: 'Renamed', baseVersion: 1 });

		expect(api.updatePage).toHaveBeenCalledWith(context, 'project-1', 'page-1', {
			title: 'Renamed',
			baseVersion: 1,
		});
		expect(store.pagesById['page-1'].version).toBe(2);
		expect(store.pagesOf('project-1')).toEqual([
			expect.objectContaining({ id: 'page-0' }),
			expect.objectContaining({ id: 'page-1', title: 'Renamed', version: 2 }),
		]);
	});

	it('keeps the stored version when the server rejects a save', async () => {
		api.getPage.mockResolvedValue(createPage());
		api.updatePage.mockRejectedValue(new Error('Conflict'));
		const store = usePageStore();
		await store.fetchPage('project-1', 'page-1');

		await expect(
			store.updatePage('project-1', 'page-1', { content: 'New', baseVersion: 1 }),
		).rejects.toThrow('Conflict');

		expect(store.pagesById['page-1']).toEqual(createPage());
	});

	it('reads a page by its id alone', async () => {
		api.getPageById.mockResolvedValue(createPage());
		const store = usePageStore();

		const page = await store.fetchPageById('page-1');

		expect(api.getPageById).toHaveBeenCalledWith(context, 'page-1');
		expect(page.projectId).toBe('project-1');
		expect(store.isListLoaded('project-1')).toBe(false);
	});

	it('removes a deleted page', async () => {
		api.listPages.mockResolvedValue([toSummary(createPage())]);
		api.getPage.mockResolvedValue(createPage());
		api.deletePage.mockResolvedValue(undefined);
		const store = usePageStore();
		await store.fetchPages('project-1');
		await store.fetchPage('project-1', 'page-1');

		await store.deletePage('project-1', 'page-1');

		expect(api.deletePage).toHaveBeenCalledWith(context, 'project-1', 'page-1');
		expect(store.pagesOf('project-1')).toEqual([]);
		expect(store.pagesById['page-1']).toBeUndefined();
	});

	it('lists the pages that reference a resource', async () => {
		const summaries = [toSummary(createPage())];
		api.listReferencingPages.mockResolvedValue(summaries);
		const store = usePageStore();
		const reference = { resourceType: 'workflow', resourceId: 'wf-1' } as const;

		expect(await store.listReferencing(reference)).toEqual(summaries);
		expect(api.listReferencingPages).toHaveBeenCalledWith(context, reference);
	});

	it('lists the pages of every project, with an optional title query', async () => {
		const items = [{ ...toSummary(createPage()), projectName: 'Operations' }];
		api.listAllPages.mockResolvedValue(items);
		const store = usePageStore();

		expect(await store.listAll()).toEqual(items);
		expect(await store.listAll('runbook')).toEqual(items);
		expect(api.listAllPages).toHaveBeenNthCalledWith(1, context, undefined);
		expect(api.listAllPages).toHaveBeenNthCalledWith(2, context, 'runbook');
	});

	it('lists the pages that link to the nodes of a workflow', async () => {
		const references = [{ nodeId: 'node-1', pages: [toSummary(createPage())] }];
		api.listNodeReferences.mockResolvedValue(references);
		const store = usePageStore();

		expect(await store.listNodeReferences('wf-1')).toEqual(references);
		expect(api.listNodeReferences).toHaveBeenCalledWith(context, 'wf-1');
	});

	it('reads the backlinks of a page', async () => {
		const backlinks = {
			pages: [toSummary(createPage({ id: 'page-2' }))],
			workflows: [{ workflowId: 'wf-1', workflowName: 'Sync', nodeId: 'n-1', nodeName: 'Docs' }],
		};
		api.getPageBacklinks.mockResolvedValue(backlinks);
		const store = usePageStore();

		expect(await store.backlinksOf('page-1')).toEqual(backlinks);
		expect(api.getPageBacklinks).toHaveBeenCalledWith(context, 'page-1');
	});

	it('keeps the overview of a project apart from the overview of every project', async () => {
		const projectOverview = { workflows: [createOverviewWorkflow()] };
		const fullOverview = { workflows: [] };
		api.getPageOverview.mockImplementation(async (_context: unknown, projectId?: string) =>
			projectId === undefined ? fullOverview : projectOverview,
		);
		const store = usePageStore();

		expect(store.overviewOf('project-1')).toBeUndefined();
		await store.fetchOverview('project-1');
		await store.fetchOverview();

		expect(api.getPageOverview).toHaveBeenCalledWith(context, 'project-1');
		expect(api.getPageOverview).toHaveBeenCalledWith(context, undefined);
		expect(store.overviewOf('project-1')).toEqual(projectOverview);
		expect(store.overviewOf()).toEqual(fullOverview);
	});
});
