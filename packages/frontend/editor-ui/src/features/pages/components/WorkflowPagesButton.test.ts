import type { Page, PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { useRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';

import { useNodePagesStore } from '../nodePages.store';
import { usePagePeekStore } from '../pagePeek.store';
import WorkflowPagesButton from './WorkflowPagesButton.vue';

const canCreate = vi.hoisted(() => ({ value: true }));

vi.mock('@n8n/frontend-module-page', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-page')>()),
	getPagePermissions: () => ({ canCreate: canCreate.value }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({
		push: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn().mockReturnValue({ href: '/page/href' }),
	}),
}));

const toSummary = (id: string, title: string, updatedAt: string): PageSummary => ({
	id,
	title,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt,
});

const runbook = toSummary('page-1', 'Runbook', '2026-11-02T00:00:00.000Z');
const onboarding = toSummary('page-2', 'Onboarding', '2026-11-05T00:00:00.000Z');

const renderComponent = createComponentRenderer(WorkflowPagesButton, {
	props: { workflowId: 'w1', workflowName: 'Sync orders', projectId: 'p1' },
});

describe('WorkflowPagesButton', () => {
	let pageStore: MockedStore<typeof usePageStore>;

	beforeEach(() => {
		createTestingPinia();
		pageStore = mockedStore(usePageStore);
		pageStore.listReferencing.mockResolvedValue([]);
		canCreate.value = true;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should load the pages that link to the workflow', async () => {
		renderComponent();

		await waitFor(() =>
			expect(pageStore.listReferencing).toHaveBeenCalledWith({
				resourceType: 'workflow',
				resourceId: 'w1',
			}),
		);
	});

	it('should show the number of pages on the button', async () => {
		pageStore.listReferencing.mockResolvedValue([runbook, onboarding]);

		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('workflow-pages-button')).toHaveTextContent('2'));
	});

	it('should show no number when no page links to the workflow', async () => {
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(pageStore.listReferencing).toHaveBeenCalled());

		expect(getByTestId('workflow-pages-button').textContent?.trim()).toBe('');
	});

	it('should list the pages in the popover, newest first', async () => {
		pageStore.listReferencing.mockResolvedValue([runbook, onboarding]);
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('workflow-pages-button'));

		await waitFor(() => expect(screen.getAllByTestId('workflow-pages-item')).toHaveLength(2));
		const titles = screen.getAllByTestId('workflow-pages-item').map((item) => item.textContent);
		expect(titles[0]).toContain('Onboarding');
		expect(titles[1]).toContain('Runbook');
	});

	it('should load the pages again when the popover opens', async () => {
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(pageStore.listReferencing).toHaveBeenCalledTimes(1));

		await userEvent.click(getByTestId('workflow-pages-button'));

		await waitFor(() => expect(pageStore.listReferencing).toHaveBeenCalledTimes(2));
	});

	it('should load the pages of the nodes on mount and when the popover opens', async () => {
		const nodePagesStore = mockedStore(useNodePagesStore);
		const { getByTestId } = renderComponent();
		expect(nodePagesStore.refresh).toHaveBeenCalledTimes(1);
		expect(nodePagesStore.refresh).toHaveBeenCalledWith('w1');

		await userEvent.click(getByTestId('workflow-pages-button'));

		await waitFor(() => expect(nodePagesStore.refresh).toHaveBeenCalledTimes(2));
	});

	it('should explain the empty list', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('workflow-pages-button'));

		await waitFor(() =>
			expect(screen.getByTestId('workflow-pages-empty')).toHaveTextContent(
				'Pages that link to this workflow show up here.',
			),
		);
	});

	it('should create a page that links to the workflow and show it in the side panel', async () => {
		pageStore.createPage.mockResolvedValue({ ...runbook, id: 'new-page', content: '' } as Page);
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('workflow-pages-button'));

		await userEvent.click(await screen.findByTestId('workflow-pages-create'));

		expect(pageStore.createPage).toHaveBeenCalledWith('p1', {
			title: 'Sync orders',
			content: 'Workflow: [Sync orders](/workflow/w1)\n\n',
		});
		await waitFor(() => expect(usePagePeekStore().open).toHaveBeenCalledWith('new-page'));
		expect(useRouter().push).not.toHaveBeenCalled();
	});

	it('should offer no creation without the permission', async () => {
		canCreate.value = false;
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('workflow-pages-button'));

		await screen.findByTestId('workflow-pages-popover');
		expect(screen.queryByTestId('workflow-pages-create')).not.toBeInTheDocument();
	});

	it('should offer no creation without a project', async () => {
		const { getByTestId } = renderComponent({ props: { projectId: undefined } });

		await userEvent.click(getByTestId('workflow-pages-button'));

		await screen.findByTestId('workflow-pages-popover');
		expect(screen.queryByTestId('workflow-pages-create')).not.toBeInTheDocument();
	});
});
