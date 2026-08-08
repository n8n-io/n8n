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

	it('filters the owner list by name (case-insensitive) as you type', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { modelValue: [] } });

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-option-u1')).toBeVisible());

		await userEvent.type(getByTestId('api-key-owner-filter-search'), 'alice');

		await waitFor(() => {
			// Only Alice matches the name needle; Bob and Carol are filtered out.
			expect(getByTestId('api-key-owner-filter-option-u1')).toBeVisible();
			expect(queryByTestId('api-key-owner-filter-option-u2')).toBeNull();
			expect(queryByTestId('api-key-owner-filter-option-u3')).toBeNull();
		});
	});

	it('filters the owner list by email (case-insensitive) as you type', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { modelValue: [] } });

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-option-u2')).toBeVisible());

		// Match on the email local-part only (no name contains "bob@").
		await userEvent.type(getByTestId('api-key-owner-filter-search'), 'BOB@EXAMPLE');

		await waitFor(() => {
			expect(getByTestId('api-key-owner-filter-option-u2')).toBeVisible();
			expect(queryByTestId('api-key-owner-filter-option-u1')).toBeNull();
			expect(queryByTestId('api-key-owner-filter-option-u3')).toBeNull();
		});
	});

	it('shows the no-results text when the search matches nobody', async () => {
		const { getByTestId, getByText } = renderComponent({ props: { modelValue: [] } });

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-option-u1')).toBeVisible());

		await userEvent.type(getByTestId('api-key-owner-filter-search'), 'zzzznomatch');

		await waitFor(() => expect(getByText('No matching users')).toBeVisible());
	});

	it('falls back to the email as the display name when a user has no first/last name', async () => {
		const noNameUsers: IUser[] = [
			{ id: 'u9', firstName: '', lastName: '', email: 'aaa-first@example.com' },
			{ id: 'u1', firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' },
		];
		const { getByTestId } = renderComponent({
			props: { users: noNameUsers, counts: { u9: 1, u1: 2 }, totalCount: 3, modelValue: [] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		// Display name falls back to the email when no name parts are present, and
		// localeCompare sort still orders it ("aaa-first@..." before "Bob Brown").
		await waitFor(() =>
			expect(getByTestId('api-key-owner-filter-option-u9')).toHaveTextContent(
				'aaa-first@example.com',
			),
		);
	});

	it('deselects an already-selected owner and emits the array without that id', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['u1', 'u2'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-option-u1')).toBeVisible());

		// u1 is already selected → clicking it removes it from the selection.
		await userEvent.click(getByTestId('api-key-owner-filter-option-u1'));

		expect(emitted()['update:modelValue']).toContainEqual([['u2']]);
	});

	it('enables Clear when narrowed and resets to all owners on click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['u1'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-clear')).toBeVisible());

		const clear = getByTestId('api-key-owner-filter-clear');
		expect(clear).toBeEnabled();

		await userEvent.click(clear);

		// Clearing a narrowed selection resets the filter to every owner.
		expect(emitted()['update:modelValue']).toContainEqual([['u1', 'u2', 'u3']]);
	});

	it('disables Clear when all owners are effectively selected', async () => {
		const { getByTestId } = renderComponent({ props: { modelValue: [] } });

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));
		await waitFor(() => expect(getByTestId('api-key-owner-filter-clear')).toBeVisible());

		expect(getByTestId('api-key-owner-filter-clear')).toBeDisabled();
	});

	it('sums the selected owners’ key counts in the footer (plural)', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: { modelValue: ['u1', 'u3'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		// u1 (3) + u3 (2) = 5 keys → filtered plural summary.
		await waitFor(() => expect(getByText('Showing 5 keys')).toBeVisible());
	});

	it('shows the singular footer summary when the selection sums to one key', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: { modelValue: ['u2'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		// u2 has a single key → singular filtered summary.
		await waitFor(() => expect(getByText('Showing 1 key')).toBeVisible());
	});

	it('shows the total key count in the footer when all owners are selected', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: { modelValue: ['u1', 'u2', 'u3'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		// All selected → the all-state summary shows the total (6) keys.
		await waitFor(() => expect(getByText('Showing all 6 keys')).toBeVisible());
	});

	it('shows 0 for an owner with no entry in counts', async () => {
		const extraUsers: IUser[] = [
			...users,
			{ id: 'u4', firstName: 'Dave', lastName: 'Davis', email: 'dave@example.com' },
		];
		const { getByTestId } = renderComponent({
			// u4 is deliberately missing from `counts`.
			props: { users: extraUsers, counts, totalCount: 6, modelValue: [] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		await waitFor(() =>
			expect(getByTestId('api-key-owner-filter-option-u4')).toHaveTextContent('0'),
		);
	});

	it('counts a selected owner missing from counts as 0 in the footer summary', async () => {
		const extraUsers: IUser[] = [
			...users,
			{ id: 'u4', firstName: 'Dave', lastName: 'Davis', email: 'dave@example.com' },
		];
		const { getByTestId, getByText } = renderComponent({
			// u4 has no `counts` entry; u1 has 3 → footer should sum to 3.
			props: { users: extraUsers, counts, totalCount: 6, modelValue: ['u1', 'u4'] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		await waitFor(() => expect(getByText('Showing 3 keys')).toBeVisible());
	});

	it('marks the current user with a "(you)" label in their row', async () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: [], currentUserId: 'u1' },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		await waitFor(() =>
			expect(getByTestId('api-key-owner-filter-option-u1')).toHaveTextContent('(you)'),
		);
	});

	it('derives the total from counts when totalCount is not provided', async () => {
		const { getByTestId } = renderComponent({
			// No totalCount → effectiveTotalCount sums counts (3 + 1 + 2 = 6).
			props: { users, counts, totalCount: undefined, modelValue: [] },
		});

		await userEvent.click(getByTestId('api-key-owner-filter-trigger'));

		await waitFor(() => expect(getByTestId('api-key-owner-filter-all')).toHaveTextContent('6'));
	});
});
