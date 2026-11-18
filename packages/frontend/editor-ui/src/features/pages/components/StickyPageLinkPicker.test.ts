import type { Page, PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';

import StickyPageLinkPicker from './StickyPageLinkPicker.vue';

const canCreate = vi.hoisted(() => ({ value: true }));

vi.mock('@n8n/frontend-module-page', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-page')>()),
	getPagePermissions: () => ({ canCreate: canCreate.value }),
}));

const toSummary = (id: string, title: string): PageSummary => ({
	id,
	title,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-01T00:00:00.000Z',
});

const pages = [toSummary('page-1', 'Runbook'), toSummary('page-2', 'Onboarding')];

const renderComponent = createComponentRenderer(StickyPageLinkPicker, {
	props: { projectId: 'p1', workflowName: 'Sync orders' },
});

describe('StickyPageLinkPicker', () => {
	let pageStore: MockedStore<typeof usePageStore>;

	beforeEach(() => {
		createTestingPinia();
		pageStore = mockedStore(usePageStore);
		pageStore.pagesOf.mockReturnValue(pages);
		pageStore.fetchPages.mockResolvedValue(pages);
		canCreate.value = true;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	async function openPicker() {
		const rendered = renderComponent();
		await userEvent.click(rendered.getByTestId('sticky-link-page-button'));
		await screen.findByTestId('sticky-page-picker');
		return rendered;
	}

	it('should load the pages of the project when it opens', async () => {
		await openPicker();

		expect(pageStore.fetchPages).toHaveBeenCalledWith('p1');
		expect(screen.getAllByTestId('sticky-page-picker-item')).toHaveLength(2);
	});

	it('should emit the picked page', async () => {
		const { emitted } = await openPicker();

		await userEvent.click(screen.getByText('Onboarding'));

		expect(emitted().link).toEqual([['page-2']]);
	});

	it('should filter the pages by title', async () => {
		await openPicker();

		await userEvent.type(screen.getByRole('textbox'), 'run');

		await waitFor(() => expect(screen.getAllByTestId('sticky-page-picker-item')).toHaveLength(1));
		expect(screen.getByTestId('sticky-page-picker-item')).toHaveTextContent('Runbook');
	});

	it('should tell when no page matches the search', async () => {
		await openPicker();

		await userEvent.type(screen.getByRole('textbox'), 'invoice');

		await waitFor(() =>
			expect(screen.getByTestId('sticky-page-picker-empty')).toHaveTextContent(
				'No page matches your search.',
			),
		);
	});

	it('should create a page titled after the workflow and emit it', async () => {
		pageStore.createPage.mockResolvedValue({ ...pages[0], id: 'new-page', content: '' } as Page);
		const { emitted } = await openPicker();

		await userEvent.click(screen.getByTestId('sticky-page-picker-create'));

		expect(pageStore.createPage).toHaveBeenCalledWith('p1', { title: 'Sync orders' });
		await waitFor(() => expect(emitted().link).toEqual([['new-page']]));
	});

	it('should offer no creation without the permission', async () => {
		canCreate.value = false;

		await openPicker();

		expect(screen.queryByTestId('sticky-page-picker-create')).not.toBeInTheDocument();
	});
});
