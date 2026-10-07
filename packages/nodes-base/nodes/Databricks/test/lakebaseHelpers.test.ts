import { NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	NodeParameterValueType,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import {
	readLakebaseTarget,
	resolveLakebaseFunctionUrl,
	resolveLakebaseSchemaUrlFor,
	resolveLakebaseTableUrl,
} from '../actions/lakebase/helpers';
import { resolveLakebaseRestBase } from '../transport';

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
		context.getNodeParameter.mockImplementation((name) => values[name]);
		return context;
	};

	describe('resolveLakebaseFunctionUrl', () => {
		it('appends the encoded function name under rpc', async () => {
			const context = executeContext({ ...locators, lakebaseFunction: 'my fn' });

			expect(await resolveLakebaseFunctionUrl(context, 0)).toBe(
				`${REST_BASE}/app/public/rpc/my%20fn`,
			);
		});

		it('asks for a function when the locator is empty', async () => {
			const context = executeContext({ ...locators, lakebaseFunction: '' });

			const failure = resolveLakebaseFunctionUrl(context, 3);

			await expect(failure).rejects.toThrow(NodeOperationError);
			await expect(failure).rejects.toThrow('Select a Lakebase function');
			await expect(failure).rejects.toMatchObject({ context: { itemIndex: 3 } });
		});
	});

	it('resolveLakebaseTableUrl encodes the table name', async () => {
		const context = executeContext({ ...locators, lakebaseTable: 'my table' });

		expect(await resolveLakebaseTableUrl(context, 0)).toBe(`${REST_BASE}/app/public/my%20table`);
	});

	describe('readLakebaseTarget', () => {
		it('reads the four schema locators', () => {
			expect(readLakebaseTarget(loadContext(locators))).toEqual({
				project: 'proj',
				branch: 'main',
				database: 'app',
				schema: 'public',
			});
		});

		it.each([
			['unset', undefined],
			['not a string', { mode: 'list' }],
		])('reads an empty string for a locator that is %s', (_name, value) => {
			const target = readLakebaseTarget(loadContext({ ...locators, lakebaseBranch: value }));

			expect(target.branch).toBe('');
		});
	});

	it('resolveLakebaseSchemaUrlFor encodes the database and schema', async () => {
		const context = loadContext({});

		const url = await resolveLakebaseSchemaUrlFor(context, {
			project: 'proj',
			branch: 'main',
			database: 'my db',
			schema: 'my schema',
		});

		expect(url).toBe(`${REST_BASE}/my%20db/my%20schema`);
		expect(resolveLakebaseRestBase).toHaveBeenCalledWith(context, 'proj', 'main');
	});
});
