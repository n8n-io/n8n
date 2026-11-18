import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import PagesView from './PagesView.vue';
import { createOverviewWorkflow, createPage } from '../__tests__/fixtures';
import { PAGE_AUTOSAVE_DEBOUNCE_MS, PROJECT_PAGES_VIEW } from '../page.constants';

const api = vi.hoisted(() => ({
	listPages: vi.fn(),
	getPage: vi.fn(),
	getPageById: vi.fn(),
	createPage: vi.fn(),
	updatePage: vi.fn(),
	deletePage: vi.fn(),
	getPageBacklinks: vi.fn(),
	getPageOverview: vi.fn(),
}));

vi.mock('../page.api', () => api);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

vi.mock('@tiptap/vue-3/menus', () => ({
	// A stub map is keyed by component name.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	BubbleMenu: { name: 'BubbleMenu', template: '<div><slot /></div>' },
}));

const ALL_PAGE_SCOPES: Scope[] = [
	'page:create',
	'page:read',
	'page:update',
	'page:delete',
	'page:list',
];

const runbook = createPage();
const notes = createPage({ id: 'page-2', title: 'Notes', content: 'Second page' });

const documentedWorkflow = createOverviewWorkflow({
	pageCount: 1,
	page: { id: notes.id, title: 'Notes', excerpt: 'Second page', hasTour: false, outdated: false },
});

function toSummary({ content: _content, ...summary }: ReturnType<typeof createPage>) {
	return summary;
}

function provideScopes(scopes: Scope[]) {
	capabilityRegistry.clear();
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => false,
	});
}

async function renderView(path = '/projects/project-1/pages') {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				name: PROJECT_PAGES_VIEW,
				path: '/projects/:projectId/pages/:pageId?',
				component: PagesView,
			},
			{ path: '/:pathMatch(.*)*', component: { template: '<div />' } },
		],
	});
	await router.push(path);
	const wrapper = createComponentRenderer(PagesView)({ global: { plugins: [router] } });
	return { wrapper, router };
}

