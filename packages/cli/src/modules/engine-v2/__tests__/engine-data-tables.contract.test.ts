import type { IDataTableProjectAggregateService, IDataTableProjectService } from 'n8n-workflow';
import { expectTypeOf } from 'vitest';

import type { DataTableCallKind } from '../engine-data-tables.contract';
import {
	dataTableCallRequestSchema,
	isDataTableCallErrorResponse,
	isDataTableCallResponse,
} from '../engine-data-tables.contract';
import { CONTROL_PLANE_PREFIX, DATA_TABLES_CALL_PATH } from '../engine-v2.constants';

const envelope = {
	execution: { executionId: 'exec-1', workflowId: 'wf-1' },
	consumer: { nodeType: 'n8n-nodes-base.dataTable' },
};

describe('dataTableCallRequestSchema', () => {
	it.each([
		['getProjectId', { kind: 'getProjectId' }],
		['getManyAndCount', { kind: 'getManyAndCount', options: { filter: { name: 'orders' } } }],
		[
			'createDataTable',
			{
				kind: 'createDataTable',
				options: { name: 'orders', columns: [{ name: 'total', type: 'number' }] },
			},
		],
		['updateDataTable', { kind: 'updateDataTable', dataTableId: 'dt-1', options: { name: 'x' } }],
		['deleteDataTable', { kind: 'deleteDataTable', dataTableId: 'dt-1' }],
		['getColumns', { kind: 'getColumns', dataTableId: 'dt-1' }],
		[
			'addColumn',
			{ kind: 'addColumn', dataTableId: 'dt-1', options: { name: 'paid', type: 'boolean' } },
		],
		[
			'moveColumn',
			{ kind: 'moveColumn', dataTableId: 'dt-1', columnId: 'col-1', options: { targetIndex: 0 } },
		],
		['deleteColumn', { kind: 'deleteColumn', dataTableId: 'dt-1', columnId: 'col-1' }],
		[
			'getManyRowsAndCount',
			{
				kind: 'getManyRowsAndCount',
				dataTableId: 'dt-1',
				options: {
					filter: { type: 'and', filters: [{ columnName: 'total', condition: 'gt', value: 10 }] },
					sortBy: ['total', 'DESC'],
					take: 10,
					skip: 0,
				},
			},
		],
		[
			'insertRows',
			{
				kind: 'insertRows',
				dataTableId: 'dt-1',
				rows: [{ total: 1, paid: true, note: null, when: '2026-10-27T00:00:00.000Z' }],
				returnType: 'all',
			},
		],
		[
			'updateRows',
			{
				kind: 'updateRows',
				dataTableId: 'dt-1',
				options: {
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { paid: true },
					dryRun: true,
				},
			},
		],
		[
			'upsertRow',
			{
				kind: 'upsertRow',
				dataTableId: 'dt-1',
				options: {
					filter: { type: 'or', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { paid: false },
				},
			},
		],
		[
			'deleteRows',
			{
				kind: 'deleteRows',
				dataTableId: 'dt-1',
				options: {
					filter: { type: 'and', filters: [{ columnName: 'paid', condition: 'eq', value: false }] },
				},
			},
		],
		['clearRows', { kind: 'clearRows', dataTableId: 'dt-1' }],
	])('accepts a %s call', (_kind, call) => {
		const request = { ...envelope, call };

		expect(dataTableCallRequestSchema.parse(request)).toEqual(request);
	});

	it('passes column names and filter values on unchecked, so the service reports them', () => {
		// A name the service refuses must still reach it: the v1 node sees the
		// service's "unknown column name" message, not a generic 400.
		const request = {
			...envelope,
			call: {
				kind: 'getManyRowsAndCount',
				dataTableId: 'dt-1',
				options: {
					filter: { type: 'and', filters: [{ columnName: 'no such', condition: 'eq', value: 1 }] },
				},
			},
		};

		expect(dataTableCallRequestSchema.safeParse(request).success).toBe(true);
	});

	it('rejects a list filter that names a project, because the control plane pins it', () => {
		const request = {
			...envelope,
			call: { kind: 'getManyAndCount', options: { filter: { projectId: 'other-project' } } },
		};

		expect(dataTableCallRequestSchema.safeParse(request).success).toBe(false);
	});

	it('carries one kind for each proxy method, so a new method cannot miss the data plane', () => {
		// `deleteDataTableAll` is left out on purpose: no node calls it.
		type ProxyMethod =
			| keyof IDataTableProjectService
			| Exclude<keyof IDataTableProjectAggregateService, 'deleteDataTableAll'>;

		expectTypeOf<DataTableCallKind>().toEqualTypeOf<ProxyMethod>();
	});

	it('rejects a kind the control plane does not serve', () => {
		const request = { ...envelope, call: { kind: 'deleteDataTableAll' } };

		expect(dataTableCallRequestSchema.safeParse(request).success).toBe(false);
	});

	it('rejects a table operation without a table id', () => {
		const request = { ...envelope, call: { kind: 'getColumns' } };

		expect(dataTableCallRequestSchema.safeParse(request).success).toBe(false);
	});

	it('rejects a request without a workflow id, because the project comes from it', () => {
		const request = {
			...envelope,
			execution: { executionId: 'exec-1' },
			call: { kind: 'getProjectId' },
		};

		expect(dataTableCallRequestSchema.safeParse(request).success).toBe(false);
	});

	it('rejects a cell value JSON cannot carry', () => {
		const request = {
			...envelope,
			call: { kind: 'insertRows', dataTableId: 'dt-1', rows: [{ a: { b: 1 } }], returnType: 'all' },
		};

		expect(dataTableCallRequestSchema.safeParse(request).success).toBe(false);
	});
});

describe('isDataTableCallResponse', () => {
	it.each([
		['an object result', { data: { count: 1, data: [] } }],
		['an array result', { data: [] }],
		['a boolean result', { data: true }],
		['a string result', { data: 'project-1' }],
	])('accepts %s', (_label, body) => {
		expect(isDataTableCallResponse(body)).toBe(true);
	});

	it.each([
		['an error body', { error: { kind: 'user', message: 'nope' } }],
		['an empty object', {}],
		['null', null],
	])('refuses %s', (_label, body) => {
		expect(isDataTableCallResponse(body)).toBe(false);
	});
});

describe('isDataTableCallErrorResponse', () => {
	it('accepts an error with a known kind', () => {
		expect(
			isDataTableCallErrorResponse({
				error: { kind: 'node-operation', message: 'gone', description: 'pick another' },
			}),
		).toBe(true);
	});

	it.each([
		['an unknown kind', { error: { kind: 'transport', message: 'x' } }],
		['no message', { error: { kind: 'user' } }],
		['a success body', { data: [] }],
		['a plain REST error body', { code: 400, message: 'Bad request' }],
	])('refuses %s', (_label, body) => {
		expect(isDataTableCallErrorResponse(body)).toBe(false);
	});
});

describe('DATA_TABLES_CALL_PATH', () => {
	it('is mounted under the control plane prefix, so auth and body limits apply to it', () => {
		expect(DATA_TABLES_CALL_PATH).toBe(`${CONTROL_PLANE_PREFIX}/data-tables/call`);
	});
});
