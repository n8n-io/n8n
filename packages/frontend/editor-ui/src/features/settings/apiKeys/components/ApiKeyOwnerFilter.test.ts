import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { IUser } from '@n8n/design-system';

import { createComponentRenderer } from '@/__tests__/render';
import ApiKeyOwnerFilter from './ApiKeyOwnerFilter.vue';

const users: IUser[] = [
	{ id: 'u1', firstName: 'Alice', lastName: 'Anderson', email: 'alice@example.com' },
	{ id: 'u2', firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' },
	{ id: 'u3', firstName: 'Carol', lastName: 'Clark', email: 'carol@example.com' },
];

const counts = { u1: 3, u2: 1, u3: 2 };

const renderComponent = createComponentRenderer(ApiKeyOwnerFilter, {
	props: { users, counts, totalCount: 6 },
});

describe('ApiKeyOwnerFilter', () => {
	it('reads an empty selection as "all owners" in the trigger', () => {
		const { getByTestId } = renderComponent({ props: { modelValue: [] } });

		const trigger = getByTestId('api-key-owner-filter-trigger');
		expect(trigger).toHaveTextContent('All owners');
		// Pill shows the owner count in the all-state.
		expect(trigger).toHaveTextContent('3');
	});

	it("shows the owner's name when exactly one owner is selected", () => {
		const { getByTestId } = renderComponent({ props: { modelValue: ['u1'] } });

		expect(getByTestId('api-key-owner-filter-trigger')).toHaveTextContent('Alice Anderson');
	});

	it('shows "N owners" when multiple owners are selected', () => {
		const { getByTestId } = renderComponent({ props: { modelValue: ['u1', 'u2'] } });

		expect(getByTestId('api-key-owner-filter-trigger')).toHaveTextContent('2 owners');
	});

	it('toggles an owner on and emits the updated selection', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: [] } });

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-option-u2')).toBeVisible());

		await userEvent.click(getByTestId('api-key-owner-filter-option-u2'));

		expect(emitted()['update:modelValue']).toContainEqual([['u2']]);
	});

	it('clears to all owners (empty stays empty) when toggling the "All owners" row while all selected', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['u1', 'u2', 'u3'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-all')).toBeVisible());

		await userEvent.click(getByTestId('api-key-owner-filter-all'));

		// All selected → toggling "All" deselects everything (empty == no narrowing).
		expect(emitted()['update:modelValue']).toContainEqual([[]]);
	});

	it('reverts an empty selection back to all owners when the panel closes', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { modelValue: [] } });

		// Open, then close again — an empty selection must not "stick".
		const trigger = getByTestId('api-key-owner-filter-trigger');
		await userEvent.click(trigger);
		await waitFor(() => expect(getByTestId('api-key-owner-filter-all')).toBeVisible());
		await userEvent.click(trigger);

		await waitFor(() =>
			expect(emitted()['update:modelValue']).toContainEqual([['u1', 'u2', 'u3']]),
		);
	});
});
