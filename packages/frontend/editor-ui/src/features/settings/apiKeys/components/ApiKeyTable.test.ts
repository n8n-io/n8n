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
});
