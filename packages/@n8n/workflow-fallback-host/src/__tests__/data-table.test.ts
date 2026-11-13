/**
 * The Data Table node in the fallback host, with tables in JSON files
 * (`data-table.ts`): the node's own code reads and writes them.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NodeStepRunner } from '../node-step';

const dir = mkdtempSync(join(tmpdir(), 'wf-data-tables-'));

const store = { get: async () => ({}) };

async function runner() {
	return new NodeStepRunner({ credentials: store });
}

const dataTableId = { __rl: true, mode: 'id', value: 'dt1' };

describe('the Data Table node with file tables', () => {
	beforeAll(() => {
		process.env.WF_FALLBACK_DATA_TABLES_DIR = dir;
	});

	afterAll(() => {
		delete process.env.WF_FALLBACK_DATA_TABLES_DIR;
	});

	beforeEach(() => {
		writeFileSync(
			join(dir, 'dt1.json'),
			JSON.stringify({
				name: 'people',
				columns: ['name', 'city'],
				rows: [
					{ name: 'Ann', city: 'Berlin' },
					{ name: 'Bob', city: 'Paris' },
				],
			}),
		);
	});

	it('gets the rows that match a filter', async () => {
		const r = await runner();
		const out = await r.run(
			{
				name: 'Get',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				parameters: {
					resource: 'row',
					operation: 'get',
					dataTableId,
					filters: { conditions: [{ keyName: 'city', condition: 'eq', keyValue: 'Paris' }] },
				},
				inputs: [[{}]],
				subNodes: [],
				allOutputs: false,
			} as never,
			{ step: 'Get', key: 'k1' },
		);
		expect(out.map((x: Record<string, unknown>) => [x.id, x.name, x.city])).toEqual([
			[2, 'Bob', 'Paris'],
		]);
	});

	it('gives an error item for a filter on a column that the table does not have', async () => {
		const r = await runner();
		const out = await r.run(
			{
				name: 'Get',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				parameters: {
					resource: 'row',
					operation: 'get',
					dataTableId,
					filters: { conditions: [{ keyName: 'status', condition: 'eq', keyValue: 'x' }] },
				},
				onError: 'continueRegularOutput',
				inputs: [[{}]],
				subNodes: [],
				allOutputs: false,
			} as never,
			{ step: 'Get', key: 'k3' },
		);
		// The node reports the error on the item; v1 turns the item into `{ error }`.
		expect(out).toEqual([{ error: expect.stringContaining('Column(s) "status" do not exist') }]);
	});

	it('inserts a row and keeps it in the file', async () => {
		const r = await runner();
		const out = await r.run(
			{
				name: 'Insert',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				parameters: {
					resource: 'row',
					operation: 'insert',
					dataTableId,
					columns: { mappingMode: 'defineBelow', value: { name: 'Cy', city: 'Rome' }, schema: [] },
				},
				inputs: [[{}]],
				subNodes: [],
				allOutputs: false,
			} as never,
			{ step: 'Insert', key: 'k2' },
		);
		expect(out[0]).toMatchObject({ id: 3, name: 'Cy', city: 'Rome' });
		const stored = JSON.parse(readFileSync(join(dir, 'dt1.json'), 'utf8'));
		expect(stored.rows).toHaveLength(3);
	});
});
