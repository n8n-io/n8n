import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const doc = '/apis/v1/docs/AbCDeFGH';
const table = `${doc}/tables/grid-pqRstUv`;
const view = `${doc}/tables/table-QrStUvW`;
const row = { id: 'i-tuVwxYz', values: { Name: 'Ada' } };
const column = { id: 'c-tuVwxYz', name: 'Name' };
const formula = { id: 'f-fgHijkLm', name: 'Total' };
const control = { id: 'ctrl-cDefGhij', name: 'Slider' };
const viewItem = { id: 'table-QrStUvW', name: 'Open tasks' };

describe('Coda > Workflows', () => {
	const credentials = {
		codaApi: {
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://coda.io').matchHeader('authorization', 'Bearer fake-access-token');

		api.post(`${table}/rows`, { rows: [{ cells: [] }], qs: {} }).reply(202, { requestId: 'r-1' });
		api.get(`${table}/rows/Task%20One`).query({ useColumnNames: 'true' }).reply(200, row);
		api
			.get(`${table}/rows`)
			.query({ useColumnNames: 'true', limit: '100' })
			.reply(200, {
				items: [row],
				nextPageLink: `https://coda.io${table}/rows?useColumnNames=true&limit=100&pageToken=next-page`,
			});
		api
			.get(`${table}/rows`)
			.query({ useColumnNames: 'true', limit: '100', pageToken: 'next-page' })
			.reply(200, { items: [{ id: 'i-bcDefGh', values: { Name: 'Grace' } }] });
		api
			.get(`${table}/rows`)
			.query({ useColumnNames: 'true', limit: '5' })
			.reply(200, { items: [row] });
		api.delete(`${table}/rows`, { rowIds: ['i-tuVwxYz'] }).reply(202, { requestId: 'r-2' });
		api
			.post(`${table}/rows/i-tuVwxYz/buttons/c-tuVwxYz`)
			.reply(202, { requestId: 'abc-123', rowId: 'i-tuVwxYz', columnId: 'c-tuVwxYz' });
		api.get(`${table}/columns/c-tuVwxYz`).reply(200, column);
		api
			.get(`${table}/columns`)
			.query({ limit: '5' })
			.reply(200, { items: [column] });
		api.get(`${doc}/formulas/f-fgHijkLm`).reply(200, formula);
		api
			.get(`${doc}/formulas`)
			.query({ limit: '5' })
			.reply(200, { items: [formula] });
		api.get(`${doc}/controls/ctrl-cDefGhij`).reply(200, control);
		api
			.get(`${doc}/controls`)
			.query({ limit: '5' })
			.reply(200, { items: [control] });
		api.get(view).reply(200, viewItem);
		api
			.get(`${doc}/tables`)
			.query({ tableTypes: 'view', limit: '5' })
			.reply(200, { items: [viewItem] });
		api
			.get(`${view}/rows`)
			.query({ useColumnNames: 'true', limit: '5' })
			.reply(200, { items: [row] });
		api.delete(`${view}/rows/i-tuVwxYz`).reply(202, { id: 'i-tuVwxYz' });
		api
			.post(`${view}/rows/i-tuVwxYz/buttons/c-tuVwxYz`)
			.reply(202, { requestId: 'abc-124', rowId: 'i-tuVwxYz', columnId: 'c-tuVwxYz' });
		api
			.get(`${view}/columns`)
			.query({ limit: '5' })
			.reply(200, { items: [column] });
		api
			.put(`${view}/rows/i-tuVwxYz`, { row: { cells: [{ column: 'Name', value: 'Ada' }] } })
			.reply(202, { requestId: 'r-3' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
