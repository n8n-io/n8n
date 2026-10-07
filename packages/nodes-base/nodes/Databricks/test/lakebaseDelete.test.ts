import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as deleteRows } from '../actions/lakebase/deleteRows.operation';

const TABLE_URL = 'https://host.example/api/2.0/workspace/7/rest/app/public/orders';

// The URL assembly belongs to the picker PR, so the operation tests pin a fixed table URL
vi.mock('../actions/lakebase/helpers', () => ({
	resolveLakebaseTableUrl: vi.fn(async () => TABLE_URL),
	resolveLakebaseSchemaUrl: vi.fn(async () => TABLE_URL.replace(/\/orders$/, '')),
}));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const matchSku = [{ column: 'sku', condition: 'eq', value: 'WF-1' }];

describe('Lakebase -> Delete', () => {
	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'oAuth2',
			'where.values': matchSku,
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue([]);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name, index, fallback) =>
			index === itemIndex || name === 'authentication' ? (parameters[name] ?? fallback) : fallback,
		);
		context.getCredentials.mockResolvedValue({ host: 'https://host.example' });
		return context;
	};
	const apiMock = (context: ReturnType<typeof setupContext>) =>
		context.helpers.httpRequestWithAuthentication;
	const run = (
		response: unknown,
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const context = setupContext(overrides, itemIndex);
		apiMock(context).mockResolvedValue(response);
		return { context, result: deleteRows.call(context, itemIndex) };
	};

	it('deletes the rows the conditions select', async () => {
		const { context, result } = run([{ id: 1, sku: 'WF-1' }]);

		expect(await result).toEqual([{ json: { id: 1, sku: 'WF-1' }, pairedItem: { item: 0 } }]);
		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({
				method: 'DELETE',
				url: TABLE_URL,
				qs: { and: '(sku.eq.WF-1)' },
			}),
		);
	});

	it('asks the Data API to echo what it removed', async () => {
		const { context, result } = run([{ id: 1 }]);
		await result;

		const options = apiMock(context).mock.calls[0][1] as { headers: Record<string, string> };
		expect(options.headers.Prefer).toBe('return=representation');
	});

	it('combines conditions with OR when asked', async () => {
		const { context, result } = run([{ id: 1 }], {
			'where.values': [
				{ column: 'sku', condition: 'eq', value: 'a' },
				{ column: 'sku', condition: 'eq', value: 'b' },
			],
			combineConditions: 'OR',
		});
		await result;

		expect((apiMock(context).mock.calls[0][1] as { qs: IDataObject }).qs).toEqual({
			or: '(sku.eq.a,sku.eq.b)',
		});
	});

	it('sends no sort or column selection', async () => {
		const { context, result } = run([{ id: 1 }], {
			'sort.values': [{ column: 'sku', direction: 'asc' }],
			'options.outputColumns': ['sku'],
		});
		await result;

		const { qs } = apiMock(context).mock.calls[0][1] as { qs: IDataObject };
		expect(qs).toEqual({ and: '(sku.eq.WF-1)' });
	});

	it.each([
		['no conditions at all', []],
		['a condition row with no column', [{ condition: 'eq', value: 'WF-1' }]],
		['several rows, none with a column', [{ condition: 'eq' }, { value: 'x' }]],
	])('refuses to run with %s', async (_name, where) => {
		const { context, result } = run([{ id: 1 }], { 'where.values': where });

		await expect(result).rejects.toThrow('At least one condition is required');
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('refuses an OR filter that builds nothing', async () => {
		const { context, result } = run([{ id: 1 }], {
			'where.values': [{ condition: 'eq', value: 'x' }],
			combineConditions: 'OR',
		});

		await expect(result).rejects.toThrow('At least one condition is required');
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it.each([
		['nothing matched', []],
		['the project does not echo rows', undefined],
		['the response is not an array', { ok: true }],
	])('returns no items when %s', async (_name, response) => {
		const { result } = run(response);

		expect(await result).toEqual([]);
	});

	it('pairs each removed row to the item it came from', async () => {
		const { result } = run([{ id: 1 }, { id: 2 }], {}, 3);

		expect(await result).toEqual([
			{ json: { id: 1 }, pairedItem: { item: 3 } },
			{ json: { id: 2 }, pairedItem: { item: 3 } },
		]);
	});
});
