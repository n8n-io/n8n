import { fireEvent, render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import { consumeRemovedHere } from '../composables/useRemoveUiExtension';
import * as api from '../ui-extensions.api';
import { UI_EXTENSION_PAGE_VIEW } from '../ui-extensions.constants';
import { useSidePanelStore } from '../ui-extensions.store';
import UiExtensionPagesNav from './UiExtensionPagesNav.vue';

vi.mock('../ui-extensions.api');

const { confirm, showMessage, showError } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	useMessage: () => ({ confirm }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const page = (id: string, updatedAt: string) => ({
	id,
	kind: 'page' as const,
	title: `Page ${id}`,
	source: 'x',
	updatedAt,
});

async function renderNav(collapsed = false, path = '/') {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: { template: '<div />' } },
			{
				path: '/extensions/pages/:pageId',
				name: UI_EXTENSION_PAGE_VIEW,
				component: { template: '<div />' },
			},
		],
	});
	await router.push(path);
	await router.isReady();
	const result = render(UiExtensionPagesNav, {
		props: { collapsed },
		global: { plugins: [router] },
	});
	await useSidePanelStore().fetchViews();
	await flushPromises();
	return result;
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
	vi.mocked(api.fetchUiExtensionViews)
		.mockReset()
		.mockResolvedValue([
			page('b', '2026-01-02T00:00:00.000Z'),
			page('a', '2026-01-01T00:00:00.000Z'),
		]);
	vi.mocked(api.deleteUiExtensionView).mockReset().mockResolvedValue();
});

describe('UiExtensionPagesNav', () => {
	it('lists the built-in pages first, then the pages of the user from the oldest change', async () => {
		const { getAllByTestId } = await renderNav();

		expect(getAllByTestId('ui-extensions-page-menu-item').map((el) => el.textContent)).toEqual([
			expect.stringContaining('Automation dashboard'),
			expect.stringContaining('Notion docs'),
			expect.stringContaining('Page a'),
			expect.stringContaining('Page b'),
		]);
	});

	it('links each item to its page route', async () => {
		const { getAllByTestId } = await renderNav();

		const link = getAllByTestId('ui-extensions-page-menu-item')[2].querySelector('a');
		expect(link?.getAttribute('href')).toBe('/extensions/pages/a');
	});

	it('shows a remove button on the pages of the user only', async () => {
		const { getAllByTestId, getByRole } = await renderNav();

		expect(getAllByTestId('ui-extensions-page-remove')).toHaveLength(2);
		expect(getByRole('button', { name: 'Remove Page a' })).toBeTruthy();
	});

	it('shows no remove button while the sidebar is collapsed', async () => {
		const { queryByTestId } = await renderNav(true);

		expect(queryByTestId('ui-extensions-page-remove')).toBeNull();
	});

	it('removes a page after the user confirms, and marks it as removed here', async () => {
		confirm.mockResolvedValue('confirm');
		const { getByRole, queryByText } = await renderNav();
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([page('b', '2026-01-02T00:00:00.000Z')]);

		await fireEvent.click(getByRole('button', { name: 'Remove Page a' }));
		await flushPromises();

		expect(confirm).toHaveBeenCalledWith(
			expect.stringContaining('"Page a"'),
			'Remove page?',
			expect.objectContaining({ confirmButtonText: 'Remove' }),
		);
		expect(api.deleteUiExtensionView).toHaveBeenCalledWith(expect.anything(), 'a');
		expect(queryByText('Page a')).toBeNull();
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success', title: 'Removed the page "Page a"' }),
		);
		// So the open page view does not show a second toast.
		expect(consumeRemovedHere('a')).toBe(true);
		expect(consumeRemovedHere('a')).toBe(false);
	});

	it('keeps the page when the user cancels', async () => {
		confirm.mockResolvedValue('cancel');
		const { getByRole, getByText } = await renderNav();

		await fireEvent.click(getByRole('button', { name: 'Remove Page a' }));
		await flushPromises();

		expect(api.deleteUiExtensionView).not.toHaveBeenCalled();
		expect(getByText('Page a')).toBeTruthy();
	});

	it('keeps the page, shows an error and forgets the removal when it fails', async () => {
		confirm.mockResolvedValue('confirm');
		vi.mocked(api.deleteUiExtensionView).mockRejectedValue(new Error('offline'));
		const { getByRole, getByText } = await renderNav();

		await fireEvent.click(getByRole('button', { name: 'Remove Page a' }));
		await flushPromises();

		expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't remove the page");
		expect(showMessage).not.toHaveBeenCalled();
		expect(getByText('Page a')).toBeTruthy();
		// A later "page was removed" redirect for this page still shows its toast.
		expect(consumeRemovedHere('a')).toBe(false);
	});

	it('escapes a title from an MCP client in the dialog, and gives the toast the plain title', async () => {
		confirm.mockResolvedValue('confirm');
		const title = '<a href="https://example.com">Pay</a>';
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([
			{ ...page('x', '2026-01-03T00:00:00.000Z'), title },
		]);
		const { getByRole } = await renderNav();
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([]);

		await fireEvent.click(getByRole('button', { name: `Remove ${title}` }));
		await flushPromises();

		const [message] = confirm.mock.calls[0] as [string];
		expect(message).toContain('&lt;a href=');
		expect(message).not.toContain('<a');
		// The toast shows its title as text, so it gets the title unescaped.
		const [toast] = showMessage.mock.calls[0] as [{ title: string }];
		expect(toast.title).toBe(`Removed the page "${title}"`);
	});
});
