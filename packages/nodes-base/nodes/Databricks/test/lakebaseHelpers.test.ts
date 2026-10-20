import { NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	NodeParameterValueType,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import {
	resolveLakebaseFunctionUrl,
	resolveLakebaseTableUrl,
	resolveSelectedLakebaseSchema,
} from '../actions/lakebase/helpers';

const REST_BASE = 'https://host.example/api/2.0/workspace/7/rest';

vi.mock('../transport', async (importOriginal) => ({
	...(await importOriginal<typeof import('../transport')>()),
	resolveLakebaseRestBase: vi.fn(async () => REST_BASE),
}));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const locators = {
	lakebaseProject: 'proj',
	lakebaseBranch: 'main',
	lakebaseDatabase: 'app',
	lakebaseSchema: 'public',
};

describe('Lakebase -> helpers', () => {
	const executeContext = (values: Record<string, NodeParameterValueType | object>) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name, _i, fallback) => values[name] ?? fallback);
		return context;
	};
	const loadContext = (values: Record<string, NodeParameterValueType | object>) => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNode.mockReturnValue(node);
		context.getCurrentNodeParameter.mockImplementation((name) => values[name]);
		return context;
	};

	describe('resolveLakebaseFunctionUrl', () => {
		it('appends the encoded function name under rpc', async () => {
			const context = executeContext({ ...locators, lakebaseFunction: 'my fn' });

			expect(await resolveLakebaseFunctionUrl(context, 0)).toBe(
				`${REST_BASE}/app/public/rpc/my%20fn`,
			);
		});

		it.each(['..', '.'])('rejects the traversal function name %s', async (name) => {
			const context = executeContext({ ...locators, lakebaseFunction: name });

			await expect(resolveLakebaseFunctionUrl(context, 0)).rejects.toThrow(
				`Invalid identifier: "${name}" is not allowed`,
			);
		});

		it('asks for a function when the locator is empty', async () => {
			const context = executeContext({ ...locators, lakebaseFunction: '' });

			const failure = resolveLakebaseFunctionUrl(context, 3);

			await expect(failure).rejects.toThrow(NodeOperationError);
			await expect(failure).rejects.toThrow('Select a Lakebase function');
			await expect(failure).rejects.toMatchObject({ context: { itemIndex: 3 } });
		});

		it.each([
			['lakebaseProject', 'project'],
			['lakebaseBranch', 'branch'],
			['lakebaseDatabase', 'database'],
			['lakebaseSchema', 'schema'],
		])('asks for the %s when that locator is empty', async (name, label) => {
			const context = executeContext({ ...locators, lakebaseFunction: 'fn', [name]: '' });

			const failure = resolveLakebaseFunctionUrl(context, 3);

			await expect(failure).rejects.toThrow(`Select a Lakebase ${label}`);
			await expect(failure).rejects.toMatchObject({ context: { itemIndex: 3 } });
		});
	});

	it('resolveLakebaseTableUrl encodes the table name', async () => {
		const context = executeContext({ ...locators, lakebaseTable: 'my table' });

		expect(await resolveLakebaseTableUrl(context, 0)).toBe(`${REST_BASE}/app/public/my%20table`);
	});

	describe('resolveSelectedLakebaseSchema', () => {
		it('resolves the selected function next to the schema URL', async () => {
			const context = loadContext({ ...locators, lakebaseFunction: 'spike_add' });

			expect(await resolveSelectedLakebaseSchema(context, 'function')).toEqual({
				schemaUrl: `${REST_BASE}/app/public`,
				name: 'spike_add',
			});
		});

		it('reads a locator object and encodes the database and schema', async () => {
			const context = loadContext({
				...locators,
				lakebaseDatabase: { mode: 'list', value: 'my db' },
				lakebaseSchema: 'my schema',
				lakebaseTable: 'orders',
			});

			expect(await resolveSelectedLakebaseSchema(context)).toEqual({
				schemaUrl: `${REST_BASE}/my%20db/my%20schema`,
				name: 'orders',
			});
		});

		it.each(['lakebaseProject', 'lakebaseBranch', 'lakebaseDatabase', 'lakebaseSchema'])(
			'is null while %s is unset',
			async (missing) => {
				const context = loadContext({ ...locators, lakebaseFunction: 'fn', [missing]: '' });

				expect(await resolveSelectedLakebaseSchema(context, 'function')).toBeNull();
			},
		);

		it('is null while the function is unset, even with a table selected', async () => {
			const context = loadContext({ ...locators, lakebaseTable: 'orders' });

			expect(await resolveSelectedLakebaseSchema(context, 'function')).toBeNull();
		});
	});
});
