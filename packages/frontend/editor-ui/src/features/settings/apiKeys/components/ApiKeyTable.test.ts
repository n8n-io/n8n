import { fireEvent, screen } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { renderComponent } from '@/__tests__/render';
import ApiKeyTable from './ApiKeyTable.vue';
import type { ApiKey, ApiKeyOwner } from '@n8n/api-types';

setActivePinia(createTestingPinia());

const ownerFixture: ApiKeyOwner = {
	id: 'u1',
	firstName: 'Test',
	lastName: 'User',
	email: 'test@n8n.io',
};

function makeKey(overrides: Partial<ApiKey> = {}): ApiKey {
	return {
		id: '1',
		label: 'key-1',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		apiKey: '****abcd',
		expiresAt: null,
		scopes: ['user:create'],
		lastUsedAt: null,
		owner: ownerFixture,
		...overrides,
	};
}

describe('ApiKeyTable', () => {
	it('emits edit when a non-own row is clicked, never revoke', async () => {
		const own = makeKey({ id: '1', label: 'mine' });
		const other = makeKey({
			id: '2',
			label: 'theirs',
			owner: { ...ownerFixture, id: 'u2', email: 'other@n8n.io' },
		});

		const { emitted } = renderComponent(ApiKeyTable, {
			props: {
				apiKeys: [own, other],
				itemsLength: 2,
				currentUserId: 'u1',
			},
		});

		// Owner cells have no own click handler — clicks bubble to the row, exercising onRowClick.
		const ownerCells = await screen.findAllByTestId('api-key-owner-cell');
		await fireEvent.click(ownerCells[1]);

		expect(emitted('edit')).toEqual([[other]]);
		expect(emitted('revoke')).toBeUndefined();
	});

	it('emits edit when an own row is clicked', async () => {
		const own = makeKey({ id: '1', label: 'mine' });

		const { emitted } = renderComponent(ApiKeyTable, {
			props: {
				apiKeys: [own],
				itemsLength: 1,
				currentUserId: 'u1',
			},
		});

		const ownerCells = await screen.findAllByTestId('api-key-owner-cell');
		await fireEvent.click(ownerCells[0]);

		expect(emitted('edit')).toEqual([[own]]);
		expect(emitted('revoke')).toBeUndefined();
	});

	it('emits open-scopes, not edit, when the scopes count is clicked', async () => {
		const key = makeKey();

		const { emitted } = renderComponent(ApiKeyTable, {
			props: {
				apiKeys: [key],
				itemsLength: 1,
				currentUserId: 'u1',
			},
		});

		await fireEvent.click(screen.getByTestId('api-key-scopes-cell'));

		expect(emitted('open-scopes')).toEqual([[key]]);
		// @click.stop on the cell: the row's edit handler must not also fire.
		expect(emitted('edit')).toBeUndefined();
	});

	it('toggles the Owner column when showOwner changes after mount', async () => {
		// Tab switches flip showOwner at runtime, so the column set must be reactive
		// (regression test for N8nDataTableServer receiving columns as a static array).
		const { rerender } = renderComponent(ApiKeyTable, {
			props: {
				apiKeys: [makeKey()],
				itemsLength: 1,
				currentUserId: 'u1',
			},
		});

		expect(screen.getByText('Owner')).toBeInTheDocument();
		expect(screen.getAllByTestId('api-key-owner-cell')).toHaveLength(1);

		await rerender({ showOwner: false });

		expect(screen.queryByText('Owner')).toBeNull();
		expect(screen.queryAllByTestId('api-key-owner-cell')).toHaveLength(0);
	});
});
