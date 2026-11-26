import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import InstancePolicyTable, { type InstancePolicyTableRow } from './InstancePolicyTable.vue';
import { findPopupItem, MENU_ITEM, OPTION, popupLabels } from '../__tests__/popups';
import { accessFilter, rowCheckbox } from '../__tests__/table';

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

// Two pages of rows that the admin can change, plus a read-only row and a restricted row.
const TWO_PAGES = [
	...Array.from({ length: 30 }, (_, index) =>
		row(`type${index}`, `Type ${String(index).padStart(2, '0')}`),
	),
	row('readOnly', 'Read only', 'delegate', false),
	row('restricted', 'Restricted type', 'deny'),
];

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
		tableRow.cells[1]?.textContent?.trim(),
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

		await userEvent.click(getByRole('button', { name: 'Access' }));

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

		await userEvent.click(getByRole('button', { name: 'Access' }));
		await userEvent.click(getByRole('button', { name: 'Access' }));

		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
				'Bitly API',
				'Zoom API',
				'Airtable API',
				'Notion API',
			]),
		);
	});

	it('sorts from the keyboard, from the column headers that follow the access filter', async () => {
		const { container, getByTestId, getByRole } = setup();
		const filter = getByRole('combobox', { name: 'Filter by access' });
		const firstRow = getByTestId('instance-policy-open-airtableApi');
		const follows = (a: Node, b: Node) =>
			Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

		// The tab order is the DOM order. jsdom cannot tab from the filter: the select sets a disabled
		// attribute on its trigger, which user-event skips. So the test lists what Tab reaches between.
		const reachedBetween = Array.from(
			container.querySelectorAll<HTMLElement>(
				'button, input, select, textarea, a[href], [tabindex]',
			),
		).filter(
			(element) => element.tabIndex >= 0 && follows(filter, element) && follows(element, firstRow),
		);
		const headers = ['Name', 'Access', 'Projects', 'Uses', 'Workflows', 'Active workflows'];
		// The select controls come before the sort headers, and the checkbox of the first row after them.
		expect(reachedBetween).toEqual([
			getByRole('button', { name: 'Select all 3 rows' }),
			getByRole('checkbox', { name: 'Select all rows on this page' }),
			...headers.map((name) => getByRole('button', { name })),
			rowCheckbox(getByRole, 'Airtable API'),
		]);

		getByRole('button', { name: 'Name' }).focus();
		await userEvent.tab();
		expect(getByRole('button', { name: 'Access' })).toHaveFocus();

		await userEvent.keyboard('{Enter}');
		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
				'Airtable API',
				'Notion API',
				'Bitly API',
			]),
		);
		expect(getByRole('columnheader', { name: 'Access' })).toHaveAttribute('aria-sort', 'ascending');

		await userEvent.keyboard(' ');
		await waitFor(() =>
			expect(rowNames(getByTestId('instance-policy-table'))).toEqual([
				'Bitly API',
				'Airtable API',
				'Notion API',
			]),
		);
		expect(getByRole('columnheader', { name: 'Access' })).toHaveAttribute(
			'aria-sort',
			'descending',
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
			await userEvent.click(getByRole('button', { name: 'Workflows' }));

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
					.slice(3)
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
		await userEvent.click(airtableRow!.querySelectorAll('td')[3]);

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
			await userEvent.click(getByRole('button', { name: 'Access' }));
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

	describe('selection', () => {
		it('gives each row a checkbox named after it, and disables it on a read-only row', () => {
			const { getByRole } = setup([...ROWS, row('slackApi', 'Slack API', 'delegate', false)]);

			expect(rowCheckbox(getByRole, 'Bitly API')).toBeEnabled();
			expect(rowCheckbox(getByRole, 'Slack API')).toBeDisabled();
			expect(getByRole('checkbox', { name: 'Select all rows on this page' })).toBeInTheDocument();
		});

		it('shows the bar with the count and the actions, and announces the count', async () => {
			const { getByRole, getByTestId, queryByTestId } = setup();
			expect(queryByTestId('selected-items-info')).not.toBeInTheDocument();

			for (const name of ['Bitly API', 'Airtable API', 'Notion API']) {
				await userEvent.click(rowCheckbox(getByRole, name));
			}

			const bar = within(getByTestId('selected-items-info'));
			expect(bar.getByText('3 rows selected')).toBeInTheDocument();
			expect(bar.getByRole('button', { name: 'Restrict' })).toBeEnabled();
			expect(bar.getByRole('button', { name: 'Allow' })).toBeEnabled();
			expect(bar.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
			expect(getByTestId('policy-bulk-status')).toHaveTextContent('3 rows selected');
		});

		it('does not open a row when the admin clicks its checkbox', async () => {
			const { getByRole, emitted } = setup();

			await userEvent.click(rowCheckbox(getByRole, 'Airtable API'));

			expect(emitted('open')).toBeUndefined();
		});

		it('emits the selected types with the access of the action', async () => {
			const { getByRole, getByTestId, emitted } = setup();
			await userEvent.click(rowCheckbox(getByRole, 'Bitly API'));
			await userEvent.click(rowCheckbox(getByRole, 'Airtable API'));

			await userEvent.click(getByTestId('policy-bulk-allow'));
			await userEvent.click(getByTestId('policy-bulk-restrict'));

			const types = [
				{ name: 'bitlyApi', label: 'Bitly API' },
				{ name: 'airtableApi', label: 'Airtable API' },
			];
			expect(emitted('bulkChange')).toEqual([
				[types, 'allow'],
				[types, 'deny'],
			]);
		});

		it('disables the action that would change no selected row', async () => {
			const { getByRole, getByTestId } = setup();

			await userEvent.click(rowCheckbox(getByRole, 'Airtable API'));

			expect(getByTestId('policy-bulk-allow')).toHaveAttribute('aria-disabled', 'true');
			expect(getByTestId('policy-bulk-restrict')).not.toHaveAttribute('aria-disabled');
		});

		it('keeps the selection when the page, the search or the filter changes', async () => {
			const { getByRole, getByTestId, getByPlaceholderText } = setup(TWO_PAGES);

			await userEvent.click(rowCheckbox(getByRole, 'Type 00'));
			await fireEvent.click(getByTestId('pagination-next'));
			await userEvent.click(rowCheckbox(getByRole, 'Type 25'));
			await fireEvent.update(getByPlaceholderText('Search credentials'), 'Type 25');
			await openFilter(getByRole);
			await userEvent.click(await findPopupItem(OPTION, 'Allowed (1)'));

			expect(within(getByTestId('selected-items-info')).getByText('2 rows selected')).toBeVisible();
			expect(rowCheckbox(getByRole, 'Type 25')).toHaveAttribute('aria-checked', 'true');
		});

		it('selects the rows of the page from the page checkbox, and keeps the rows of other pages', async () => {
			const { getByRole, getByTestId } = setup(TWO_PAGES);
			const selectAll = () => getByRole('checkbox', { name: 'Select all rows on this page' });
			const bar = () => within(getByTestId('selected-items-info'));

			await userEvent.click(selectAll());
			// The 25 rows of the first page, without the read-only row.
			expect(bar().getByText('24 rows selected')).toBeInTheDocument();
			expect(selectAll()).toHaveAttribute('aria-checked', 'true');

			await fireEvent.click(getByTestId('pagination-next'));
			expect(selectAll()).toHaveAttribute('aria-checked', 'false');
			await userEvent.click(selectAll());
			expect(bar().getByText('31 rows selected')).toBeInTheDocument();

			// Clearing the second page keeps the rows of the first page.
			await userEvent.click(selectAll());
			expect(bar().getByText('24 rows selected')).toBeInTheDocument();
		});

		it('selects only the rows that the filter shows', async () => {
			const { getByRole, getByTestId, emitted } = setup();

			await openFilter(getByRole);
			await userEvent.click(await findPopupItem(OPTION, 'Restricted (1)'));
			await userEvent.click(getByRole('checkbox', { name: 'Select all rows on this page' }));
			expect(within(getByTestId('selected-items-info')).getByText('1 row selected')).toBeVisible();

			await userEvent.click(getByTestId('policy-bulk-allow'));
			expect(emitted('bulkChange')).toEqual([
				[[{ name: 'bitlyApi', label: 'Bitly API' }], 'allow'],
			]);
		});

		describe('select all rows on every page', () => {
			it('selects the rows that the admin can change on every page', async () => {
				const { getByRole, getByTestId } = setup(TWO_PAGES);
				const selectAll = getByRole('button', { name: 'Select all 31 rows' });

				await userEvent.click(selectAll);

				expect(
					within(getByTestId('selected-items-info')).getByText('31 rows selected'),
				).toBeVisible();
				expect(selectAll).toHaveAttribute('aria-disabled', 'true');
				expect(selectAll).toHaveFocus();
			});

			it('selects only the rows that the search and the filter show, and keeps the others', async () => {
				const { getByRole, getByTestId, getByPlaceholderText, emitted } = setup(TWO_PAGES);

				await userEvent.click(rowCheckbox(getByRole, 'Type 00'));
				await fireEvent.update(getByPlaceholderText('Search credentials'), 'type');
				await openFilter(getByRole);
				await userEvent.click(await findPopupItem(OPTION, 'Restricted (1)'));
				await userEvent.click(getByRole('button', { name: 'Select all 1 row' }));

				expect(
					within(getByTestId('selected-items-info')).getByText('2 rows selected'),
				).toBeVisible();
				await userEvent.click(getByTestId('policy-bulk-allow'));
				expect(emitted('bulkChange')).toEqual([
					[
						[
							{ name: 'type0', label: 'Type 00' },
							{ name: 'restricted', label: 'Restricted type' },
						],
						'allow',
					],
				]);
			});

			it('is not shown when no row can change', () => {
				const { queryByTestId } = setup([row('readOnly', 'Read only', 'delegate', false)]);

				expect(queryByTestId('instance-policy-select-all')).not.toBeInTheDocument();
			});
		});

		it('clears the selection and moves the focus to the select-all checkbox', async () => {
			const { getByRole, getByTestId, queryByTestId } = setup();
			await userEvent.click(rowCheckbox(getByRole, 'Bitly API'));

			await userEvent.click(getByRole('button', { name: 'Clear selection' }));

			expect(queryByTestId('selected-items-info')).not.toBeInTheDocument();
			expect(rowCheckbox(getByRole, 'Bitly API')).toHaveAttribute('aria-checked', 'false');
			expect(getByTestId('policy-bulk-status')).toHaveTextContent('Selection cleared');
			await waitFor(() =>
				expect(getByRole('checkbox', { name: 'Select all rows on this page' })).toHaveFocus(),
			);
		});

		it('keeps the focus on the action while it runs, then moves it to the select-all checkbox', async () => {
			const { getByRole, getByTestId, rerender } = setup();
			await userEvent.click(rowCheckbox(getByRole, 'Bitly API'));
			const allow = getByTestId('policy-bulk-allow');
			allow.focus();

			await userEvent.keyboard('{Enter}');
			await rerender({ bulkBusy: true });
			// A native `disabled` would move the focus to the body in a browser.
			expect(allow).not.toHaveAttribute('disabled');
			expect(allow).toHaveAttribute('aria-disabled', 'true');
			expect(allow).toHaveFocus();

			await rerender({ bulkBusy: false, selection: [] });
			await waitFor(() =>
				expect(getByRole('checkbox', { name: 'Select all rows on this page' })).toHaveFocus(),
			);
		});

		it('clears the selection when the admin presses Escape in the bar', async () => {
			const { getByRole, getByTestId, queryByTestId } = setup();
			await userEvent.click(rowCheckbox(getByRole, 'Bitly API'));

			getByTestId('policy-bulk-allow').focus();
			await userEvent.keyboard('{Escape}');

			expect(queryByTestId('selected-items-info')).not.toBeInTheDocument();
		});

		it('drops a selected type that becomes read-only', async () => {
			const { getByRole, getByTestId, queryByTestId, rerender } = setup();
			await userEvent.click(rowCheckbox(getByRole, 'Bitly API'));
			expect(getByTestId('selected-items-info')).toBeInTheDocument();

			await rerender({ rows: [row('bitlyApi', 'Bitly API', 'delegate', false), ...ROWS.slice(1)] });

			expect(queryByTestId('selected-items-info')).not.toBeInTheDocument();
		});
	});
});
