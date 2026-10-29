import { fireEvent, render } from '@testing-library/vue';

import type { VersionHistoryEntry, VersionHistoryItem } from './VersionHistory.types';
import N8nVersionHistory from './VersionHistory.vue';

const items: VersionHistoryItem[] = [
	{
		id: 'v2',
		label: 'v2',
		detail: 'Latest',
		author: 'Alex',
		createdAt: 'Oct 28 at 09:14',
		status: 'latest',
		statusLabel: 'Latest version',
		actions: [{ id: 'restore', label: 'Restore' }],
	},
	{
		id: 'v1',
		label: 'v1',
		detail: 'In published agent',
		author: 'Alex',
		createdAt: 'Oct 24 at 14:28',
		status: 'published',
		statusLabel: 'Published version',
		compareDisabled: true,
		actions: [{ id: 'unpublish', label: 'Unpublish' }],
	},
];

function renderHistory(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
	return render(N8nVersionHistory, {
		props: { items, ...props },
		slots,
	});
}

describe('N8nVersionHistory', () => {
	it('renders a version row with its detail and time', () => {
		const { getByRole } = renderHistory({ selectedId: 'v1' });
		const latest = getByRole('menuitem', { name: /v2/ });

		expect(latest).toHaveTextContent('Latest');
		expect(latest).toHaveTextContent('Alex');
		expect(latest).toHaveTextContent('Oct 28 at 09:14');
		expect(getByRole('menuitem', { name: /v1/ })).toHaveAttribute('aria-current', 'true');
	});

	it('emits select when a version is opened', async () => {
		const { getByRole, emitted } = renderHistory({ selectedId: 'v1' });

		await fireEvent.click(getByRole('menuitem', { name: /v2/ }));

		expect(emitted('select')).toEqual([['v2']]);
	});

	it('emits compare without selecting the row', async () => {
		const { getAllByTestId, emitted } = renderHistory({ selectedId: 'v1' });
		const [compare] = getAllByTestId('version-history-compare');

		await fireEvent.click(compare);

		expect(emitted('compare')).toEqual([['v2']]);
		expect(emitted('select')).toBeUndefined();
	});

	it('renders the empty slot when there are no versions', () => {
		const { getByTestId, getByText, queryByTestId } = renderHistory(
			{ items: [] },
			{ empty: '<p>No versions yet</p>' },
		);

		expect(getByTestId('version-history-empty')).toBeTruthy();
		expect(getByText('No versions yet')).toBeTruthy();
		expect(queryByTestId('version-history-item')).toBeNull();
	});

	it('replaces the row actions when the actions slot is set', () => {
		const { getAllByRole, queryByTestId } = renderHistory(
			{},
			{ actions: '<button type="button">Pin</button>' },
		);

		expect(getAllByRole('button', { name: 'Pin' })).toHaveLength(2);
		expect(queryByTestId('version-history-compare')).toBeNull();
	});

	it('disables compare and the menu', () => {
		const disabledItems = items.map((item) => ({
			...item,
			compareDisabled: true,
			actionsDisabled: true,
		}));
		const { getAllByTestId } = renderHistory({ items: disabledItems });

		for (const compare of getAllByTestId('version-history-compare')) {
			expect(compare).toBeDisabled();
		}

		for (const menu of getAllByTestId('action-toggle')) {
			expect(menu.querySelector('button')).toBeDisabled();
		}
	});

	it('shows skeleton rows while versions load', () => {
		const { getByTestId, queryByTestId, queryByText } = renderHistory({ loading: true });

		expect(getByTestId('version-history-loading')).toHaveAttribute(
			'aria-label',
			'Loading versions',
		);
		expect(queryByTestId('version-history-item')).toBeNull();
		expect(queryByText('No versions yet')).toBeNull();
	});

	it('connects the marks and leaves the ends open', () => {
		const { getAllByTestId } = renderHistory();
		const rows = getAllByTestId('version-history-row');

		expect(rows).toHaveLength(2);
		expect(rows[0].querySelector('[data-segment="gap"]')).toBeNull();
		expect(rows[0].querySelector('[data-segment="above"]')).toBeNull();
		expect(rows[0].querySelector('[data-segment="below"]')).toBeTruthy();
		expect(rows[1].querySelector('[data-segment="gap"]')).toBeTruthy();
		expect(rows[1].querySelector('[data-segment="above"]')).toBeTruthy();
		expect(rows[1].querySelector('[data-segment="below"]')).toBeNull();
	});

	it('draws no line when there is one version', () => {
		const { getByTestId, queryByTestId } = renderHistory({ items: [items[0]] });

		expect(getByTestId('version-history-row')).toBeTruthy();
		expect(queryByTestId('version-history-line')).toBeNull();
	});

	it('hides grouped versions until the toggle opens them', async () => {
		const grouped: VersionHistoryEntry[] = [
			{
				type: 'group',
				id: 'unnamed',
				label: '2 versions',
				items,
			},
		];
		const { getByRole, queryByRole } = renderHistory({ items: grouped });
		const toggle = getByRole('button', { name: '2 versions' });

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('menuitem', { name: /v2/ })).toBeNull();

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(getByRole('menuitem', { name: /v2/ })).toBeTruthy();
		expect(getByRole('menuitem', { name: /v1/ })).toBeTruthy();

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('menuitem', { name: /v2/ })).toBeNull();
	});

	it('opens the group that contains the selected version', () => {
		const grouped: VersionHistoryEntry[] = [
			{
				type: 'group',
				id: 'unnamed',
				label: '2 versions',
				items,
			},
		];
		const { getByRole } = renderHistory({ items: grouped, selectedId: 'v1' });

		expect(getByRole('button', { name: '2 versions' })).toHaveAttribute('aria-expanded', 'true');
		expect(getByRole('menuitem', { name: /v1/ })).toHaveAttribute('aria-current', 'true');
	});

	it('renders the rows in view when the list is long', () => {
		const many: VersionHistoryItem[] = Array.from({ length: 40 }, (_, index) => ({
			id: `version-${index}`,
			label: `Version ${index}`,
		}));
		const { getByRole, queryByRole } = renderHistory({ items: many });

		expect(getByRole('menuitem', { name: 'Version 0' })).toBeTruthy();
		expect(queryByRole('menuitem', { name: 'Version 39' })).toBeNull();
	});
});
