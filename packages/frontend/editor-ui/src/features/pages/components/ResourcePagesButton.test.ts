import type { Page, PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { useRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';

import type { PagesResource } from '../resourcePages';
import { usePagePeekStore } from '../pagePeek.store';
import ResourcePagesButton from './ResourcePagesButton.vue';

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

const credential: PagesResource = {
	resourceType: 'credential',
	resourceId: 'c1',
	projectId: 'p1',
};

const renderComponent = createComponentRenderer(ResourcePagesButton, {
	props: {
		resource: credential,
		resourceName: 'Slack account',
		projectId: 'p1',
		testIdPrefix: 'credential-pages',
	},
});

describe('ResourcePagesButton', () => {
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

	it('should load the pages that link to the resource', async () => {
		renderComponent();

		await waitFor(() =>
			expect(pageStore.listReferencing).toHaveBeenCalledWith({
				resourceType: 'credential',
				resourceId: 'c1',
			}),
		);
	});

	it('should show the number of pages and list them newest first', async () => {
		pageStore.listReferencing.mockResolvedValue([runbook, onboarding]);
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(getByTestId('credential-pages-button')).toHaveTextContent('2'));

		await userEvent.click(getByTestId('credential-pages-button'));

		const items = await screen.findAllByTestId('credential-pages-item');
		expect(items.map((item) => item.textContent)).toEqual([
			expect.stringContaining('Onboarding'),
			expect.stringContaining('Runbook'),
		]);
	});

	it('should name the kind of resource in the empty list and in the creation', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('credential-pages-button'));

		expect(await screen.findByTestId('credential-pages-empty')).toHaveTextContent(
			'Pages that link to this credential show up here.',
		);
		expect(screen.getByTestId('credential-pages-create')).toHaveTextContent(
			'New page for this credential',
		);
	});

	it('should load the pages again and emit `open` when the popover opens', async () => {
		const { getByTestId, emitted } = renderComponent();
		await waitFor(() => expect(pageStore.listReferencing).toHaveBeenCalledTimes(1));

		await userEvent.click(getByTestId('credential-pages-button'));

		await waitFor(() => expect(pageStore.listReferencing).toHaveBeenCalledTimes(2));
		expect(emitted('open')).toHaveLength(1);
	});

	it('should show a listed page in the side panel and stay on the resource', async () => {
		pageStore.listReferencing.mockResolvedValue([runbook]);
		const { getByTestId, emitted } = renderComponent();
		await userEvent.click(getByTestId('credential-pages-button'));

		await userEvent.click(await screen.findByTestId('credential-pages-item'));

		expect(usePagePeekStore().open).toHaveBeenCalledWith(runbook.id);
		expect(emitted('navigate')).toBeUndefined();
	});

	it('should create a page that links to the credential in its project and show it in the side panel', async () => {
		pageStore.createPage.mockResolvedValue({ ...runbook, id: 'new-page', content: '' } as Page);
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('credential-pages-button'));

		await userEvent.click(await screen.findByTestId('credential-pages-create'));

		expect(pageStore.createPage).toHaveBeenCalledWith('p1', {
			title: 'Slack account',
			content: 'Credential: [Slack account](/projects/p1/credentials/c1)\n\n',
		});
		await waitFor(() => expect(usePagePeekStore().open).toHaveBeenCalledWith('new-page'));
		expect(useRouter().push).not.toHaveBeenCalled();
	});

	it.each<[string, PagesResource, string]>([
		[
			'a data table',
			{ resourceType: 'dataTable', resourceId: 'd1', projectId: 'p1' },
			'Data table: [Slack account](/projects/p1/datatables/d1)\n\n',
		],
		[
			'a node',
			{ resourceType: 'node', resourceId: 'n1', workflowId: 'w1' },
			'Node: [Slack account](/workflow/w1/n1)\n\n',
		],
	])('should link a new page to %s', async (_, resource, content) => {
		pageStore.createPage.mockResolvedValue({ ...runbook, id: 'new-page', content: '' } as Page);
		const { getByTestId } = renderComponent({ props: { resource, testIdPrefix: 'x-pages' } });
		await userEvent.click(getByTestId('x-pages-button'));

		await userEvent.click(await screen.findByTestId('x-pages-create'));

		expect(pageStore.createPage).toHaveBeenCalledWith('p1', { title: 'Slack account', content });
	});

	it('should offer no creation without the permission', async () => {
		canCreate.value = false;
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('credential-pages-button'));

		await screen.findByTestId('credential-pages-popover');
		expect(screen.queryByTestId('credential-pages-create')).not.toBeInTheDocument();
	});
});
