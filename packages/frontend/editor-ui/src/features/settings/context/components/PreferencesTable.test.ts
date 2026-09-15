import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import userEvent from '@testing-library/user-event';
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
		expect(badges[1]).toHaveTextContent('Everyone');
		expect(badges[2]).toHaveTextContent('Darwin');
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

	it('enables both actions when the row carries write scopes', () => {
		const { getByTestId } = render([preference({ scopes: WRITABLE })]);

		expect(getByTestId('preference-edit-button')).toBeEnabled();
		expect(getByTestId('preference-delete-button')).toBeEnabled();
	});

	it('disables both actions on a read-only row', () => {
		const { getByTestId } = render([preference({ scopes: READ_ONLY })]);

		expect(getByTestId('preference-edit-button')).toBeDisabled();
		expect(getByTestId('preference-delete-button')).toBeDisabled();
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

		await userEvent.click(getByTestId('preference-edit-button'));
		await userEvent.click(getByTestId('preference-delete-button'));

		expect(emitted().edit).toEqual([[row]]);
		expect(emitted().delete).toEqual([[row]]);
	});
});
