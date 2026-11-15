import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import PreferencesTable from './PreferencesTable.vue';
import type { Scope } from '@n8n/permissions';

import type { Preference } from '../context.types';

const WRITABLE: Scope[] = ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'];
const READ_ONLY: Scope[] = ['aiPreference:read'];

function preference(overrides: Partial<Preference> = {}): Preference {
	return {
		id: 'p1',
		content: 'Keep replies short.',
		userId: 'user-1',
		user: null,
		projectId: null,
		project: null,
		source: 'ui',
		createdBy: null,
		scopes: WRITABLE,
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
		...overrides,
	};
}

const renderTable = createComponentRenderer(PreferencesTable);

function render(preferences: Preference[], showEmpty = false) {
	return renderTable({
		props: { preferences, itemsLength: preferences.length, loading: false, showEmpty },
	});
}

async function openActions(table: HTMLElement) {
	await userEvent.click(within(table).getByTestId('preference-actions').querySelector('button')!);
}

function menuItem(action: 'edit' | 'delete') {
	return document.querySelector(`[data-test-id="action-${action}"]`);
}

describe('PreferencesTable', () => {
	beforeEach(() => {
		createTestingPinia({
			initialState: {
				[STORES.PROJECTS]: {
					personalProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
				},
			},
		});
		mockedStore(useUsersStore).currentUser = mock<IUser>({ id: 'user-1' });
	});

	it('renders one row for each preference', () => {
		const { getByText } = render([
			preference({ id: 'a', content: 'First preference' }),
			preference({ id: 'b', content: 'Second preference' }),
		]);

		expect(getByText('First preference')).toBeInTheDocument();
		expect(getByText('Second preference')).toBeInTheDocument();
	});

	it('labels the scope of each row', () => {
		const { getAllByTestId } = render([
			preference({ id: 'a', userId: 'user-1' }),
			preference({ id: 'b', userId: null }),
			preference({
				id: 'c',
				userId: null,
				user: null,
				projectId: 'proj',
				project: { id: 'proj', name: 'Darwin', type: 'team', icon: null },
			}),
		]);

		const badges = getAllByTestId('preference-scope-badge');
		expect(badges[0]).toHaveTextContent('Just you · All projects');
		expect(badges[0].querySelector('[data-icon="user"]')).not.toBeNull();
		expect(badges[1]).toHaveTextContent('Global');
		expect(badges[1].querySelector('[data-icon="globe"]')).not.toBeNull();
		expect(badges[2]).toHaveTextContent('Darwin');
	});

	it('renders every scope badge with the same style', () => {
		const { getAllByTestId } = render([
			preference({ id: 'a', userId: 'user-1' }),
			preference({ id: 'b', userId: null }),
			preference({
				id: 'c',
				userId: null,
				projectId: 'personal-1',
				project: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal', icon: null },
			}),
		]);

		const classes = getAllByTestId('preference-scope-badge').map((badge) => badge.className);
		expect(new Set(classes).size).toBe(1);
	});

	it('names the owner of rows that reach another user, as an admin sees them', () => {
		const { getAllByTestId } = render([
			preference({
				id: 'a',
				userId: 'user-2',
				user: { id: 'user-2', email: 'jane@acme.com', firstName: 'Jane', lastName: 'Doe' },
			}),
			preference({
				id: 'b',
				userId: null,
				projectId: 'personal-2',
				project: {
					id: 'personal-2',
					name: 'John Roe <john@acme.com>',
					type: 'personal',
					icon: null,
				},
			}),
			preference({
				id: 'c',
				userId: null,
				projectId: 'personal-1',
				project: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal', icon: null },
			}),
		]);

		const badges = getAllByTestId('preference-scope-badge');
		expect(badges[0]).toHaveTextContent('Jane Doe · All projects');
		expect(badges[1]).toHaveTextContent('John Roe · Personal project');
		expect(badges[2]).toHaveTextContent('Just you · Personal project');
	});

	// Undo rests on the person recognising what a connected tool wrote on their behalf.
	it('names the author of each row and the surface that wrote it', () => {
		const jane = { id: 'user-2', email: 'jane@acme.com', firstName: 'Jane', lastName: 'Doe' };
		const { getAllByTestId } = render([
			preference({ id: 'a', source: 'ui', createdBy: jane }),
			preference({ id: 'b', source: 'aia', createdBy: jane }),
			preference({ id: 'c', source: 'mcp', createdBy: jane }),
		]);

		const authors = getAllByTestId('preference-created-by');
		authors.forEach((author) => {
			expect(author).toHaveTextContent('Jane Doe');
			expect(author).toHaveTextContent('jane@acme.com');
			expect(within(author).queryByTestId('user-avatar')).not.toBeInTheDocument();
		});
		expect(within(authors[0]).queryByTestId('preference-source')).not.toBeInTheDocument();
		expect(within(authors[1]).getByTestId('preference-source')).toHaveTextContent('n8n assistant');
		expect(within(authors[2]).getByTestId('preference-source')).toHaveTextContent('MCP');
	});

	it('names only the surface when the author no longer exists', () => {
		const { getAllByTestId } = render([
			preference({ id: 'a', source: 'ui', createdBy: null }),
			preference({ id: 'b', source: 'aia', createdBy: null }),
			preference({ id: 'c', source: 'mcp', createdBy: null }),
		]);

		const authors = getAllByTestId('preference-created-by');
		expect(authors[0]).toHaveTextContent('Settings');
		expect(authors[1]).toHaveTextContent('n8n assistant');
		expect(authors[2]).toHaveTextContent('MCP');
	});

	it('shows when each row was last updated', () => {
		const { getByText, getByTestId } = render([preference()]);

		expect(getByText('Last updated')).toBeInTheDocument();
		expect(getByTestId('preference-updated-at')).not.toBeEmptyDOMElement();
	});

	// Other n8n tables use the horizontal ellipsis for the row menu.
	it('shows the row menu as a horizontal ellipsis', () => {
		const { getByTestId } = render([preference()]);

		const toggle = getByTestId('preference-actions');
		expect(toggle.querySelector('[data-icon="ellipsis-12"]')).not.toBeNull();
		expect(toggle.querySelector('[data-icon="ellipsis-vertical-12"]')).toBeNull();
	});

	it('enables both actions when the row carries write scopes', async () => {
		const { getByTestId } = render([preference({ scopes: WRITABLE })]);

		await openActions(getByTestId('preferences-table'));

		await waitFor(() => expect(menuItem('edit')).toBeInTheDocument());
		expect(menuItem('edit')).not.toHaveAttribute('data-disabled');
		expect(menuItem('delete')).not.toHaveAttribute('data-disabled');
	});

	it('disables both actions on a read-only row', async () => {
		const { getByTestId } = render([preference({ scopes: READ_ONLY })]);

		await openActions(getByTestId('preferences-table'));

		await waitFor(() => expect(menuItem('edit')).toHaveAttribute('data-disabled'));
		expect(menuItem('delete')).toHaveAttribute('data-disabled');
	});

	// The data table renders its cover row whenever the slot exists, so an always-on
	// slot would leave a blank row above the data.
	it('renders no cover row while rows are shown', () => {
		const { container } = render([preference()], false);

		expect(container.querySelector('td.cover')).toBeNull();
	});

	it('renders the cover row only when asked for the empty state', () => {
		const { container } = renderTable({
			props: { preferences: [], itemsLength: 0, loading: false, showEmpty: true },
			slots: { empty: '<div data-test-id="stub-empty">No preferences yet</div>' },
		});

		expect(container.querySelector('td.cover')).not.toBeNull();
	});

	it('emits edit and delete for a writable row', async () => {
		const row = preference({ scopes: WRITABLE });
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('preferences-table'));
		await waitFor(() => expect(menuItem('edit')).toBeInTheDocument());
		await userEvent.click(menuItem('edit')!);

		await openActions(getByTestId('preferences-table'));
		await waitFor(() => expect(menuItem('delete')).toBeInTheDocument());
		await userEvent.click(menuItem('delete')!);

		expect(emitted().edit).toEqual([[row]]);
		expect(emitted().delete).toEqual([[row]]);
	});

	it('emits edit when a writable row is clicked', async () => {
		const row = preference({ scopes: WRITABLE });
		const { getByText, emitted } = render([row]);

		await userEvent.click(getByText('Keep replies short.'));

		expect(emitted().edit).toEqual([[row]]);
	});

	it('does not emit edit when a read-only row is clicked', async () => {
		const { getByText, emitted } = render([preference({ scopes: READ_ONLY })]);

		await userEvent.click(getByText('Keep replies short.'));

		expect(emitted().edit).toBeUndefined();
	});

	it('selects the row without opening it when its checkbox is clicked', async () => {
		const { getAllByRole, emitted } = render([preference({ scopes: WRITABLE })]);

		// The first checkbox is the header one; the second belongs to the row.
		await userEvent.click(getAllByRole('checkbox')[1]);

		expect(emitted().edit).toBeUndefined();
		expect(emitted()['update:selection']).toEqual([[['p1']]]);
	});
});
