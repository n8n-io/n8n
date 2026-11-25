import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { findPopupItem, MENU_ITEM, OPTION, popupLabels } from '../__tests__/popups';
import { accessFilter } from '../__tests__/table';

const row = (
	name: string,
	displayName: string,
	access: InstancePolicyTableRow['access'] = 'allow',
	editable = true,
	usage: InstancePolicyTableRow['usage'] = null,
): InstancePolicyTableRow => ({
	name,
	displayName,
	access,
	matchedRuleId: null,
	editable,
	checking: false,
	icon: { type: 'icon', name: 'key-round' },
	usage,
});

const ROWS = [
	row('bitlyApi', 'Bitly API', 'deny'),
	row('airtableApi', 'Airtable API'),
	row('notionApi', 'Notion API'),
];

// Use read-only rows so pagination tests do not mount an access menu for each row.
const paginationRows = (count: number) =>
	Array.from({ length: count }, (_, index) =>
		row(`type${index}`, `Type ${String(index).padStart(2, '0')}`, 'delegate', false),
	);

const renderTable = createComponentRenderer(InstancePolicyTable);

const setup = (rows = ROWS) =>
	renderTable({
		pinia: createTestingPinia(),
		props: {
			rows,
			loading: false,
			searchPlaceholder: 'Search credentials',
			noMatchText: 'No credentials match your search or filter',
		},
	});

const accessTrigger = (getByTestId: (id: string) => HTMLElement, name: string) =>
	getByTestId(`instance-policy-access-${name}`);

const openFilter = async (getByRole: (role: string, options?: object) => HTMLElement) =>
	await userEvent.click(accessFilter(getByRole));

