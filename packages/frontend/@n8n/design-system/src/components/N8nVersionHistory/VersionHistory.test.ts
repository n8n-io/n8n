import { fireEvent, render } from '@testing-library/vue';

import type { VersionHistoryItem } from './VersionHistory.types';
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
		props: { items, showCompare: true, ...props },
		slots,
	});
}

describe('N8nVersionHistory', () => {
	it('renders a version row with its detail and time', () => {
		const { getByRole } = renderHistory({ selectedId: 'v1' });
		const latest = getByRole('button', { name: /v2/ });

		expect(latest).toHaveTextContent('Latest');
		expect(latest).toHaveTextContent('Alex');
		expect(latest).toHaveTextContent('Oct 28 at 09:14');
		expect(getByRole('button', { name: /v1/ })).toHaveAttribute('aria-current', 'true');
	});

	it('emits select when a version is opened', async () => {
		const { getByRole, emitted } = renderHistory({ selectedId: 'v1' });

		await fireEvent.click(getByRole('button', { name: /v2/ }));

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
});