describe('PagesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		provideScopes(ALL_PAGE_SCOPES);
		api.listPages.mockResolvedValue([toSummary(runbook), toSummary(notes)]);
		api.getPage.mockImplementation(async (_context: unknown, _projectId: string, pageId: string) =>
			pageId === notes.id ? notes : runbook,
		);
		api.getPageById.mockRejectedValue(new Error('Not needed'));
		api.getPageBacklinks.mockResolvedValue({ pages: [], workflows: [] });
		api.getPageOverview.mockResolvedValue({ workflows: [] });
	});

	afterEach(() => {
		capabilityRegistry.clear();
	});

	it('lists the pages of the project and shows the overview board when no page is selected', async () => {
		api.getPageOverview.mockResolvedValue({ workflows: [documentedWorkflow] });
		const { wrapper, router } = await renderView();

		await waitFor(() => expect(wrapper.getAllByTestId('page-list-item')).toHaveLength(2));
		expect(await wrapper.findByTestId('page-overview-card')).toHaveTextContent('Sync orders');

		expect(api.getPageOverview).toHaveBeenCalledWith(expect.anything(), 'project-1');
		expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages');
		expect(wrapper.getByTestId('page-overview-button')).toHaveAttribute('aria-current', 'page');
		expect(wrapper.queryByTestId('page-editor-title')).not.toBeInTheDocument();
	});

	it('opens the page of a card of the board', async () => {
		api.getPageOverview.mockResolvedValue({ workflows: [documentedWorkflow] });
		const { wrapper, router } = await renderView();

		await fireEvent.click(await wrapper.findByTestId('page-overview-card'));

		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages/page-2'),
		);
		await waitFor(() => expect(wrapper.getByTestId('page-editor-title')).toHaveValue('Notes'));
		expect(wrapper.getByTestId('page-overview-button')).not.toHaveAttribute('aria-current');
	});

	it('returns to the board with the overview button and loads the overview again', async () => {
		api.getPageOverview.mockResolvedValue({ workflows: [documentedWorkflow] });
		const { wrapper, router } = await renderView('/projects/project-1/pages/page-1');
		await wrapper.findByTestId('page-editor-title');
		expect(api.getPageOverview).not.toHaveBeenCalled();

		await fireEvent.click(wrapper.getByTestId('page-overview-button'));

		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages'),
		);
		expect(await wrapper.findByTestId('page-overview-card')).toBeInTheDocument();
		expect(api.getPageOverview).toHaveBeenCalledWith(expect.anything(), 'project-1');
	});

	it('shows the board for a project that has workflows and no page', async () => {
		api.listPages.mockResolvedValue([]);
		api.getPageOverview.mockResolvedValue({ workflows: [createOverviewWorkflow()] });
		const { wrapper } = await renderView();

		expect(await wrapper.findByTestId('page-overview-card-undocumented')).toBeInTheDocument();
		expect(wrapper.queryByTestId('pages-empty-state')).not.toBeInTheDocument();
	});

	it('opens the page that the board creates for a workflow', async () => {
		const created = createPage({ id: 'page-3', title: 'Sync orders', content: '' });
		api.listPages.mockResolvedValue([]);
		api.getPageOverview.mockResolvedValue({ workflows: [createOverviewWorkflow()] });
		api.createPage.mockResolvedValue(created);
		api.getPage.mockResolvedValue(created);
		const { wrapper, router } = await renderView();

		await fireEvent.click(await wrapper.findByTestId('page-overview-card-write'));

		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages/page-3'),
		);
	});

	it('opens the page that the user selects', async () => {
		const { wrapper, router } = await renderView('/projects/project-1/pages/page-1');
		await waitFor(() => expect(wrapper.getAllByTestId('page-list-item')).toHaveLength(2));

		await fireEvent.click(wrapper.getAllByTestId('page-list-item')[1]);

		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages/page-2'),
		);
		await waitFor(() => expect(wrapper.getByTestId('page-editor-title')).toHaveValue('Notes'));
	});

	it('creates a page, opens it and puts the focus on its title', async () => {
		const created = createPage({ id: 'page-3', title: 'Untitled', content: '' });
		api.createPage.mockResolvedValue(created);
		api.getPage.mockResolvedValue(created);
		const { wrapper, router } = await renderView('/projects/project-1/pages/page-1');

		await fireEvent.click(await wrapper.findByTestId('page-create-button'));

		expect(api.createPage).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			title: 'Untitled',
		});
		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages/page-3'),
		);
		expect(wrapper.getAllByTestId('page-list-item')).toHaveLength(3);
		await waitFor(() => expect(wrapper.getByTestId('page-editor-title')).toHaveFocus());
	});

	it('saves a changed title and tells the user', async () => {
		api.updatePage.mockResolvedValue(createPage({ title: 'Runbook v2', version: 2 }));
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');
		const title = await wrapper.findByTestId('page-editor-title');

		await fireEvent.update(title, 'Runbook v2');

		await waitFor(() =>
			expect(wrapper.getByTestId('page-save-status')).toHaveTextContent('Saving…'),
		);
		await waitFor(
			() => expect(wrapper.getByTestId('page-save-status')).toHaveTextContent('Saved'),
			{ timeout: PAGE_AUTOSAVE_DEBOUNCE_MS * 3 },
		);
		expect(api.updatePage).toHaveBeenCalledWith(expect.anything(), 'project-1', 'page-1', {
			title: 'Runbook v2',
			baseVersion: 1,
		});
		expect(wrapper.getAllByTestId('page-list-item')[0]).toHaveTextContent('Runbook v2');
	});

	it('hides the tour button for a page that links to no node', async () => {
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');
		await wrapper.findByTestId('page-editor-title');

		expect(wrapper.queryByTestId('page-start-tour-button')).not.toBeInTheDocument();
	});

	it('opens the workflow of the first node link with a request to start the tour', async () => {
		api.getPage.mockResolvedValue(
			createPage({
				content: 'First [Webhook](/workflow/wf-1/n-1), then [Other](/workflow/wf-2/n-2).',
			}),
		);
		const { wrapper, router } = await renderView('/projects/project-1/pages/page-1');

		const button = await wrapper.findByTestId('page-start-tour-button');
		expect(button).toHaveTextContent('Start tour');
		await fireEvent.click(button);

		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/workflow/wf-1?pageTour=page-1'),
		);
	});

	it('shows where the open page is linked from', async () => {
		api.getPageBacklinks.mockResolvedValue({
			pages: [toSummary(notes)],
			workflows: [
				{ workflowId: 'wf-1', workflowName: 'Sync orders', nodeId: 'n-1', nodeName: 'Note' },
			],
		});
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');

		const backlinks = await wrapper.findByTestId('page-backlinks');

		expect(api.getPageBacklinks).toHaveBeenCalledWith(expect.anything(), 'page-1');
		expect(backlinks).toHaveTextContent('Links');
		expect(wrapper.getByTestId('page-backlinks-workflow')).toHaveTextContent('Sync orders');
		expect(wrapper.getByTestId('page-backlinks-page')).toHaveTextContent('Notes');
	});

	it('hides the backlinks of a page that nothing links to', async () => {
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');
		await wrapper.findByTestId('page-editor-title');
		await waitFor(() => expect(api.getPageBacklinks).toHaveBeenCalled());

		expect(wrapper.queryByTestId('page-backlinks')).not.toBeInTheDocument();
	});

	it('loads the backlinks again when the user opens another page and after a save', async () => {
		api.updatePage.mockResolvedValue(createPage({ ...notes, title: 'Notes v2', version: 2 }));
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');
		await waitFor(() => expect(wrapper.getAllByTestId('page-list-item')).toHaveLength(2));

		await fireEvent.click(wrapper.getAllByTestId('page-list-item')[1]);
		await waitFor(() =>
			expect(api.getPageBacklinks).toHaveBeenLastCalledWith(expect.anything(), 'page-2'),
		);
		await waitFor(() => expect(wrapper.getByTestId('page-editor-title')).toHaveValue('Notes'));
		const callsBeforeSave = api.getPageBacklinks.mock.calls.length;
		await fireEvent.update(wrapper.getByTestId('page-editor-title'), 'Notes v2');

		await waitFor(
			() => expect(api.getPageBacklinks.mock.calls.length).toBeGreaterThan(callsBeforeSave),
			{ timeout: PAGE_AUTOSAVE_DEBOUNCE_MS * 3 },
		);
	});

	it('tells when the open page was last edited', async () => {
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');

		expect(await wrapper.findByTestId('page-edited-time')).toHaveTextContent(/^Edited .+ ago$/);
	});

	it('uses a leading emoji of a title as the icon of the page in the list', async () => {
		api.listPages.mockResolvedValue([
			toSummary(createPage({ title: '🚀 Launch plan' })),
			toSummary(notes),
		]);
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');

		await waitFor(() => expect(wrapper.getAllByTestId('page-list-item')).toHaveLength(2));
		const [launch, plain] = wrapper.getAllByTestId('page-list-item');

		expect(within(launch).getByTestId('page-resource-emoji')).toHaveTextContent('🚀');
		expect(launch).toHaveTextContent('Launch plan');
		expect(within(plain).queryByTestId('page-resource-emoji')).not.toBeInTheDocument();
	});

	it('deletes the page after the user confirms', async () => {
		api.deletePage.mockResolvedValue(undefined);
		const { wrapper, router } = await renderView('/projects/project-1/pages/page-1');

		await fireEvent.click(await wrapper.findByTestId('page-delete-button'));
		await fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

		await waitFor(() =>
			expect(api.deletePage).toHaveBeenCalledWith(expect.anything(), 'project-1', 'page-1'),
		);
		await waitFor(() =>
			expect(router.currentRoute.value.fullPath).toBe('/projects/project-1/pages/page-2'),
		);
		expect(wrapper.getAllByTestId('page-list-item')).toHaveLength(1);
	});

	it('shows a call to action when the project has no page', async () => {
		api.listPages.mockResolvedValue([]);
		const { wrapper } = await renderView();

		expect(await wrapper.findByText('Write your first page')).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'New page' })).toBeInTheDocument();
		expect(wrapper.getByTestId('page-writing-tips')).toHaveTextContent(
			'Paste any n8n URL to link it',
		);
	});

	it('hides create and delete and blocks editing for a user who can only read', async () => {
		provideScopes(['page:read', 'page:list']);
		const { wrapper } = await renderView('/projects/project-1/pages/page-1');

		expect(await wrapper.findByTestId('page-editor-title')).toHaveAttribute('readonly');
		expect(wrapper.queryByTestId('page-create-button')).not.toBeInTheDocument();
		expect(wrapper.queryByTestId('page-delete-button')).not.toBeInTheDocument();
	});
});
