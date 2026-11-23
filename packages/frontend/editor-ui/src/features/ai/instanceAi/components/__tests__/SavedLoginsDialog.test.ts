import type { InstanceAiSavedLogin } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';

import { deleteSavedLogin, fetchSavedLogins } from '../../instanceAi.api';
import SavedLoginsDialog from '../SavedLoginsDialog.vue';

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('../../instanceAi.api', () => ({
	fetchSavedLogins: vi.fn(),
	deleteSavedLogin: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));

const renderComponent = createComponentRenderer(SavedLoginsDialog);

const github: InstanceAiSavedLogin = {
	id: 'login-1',
	domain: 'github.com',
	savedAt: '2026-10-01T10:00:00.000Z',
	lastUsedAt: '2026-10-30T10:00:00.000Z',
};
const linkedin: InstanceAiSavedLogin = {
	id: 'login-2',
	domain: 'linkedin.com',
	savedAt: '2026-10-20T10:00:00.000Z',
	lastUsedAt: '2026-10-05T10:00:00.000Z',
};
const amazon: InstanceAiSavedLogin = {
	id: 'login-3',
	domain: 'amazon.com',
	savedAt: '2026-10-10T10:00:00.000Z',
	lastUsedAt: '2026-10-15T10:00:00.000Z',
};

async function render(open = true) {
	const rendered = renderComponent({ props: { open } });
	await flushPromises();
	return rendered;
}

function rowDomains() {
	return screen
		.queryAllByTestId('saved-logins-row')
		.map(
			(row) =>
				[github, linkedin, amazon].find(({ domain }) => row.textContent?.includes(domain))?.domain,
		);
}

async function chooseSort(label: string) {
	await userEvent.click(screen.getByTestId('saved-logins-sort'));
	const listbox = await screen.findByRole('listbox');
	await userEvent.click(within(listbox).getByText(label));
	await flushPromises();
}

async function askToDelete(domain: string) {
	await userEvent.click(
		screen.getByRole('button', { name: `Delete the saved login for ${domain}` }),
	);
	return await screen.findByRole('dialog', { name: `Delete the login for ${domain}?` });
}

describe('SavedLoginsDialog', () => {
	beforeEach(() => {
		vi.mocked(fetchSavedLogins)
			.mockReset()
			.mockResolvedValue({ savedLogins: [github, linkedin, amazon] });
		vi.mocked(deleteSavedLogin).mockReset().mockResolvedValue(undefined);
		showError.mockReset();
	});

	describe('loading', () => {
		it('loads the saved logins when it opens', async () => {
			await render();

			expect(fetchSavedLogins).toHaveBeenCalledExactlyOnceWith({});
			expect(screen.getAllByTestId('saved-logins-row')).toHaveLength(3);
		});

		it('does not load while closed', async () => {
			await render(false);

			expect(fetchSavedLogins).not.toHaveBeenCalled();
		});

		it('loads again each time it opens', async () => {
			const { rerender } = await render(false);

			await rerender({ open: true });
			await flushPromises();
			await rerender({ open: false });
			await rerender({ open: true });
			await flushPromises();

			expect(fetchSavedLogins).toHaveBeenCalledTimes(2);
		});

		it('does not load again when it opens while a load still runs', async () => {
			let finishLoad = (_: { savedLogins: InstanceAiSavedLogin[] }) => {};
			vi.mocked(fetchSavedLogins).mockReturnValue(
				new Promise((resolve) => {
					finishLoad = resolve;
				}),
			);
			const { rerender } = await render();

			await rerender({ open: false });
			await rerender({ open: true });
			finishLoad({ savedLogins: [github] });
			await flushPromises();

			expect(fetchSavedLogins).toHaveBeenCalledTimes(1);
			expect(rowDomains()).toEqual(['github.com']);
		});

		it('shows a loading message while it loads', async () => {
			vi.mocked(fetchSavedLogins).mockReturnValue(new Promise(() => {}));
			renderComponent({ props: { open: true } });
			await flushPromises();

			expect(await screen.findByText('Loading saved logins…')).toBeInTheDocument();
			expect(screen.queryByTestId('saved-logins-empty')).not.toBeInTheDocument();
		});

		it('shows the date each login was last used', async () => {
			vi.mocked(fetchSavedLogins).mockResolvedValue({ savedLogins: [github] });
			await render();

			const row = screen.getByTestId('saved-logins-row');
			expect(row).toHaveTextContent('github.com');
			expect(row).toHaveTextContent('30 Oct 2026');
			expect(row).not.toHaveTextContent('1 Oct 2026');
		});

		it('shows the empty state when there are no saved logins', async () => {
			vi.mocked(fetchSavedLogins).mockResolvedValue({ savedLogins: [] });
			await render();

			expect(screen.getByTestId('saved-logins-empty')).toHaveTextContent('No saved logins yet.');
			expect(screen.queryByTestId('saved-logins-table')).not.toBeInTheDocument();
		});

		it('shows an error when loading fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(fetchSavedLogins).mockRejectedValue(error);
			await render();

			expect(showError).toHaveBeenCalledWith(error, 'Could not load your saved logins');
		});

		it('shows no error when loading fails after the dialog closed', async () => {
			let failLoad = (_: Error) => {};
			vi.mocked(fetchSavedLogins).mockReturnValue(
				new Promise((_, reject) => {
					failLoad = reject;
				}),
			);
			const { rerender } = await render();

			await rerender({ open: false });
			failLoad(new Error('Request failed'));
			await flushPromises();

			expect(showError).not.toHaveBeenCalled();
		});
	});

	describe('search', () => {
		it('shows only the logins whose site matches the search', async () => {
			await render();

			await userEvent.type(screen.getByPlaceholderText('Search'), 'LINKED');

			expect(rowDomains()).toEqual(['linkedin.com']);
		});

		it('ignores spaces around the search', async () => {
			await render();

			await userEvent.type(screen.getByPlaceholderText('Search'), '  github  ');

			expect(rowDomains()).toEqual(['github.com']);
		});

		it('says when no login matches the search', async () => {
			await render();

			await userEvent.type(screen.getByPlaceholderText('Search'), 'example.org');

			expect(screen.getByTestId('saved-logins-no-match')).toHaveTextContent(
				'No saved logins match your search.',
			);
			expect(screen.queryByTestId('saved-logins-table')).not.toBeInTheDocument();
			expect(screen.queryByTestId('saved-logins-empty')).not.toBeInTheDocument();
		});
	});

	describe('sort', () => {
		it('sorts by last used, newest first, by default', async () => {
			await render();

			expect(rowDomains()).toEqual(['github.com', 'amazon.com', 'linkedin.com']);
		});

		it('offers only the sorts that match the shown columns', async () => {
			await render();

			await userEvent.click(screen.getByTestId('saved-logins-sort'));
			const listbox = await screen.findByRole('listbox');

			expect(
				within(listbox)
					.getAllByRole('option')
					.map((option) => option.textContent),
			).toEqual(['Sort by last used', 'Sort by site']);
		});

		it('sorts by site name', async () => {
			await render();

			await chooseSort('Sort by site');

			expect(rowDomains()).toEqual(['amazon.com', 'github.com', 'linkedin.com']);
		});

		it('keeps the sort while searching', async () => {
			await render();
			await chooseSort('Sort by site');

			await userEvent.type(screen.getByPlaceholderText('Search'), 'n.com');

			expect(rowDomains()).toEqual(['amazon.com', 'linkedin.com']);
		});
	});

	describe('delete', () => {
		it('asks for confirmation before it deletes', async () => {
			await render();

			const dialog = await askToDelete('github.com');

			expect(dialog).toHaveTextContent(
				'You will need to sign in again the next time n8n Assistant opens this site.',
			);
			expect(deleteSavedLogin).not.toHaveBeenCalled();
		});

		it('deletes the login and removes it from the list after the user confirms', async () => {
			await render();
			const dialog = await askToDelete('github.com');

			await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
			await flushPromises();

			expect(deleteSavedLogin).toHaveBeenCalledExactlyOnceWith({}, 'login-1');
			expect(rowDomains()).toEqual(['amazon.com', 'linkedin.com']);
			await waitFor(() =>
				expect(
					screen.queryByRole('dialog', { name: 'Delete the login for github.com?' }),
				).not.toBeInTheDocument(),
			);
		});

		it('shows the empty state after the last login is deleted', async () => {
			vi.mocked(fetchSavedLogins).mockResolvedValue({ savedLogins: [github] });
			await render();
			const dialog = await askToDelete('github.com');

			await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
			await flushPromises();

			expect(screen.getByTestId('saved-logins-empty')).toBeInTheDocument();
		});

		it('does not delete when the user cancels', async () => {
			await render();
			const dialog = await askToDelete('github.com');

			await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
			await flushPromises();

			expect(deleteSavedLogin).not.toHaveBeenCalled();
			expect(screen.getAllByTestId('saved-logins-row')).toHaveLength(3);
			await waitFor(() =>
				expect(
					screen.queryByRole('dialog', { name: 'Delete the login for github.com?' }),
				).not.toBeInTheDocument(),
			);
		});

		it('shows an error and keeps the login when the delete fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(deleteSavedLogin).mockRejectedValue(error);
			await render();
			const dialog = await askToDelete('github.com');

			await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
			await flushPromises();

			expect(showError).toHaveBeenCalledWith(error, 'Could not delete the saved login');
			expect(screen.getAllByTestId('saved-logins-row')).toHaveLength(3);
			expect(
				screen.getByRole('dialog', { name: 'Delete the login for github.com?' }),
			).toBeInTheDocument();
		});
	});
});
