import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { findPopupItem, MENU_ITEM, OPTION, popupLabels } from '../__tests__/popups';

const row = (
	name: string,
	displayName: string,
	access: InstancePolicyTableRow['access'] = 'allow',
	editable = true,
): InstancePolicyTableRow => ({
	name,
	displayName,
	access,
	editable,
	icon: { type: 'icon', name: 'key-round' },
});

const ROWS = [
	row('bitlyApi', 'Bitly API', 'deny'),
	row('airtableApi', 'Airtable API'),
	row('notionApi', 'Notion API'),
];

const renderTable = createComponentRenderer(InstancePolicyTable);

const setup = (rows = ROWS) =>
	renderTable({
		pinia: createTestingPinia(),
		props: { rows, loading: false, searchPlaceholder: 'Search credentials' },
	});

const accessTrigger = (getByTestId: (id: string) => HTMLElement, name: string) =>
	getByTestId(`instance-policy-access-${name}`);

const openFilter = async (getByRole: (role: string, options?: object) => HTMLElement) =>
	await userEvent.click(getByRole('combobox', { name: 'Filter by access' }));

const rowNames = (container: HTMLElement) =>
	within(container)
		.getAllByRole('row')
		.slice(1)
		.map((tableRow) => tableRow.querySelector('td')?.textContent?.trim());

describe('InstancePolicyTable', () => {
	it('lists the rows sorted by name', () => {
		const { getByTestId } = setup();

		expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
			'Airtable API',
			'Bitly API',
			'Notion API',
		]);
	});

	it('filters the rows by display name or type name', async () => {
		const { getByTestId, getByPlaceholderText } = setup();

		await userEvent.type(getByPlaceholderText('Search credentials'), 'notionapi');

		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual(['Notion API']),
		);
	});

	it('counts the rows of each access value in the filter', async () => {
		const { getByRole } = setup();

		await openFilter(getByRole);

		expect(await findPopupItem(OPTION, 'All (3)')).toBeInTheDocument();
		expect(await findPopupItem(OPTION, 'Allowed (2)')).toBeInTheDocument();
		expect(await findPopupItem(OPTION, 'Restricted (1)')).toBeInTheDocument();
		expect(popupLabels(OPTION)).not.toContain('Open to project opt-in (0)');
	});

	it('shows only the rows with the chosen access value', async () => {
		const { getByTestId, getByRole } = setup();

		await openFilter(getByRole);
		await userEvent.click(await findPopupItem(OPTION, 'Restricted (1)'));

		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual(['Bitly API']),
		);
	});

	it('sorts on the Access column', async () => {
		const { getByTestId, getByRole } = setup();

		await userEvent.click(getByRole('columnheader', { name: /Access/ }));

		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
				'Airtable API',
				'Notion API',
				'Bitly API',
			]),
		);
	});

	it('keeps the names A to Z inside each access group when the Access sort is reversed', async () => {
		const { getByTestId, getByRole } = setup([...ROWS, row('zoomApi', 'Zoom API', 'deny')]);

		await userEvent.click(getByRole('columnheader', { name: /Access/ }));
		await userEvent.click(getByRole('columnheader', { name: /Access/ }));

		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
				'Bitly API',
				'Zoom API',
				'Airtable API',
				'Notion API',
			]),
		);
	});

	it('does not emit a change when the admin picks the current access', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.click(accessTrigger(getByTestId, 'airtableApi'));
		await userEvent.click(await findPopupItem(MENU_ITEM, 'Allowed'));

		expect(emitted('change')).toBeUndefined();
	});

	it('shows the usage columns with no value yet', () => {
		const { getByRole, getByTestId } = setup();

		for (const title of ['Projects', 'Uses', 'Workflows', 'Active workflows']) {
			expect(getByRole('columnheader', { name: title })).toBeInTheDocument();
		}
		const [firstRow] = within(getByTestId('instance-policy-table')).getAllByRole('row').slice(1);
		const cells = within(firstRow).getAllByRole('cell');
		expect(cells.slice(2).map((cell) => cell.textContent?.trim())).toEqual(['—', '—', '—', '—']);
	});

	it('names each Access dropdown after its row', () => {
		const { getByTestId } = setup();

		expect(accessTrigger(getByTestId, 'bitlyApi')).toHaveAccessibleName('Access of Bitly API');
		expect(accessTrigger(getByTestId, 'bitlyApi')).toHaveTextContent('Restricted');
	});

	it('emits the new access of a row', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.click(accessTrigger(getByTestId, 'airtableApi'));
		await userEvent.click(await findPopupItem(MENU_ITEM, 'Restricted'));

		expect(emitted('change')).toEqual([['airtableApi', 'deny']]);
	});

	it('emits open for a click on a row, but not for a click on its Access menu', async () => {
		const { getByTestId, getByText, emitted } = setup();

		await userEvent.click(getByText('Notion API'));
		expect(emitted('open')).toEqual([['notionApi']]);

		await userEvent.click(accessTrigger(getByTestId, 'airtableApi'));
		expect(emitted('open')).toEqual([['notionApi']]);
	});

	it('offers the opt-in filter when a row has that access', async () => {
		const { getByRole } = setup([...ROWS, row('slackApi', 'Slack API', 'delegate')]);

		await openFilter(getByRole);

		expect(await findPopupItem(OPTION, 'Open to project opt-in (1)')).toBeInTheDocument();
	});

	it('goes back to the first page when the search changes', async () => {
		const many = Array.from({ length: 60 }, (_, index) =>
			row(`type${index}`, `Type ${String(index).padStart(2, '0')}`),
		);
		const { getByTestId, getByPlaceholderText, getByRole } = setup(many);

		await userEvent.click(getByRole('button', { name: /next/i }));
		await waitFor(() => expect(rowNames(getByTestId('instance-policy-table'))[0]).toBe('Type 25'));

		await userEvent.type(getByPlaceholderText('Search credentials'), 'Type');

		await waitFor(() => expect(rowNames(getByTestId('instance-policy-table'))[0]).toBe('Type 00'));
	});

	it('moves to the last page when its rows leave the filter', async () => {
		const many = Array.from({ length: 26 }, (_, index) =>
			row(`type${index}`, `Type ${String(index).padStart(2, '0')}`),
		);
		const { getByTestId, getByRole, rerender } = setup(many);

		await userEvent.click(getByRole('button', { name: /next/i }));
		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual(['Type 25']),
		);

		await rerender({ rows: many.slice(0, 25) });

		await waitFor(() => expect(rowNames(getByTestId('instance-policy-table'))[0]).toBe('Type 00'));
	});

	it('shows a type that a rule leaves open to project opt-in as read-only', () => {
		const { getByTestId } = setup([row('slackApi', 'Slack API', 'delegate', false)]);

		const cell = getByTestId('instance-policy-access-slackApi');
		expect(cell).toHaveTextContent('Open to project opt-in');
		expect(within(cell).queryByRole('button')).not.toBeInTheDocument();
	});
});
