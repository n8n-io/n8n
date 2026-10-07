import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as update } from '../actions/lakebase/update.operation';

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

describe('Lakebase -> Update', () => {
	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		inputJson: IDataObject[] = [{ id: 7, sku: 'from-input' }],
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'oAuth2',
			'columns.mappingMode': 'defineBelow',
			'columns.matchingColumns': ['id'],
			'columns.value': { id: 7, sku: 'WF-2' },
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue(inputJson.map((json) => ({ json })));
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
		inputJson?: IDataObject[],
		itemIndex = 0,
	) => {
		const context = setupContext(overrides, inputJson, itemIndex);
		apiMock(context).mockResolvedValue(response);
		return { context, result: update.call(context, itemIndex) };
	};
	const sent = (context: ReturnType<typeof setupContext>) =>
		apiMock(context).mock.calls[0][1] as {
			qs: IDataObject;
			body: IDataObject;
			headers: IDataObject;
		};

	it('patches the rows the match column selects', async () => {
		const { context, result } = run([{ id: 7, sku: 'WF-2' }]);

		expect(await result).toEqual([{ json: { id: 7, sku: 'WF-2' }, pairedItem: { item: 0 } }]);
		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ method: 'PATCH', url: TABLE_URL }),
		);
		expect(sent(context).qs).toEqual({ and: '(id.eq.7)' });
	});

	it('keeps the match column out of the values it writes', async () => {
		const { context, result } = run([{ id: 7 }]);
		await result;

		expect(sent(context).body).toEqual({ sku: 'WF-2' });
		expect(sent(context).body).not.toHaveProperty('id');
	});

	it('does not write columns the user left alone', async () => {
		const { context, result } = run([{ id: 7 }], {
			'columns.value': { id: 7, sku: 'WF-2', price: null, note: undefined },
		});
		await result;

		expect(sent(context).body).toEqual({ sku: 'WF-2' });
	});

	it('matches on every chosen column', async () => {
		const { context, result } = run([{ id: 7 }], {
			'columns.matchingColumns': ['id', 'sku'],
			'columns.value': { id: 7, sku: 'WF-2', price: 10 },
		});
		await result;

		expect(sent(context).qs).toEqual({ and: '(id.eq.7,sku.eq.WF-2)' });
		expect(sent(context).body).toEqual({ price: 10 });
	});

	it('asks the Data API to echo what it changed', async () => {
		const { context, result } = run([{ id: 7 }]);
		await result;

		expect(sent(context).headers.Prefer).toBe('return=representation');
	});

	it('takes the match value from the input item when mapping automatically', async () => {
		const { context, result } = run(
			[{ id: 9 }],
			{
				'columns.mappingMode': 'autoMapInputData',
				'columns.schema': [{ id: 'id' }, { id: 'sku' }],
			},
			[{ id: 9, sku: 'auto', upstreamNoise: 'x' }],
		);
		await result;

		expect(sent(context).qs).toEqual({ and: '(id.eq.9)' });
		expect(sent(context).body).toEqual({ sku: 'auto' });
	});

	it('refuses to run with no column to match on', async () => {
		const { context, result } = run([{ id: 7 }], { 'columns.matchingColumns': [] });

		await expect(result).rejects.toThrow('Select a column to match on');
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('refuses to run when the match column has no value', async () => {
		const { context, result } = run([{ id: 7 }], { 'columns.value': { sku: 'WF-2' } });

		await expect(result).rejects.toThrow('The column to match on has no value');
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

	it('pairs each changed row to the item it came from', async () => {
		const { result } = run([{ id: 7 }, { id: 8 }], {}, undefined, 2);

		expect(await result).toEqual([
			{ json: { id: 7 }, pairedItem: { item: 2 } },
			{ json: { id: 8 }, pairedItem: { item: 2 } },
		]);
	});
});