const rowNames = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr'), (tableRow) =>
		tableRow.cells[0]?.textContent?.trim(),
	);

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

	describe('usage sort', () => {
		const usage = (workflows: number) => ({ uses: 0, workflows, activeWorkflows: 0, projects: 0 });
		const USAGE_ROWS = [
			row('bitlyApi', 'Bitly API', 'allow', false, usage(2)),
			row('notionApi', 'Notion API', 'allow', false, usage(5)),
			row('airtableApi', 'Airtable API', 'allow', false),
			row('zoomApi', 'Zoom API', 'allow', false, usage(2)),
			row('boxApi', 'Box API', 'allow', false),
			row('asanaApi', 'Asana API', 'allow', false, usage(2)),
		];

		const clickWorkflows = async (getByRole: (role: string, options?: object) => HTMLElement) =>
			await userEvent.click(getByRole('columnheader', { name: /^Workflows/ }));

		it('sorts the counts from low to high, with names A to Z for equal counts and unknown usage last', async () => {
			const { getByTestId, getByRole } = setup(USAGE_ROWS);

			await clickWorkflows(getByRole);

			await waitFor(() =>
				expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
					'Asana API',
					'Bitly API',
					'Zoom API',
					'Notion API',
					'Airtable API',
					'Box API',
				]),
			);
		});

		it('sorts from low to high on the first click when the first row has a count', async () => {
			const { getByTestId, getByRole } = setup([
				row('asanaApi', 'Asana API', 'allow', false, usage(5)),
				row('bitlyApi', 'Bitly API', 'allow', false, usage(2)),
			]);

			await clickWorkflows(getByRole);

			await waitFor(() =>
				expect(rowNames(getByTestId('instance-policy-table'))).toEqual(['Bitly API', 'Asana API']),
			);
		});

		it('sorts the counts from high to low, with names A to Z for equal counts and unknown usage last', async () => {
			const { getByTestId, getByRole } = setup(USAGE_ROWS);

			await clickWorkflows(getByRole);
			await clickWorkflows(getByRole);

			await waitFor(() =>
				expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
					'Notion API',
					'Asana API',
					'Bitly API',
					'Zoom API',
					'Airtable API',
					'Box API',
				]),
			);
		});
	});

	it('does not emit a change when the admin picks the current access', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.click(accessTrigger(getByTestId, 'airtableApi'));
		await userEvent.click(await findPopupItem(MENU_ITEM, 'Allowed'));

		expect(emitted('change')).toBeUndefined();
	});

	it('shows the usage of each row, and no value for an unknown usage', () => {
		const { getByRole, getByTestId } = setup([
			row('bitlyApi', 'Bitly API', 'allow', true, {
				uses: 3,
				workflows: 2,
				activeWorkflows: 1,
				projects: 1,
			}),
			row('notionApi', 'Notion API'),
		]);

		for (const title of ['Projects', 'Uses', 'Workflows', 'Active workflows']) {
			expect(getByRole('columnheader', { name: title })).toBeInTheDocument();
		}
		const usageCells = within(getByTestId('instance-policy-table'))
			.getAllByRole('row')
			.slice(1)
			.map((tableRow) =>
				within(tableRow)
					.getAllByRole('cell')
					.slice(2)
					.map((cell) => cell.textContent?.trim()),
			);
		expect(usageCells).toEqual([
			['1', '3', '2', '1'],
			['—', '—', '—', '—'],
		]);
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

		expect(emitted('change')).toEqual([['airtableApi', 'deny', 'Airtable API']]);
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
		const rows = paginationRows(26);
		const { getByTestId, getByPlaceholderText } = setup(rows);
		const table = getByTestId('instance-policy-table');

		await fireEvent.click(getByTestId('pagination-next'));
		expect(rowNames(table)).toEqual(['Type 25']);

		// Match all rows so page clamping cannot reset the page.
		await fireEvent.update(getByPlaceholderText('Search credentials'), 'Type');

		expect(rowNames(table)).toEqual(rows.slice(0, 25).map(({ displayName }) => displayName));
	});

	it('shows the chosen number of rows from the Page size control', async () => {
		const { getByTestId } = setup(paginationRows(30));
		const table = getByTestId('instance-policy-table');
		const pagination = within(getByTestId('pagination'));
		expect(rowNames(table)).toHaveLength(25);

		await userEvent.click(pagination.getByRole('combobox', { name: 'Page size' }));
		await userEvent.click(await findPopupItem(OPTION, '10/page'));

		expect(rowNames(table)).toHaveLength(10);
	});

	it('moves to the last page when its rows leave the filter', async () => {
		const rows = paginationRows(26);
		const { getByTestId, rerender } = setup(rows);
		const table = getByTestId('instance-policy-table');

		await fireEvent.click(getByTestId('pagination-next'));
		expect(rowNames(table)).toEqual(['Type 25']);

		const remainingRows = rows.slice(0, 25);
		await rerender({ rows: remainingRows });

		expect(rowNames(table)).toEqual(remainingRows.map(({ displayName }) => displayName));
	});

	it('shows a type that a rule leaves open to project opt-in as read-only', () => {
		const { getByTestId } = setup([row('slackApi', 'Slack API', 'delegate', false)]);

		const cell = getByTestId('instance-policy-access-slackApi');
		expect(cell).toHaveTextContent('Open to project opt-in');
		expect(within(cell).queryByRole('button')).not.toBeInTheDocument();
	});

	it('asks for the details of a row when the admin clicks the row', async () => {
		const { getByTestId, emitted } = setup();
		const airtableRow = within(getByTestId('instance-policy-table'))
			.getAllByRole('row')
			.find((tableRow) => tableRow.textContent?.includes('Airtable API'));

		// A usage cell, which has no control of its own.
		await userEvent.click(airtableRow!.querySelectorAll('td')[2]);

		expect(emitted('open')).toEqual([['airtableApi']]);
	});

	it('asks for the details of a row from the keyboard, with its name', async () => {
		const { getByTestId, emitted } = setup();

		getByTestId('instance-policy-open-airtableApi').focus();
		await userEvent.keyboard('{Enter}');

		expect(emitted('open')).toEqual([['airtableApi']]);
	});

	it('does not ask for the details when the admin changes the access', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.click(accessTrigger(getByTestId, 'airtableApi'));
		await userEvent.click(await findPopupItem(MENU_ITEM, 'Restricted'));

		expect(emitted('change')).toEqual([['airtableApi', 'deny', 'Airtable API']]);
		expect(emitted('open')).toBeUndefined();
	});

	describe('focus when the rows change', () => {
		it('moves the focus to the access filter when the focused row leaves the filter', async () => {
			const { getByTestId, queryByTestId, getByRole, rerender } = setup();
			await openFilter(getByRole);
			await userEvent.click(await findPopupItem(OPTION, 'Restricted (1)'));
			getByTestId('instance-policy-open-bitlyApi').focus();

			await rerender({ rows: [row('bitlyApi', 'Bitly API', 'allow'), ...ROWS.slice(1)] });

			expect(queryByTestId('instance-policy-open-bitlyApi')).not.toBeInTheDocument();
			await waitFor(() => expect(accessFilter(getByRole)).toHaveFocus());
		});

		it('keeps the focus on the search box while the search changes the rows', async () => {
			const { getByTestId, getByPlaceholderText } = setup();
			const searchBox = getByPlaceholderText('Search credentials');

			await userEvent.type(searchBox, 'notion');

			await waitFor(() =>
				expect(rowNames(getByTestId('instance-policy-table'))).toEqual(['Notion API']),
			);
			expect(searchBox).toHaveFocus();
		});

		it('keeps the focus on a row that stays in the table', async () => {
			const { getByTestId, rerender } = setup();
			const airtableButton = getByTestId('instance-policy-open-airtableApi');
			airtableButton.focus();

			await rerender({ rows: ROWS.filter(({ name }) => name !== 'bitlyApi') });

			expect(airtableButton).toHaveFocus();
		});

		it('keeps the focus on a row that moves when the table is sorted by access', async () => {
			const rows = [...ROWS, row('zoomApi', 'Zoom API')];
			const { getByTestId, getByRole, rerender } = setup(rows);
			await userEvent.click(getByRole('columnheader', { name: /Access/ }));
			getByTestId('instance-policy-open-airtableApi').focus();

			await rerender({
				rows: rows.map((item) =>
					item.name === 'airtableApi' ? { ...item, access: 'deny' } : item,
				),
			});

			await waitFor(() =>
				expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
					'Notion API',
					'Zoom API',
					'Airtable API',
					'Bitly API',
				]),
			);
			expect(getByTestId('instance-policy-open-airtableApi')).toHaveFocus();
		});

		it('does not move the focus of a control that is not a row', async () => {
			const { getByTestId, rerender } = setup(paginationRows(30));
			getByTestId('pagination-next').focus();

			// With ten rows or fewer, the table shows no pagination.
			await rerender({ rows: paginationRows(5) });

			expect(document.activeElement).toBe(document.body);
		});

		it('does not move a focus that is outside the table', async () => {
			const { rerender } = setup();
			const outside = document.createElement('button');
			document.body.appendChild(outside);
			try {
				outside.focus();

				await rerender({ rows: [] });

				expect(outside).toHaveFocus();
			} finally {
				outside.remove();
			}
		});
	});

	it('asks for the details of a read-only row when the admin clicks its access', async () => {
		const { getByTestId, emitted } = setup([row('slackApi', 'Slack API', 'delegate', false)]);

		await userEvent.click(getByTestId('instance-policy-access-slackApi'));

		expect(emitted('open')).toEqual([['slackApi']]);
	});

	describe('no match', () => {
		const noMatch = (queryByTestId: (id: string) => HTMLElement | null) =>
			queryByTestId('instance-policy-no-match');

		it('does not show the message when rows match', () => {
			const { queryByTestId } = setup();

			expect(noMatch(queryByTestId)).not.toBeInTheDocument();
		});

		it('shows the message when the search matches no row', async () => {
			const { getByPlaceholderText, getByTestId } = setup();

			await fireEvent.update(getByPlaceholderText('Search credentials'), 'zzz');

			expect(getByTestId('instance-policy-no-match')).toHaveTextContent(
				'No credentials match your search or filter',
			);
		});

		it('shows the message when an access change takes the last row out of the filter', async () => {
			const { getByRole, getByTestId, rerender } = setup();
			await openFilter(getByRole);
			await userEvent.click(await findPopupItem(OPTION, 'Restricted (1)'));

			await rerender({ rows: ROWS.map((typeRow) => ({ ...typeRow, access: 'allow' })) });

			expect(getByTestId('instance-policy-no-match')).toBeInTheDocument();
		});

		it('does not show the message during the first load', async () => {
			const { getByPlaceholderText, queryByTestId, rerender } = setup([]);
			await rerender({ loading: true });
			await fireEvent.update(getByPlaceholderText('Search credentials'), 'zzz');

			expect(noMatch(queryByTestId)).not.toBeInTheDocument();
		});

		it('keeps the message, with no skeleton rows, while the access reloads after a save', async () => {
			const { getByPlaceholderText, getByTestId, rerender } = setup();
			await fireEvent.update(getByPlaceholderText('Search credentials'), 'zzz');

			await rerender({ loading: true });

			expect(getByTestId('instance-policy-no-match')).toBeInTheDocument();
			expect(getByTestId('instance-policy-table').querySelector('.el-skeleton')).toBeNull();
		});

		it('clears the search and the filter, and puts the focus on the search box', async () => {
			const { getByPlaceholderText, getByRole, getByTestId, queryByTestId } = setup();
			const searchBox = getByPlaceholderText('Search credentials');
			await openFilter(getByRole);
			await userEvent.click(await findPopupItem(OPTION, 'Restricted (1)'));
			await fireEvent.update(searchBox, 'Notion');

			getByRole('button', { name: 'Clear search and filter' }).focus();
			await userEvent.keyboard('{Enter}');

			expect(noMatch(queryByTestId)).not.toBeInTheDocument();
			expect(searchBox).toHaveValue('');
			expect(getByRole('combobox', { name: 'Filter by access' })).toHaveTextContent('All (3)');
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
				'Airtable API',
				'Bitly API',
				'Notion API',
			]);
			expect(searchBox).toHaveFocus();
		});
	});
});
