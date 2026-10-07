import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as insert } from '../actions/lakebase/insert.operation';

const TABLE_URL = 'https://host.example/api/2.0/workspace/7/rest/app/public/orders';

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

describe('Lakebase -> Insert', () => {
	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		inputJson: IDataObject[] = [{ sku: 'from-input' }],
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'oAuth2',
			'columns.mappingMode': 'defineBelow',
			'columns.value': { sku: 'WF-1', price: 10 },
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
		return { context, result: insert.call(context, itemIndex) };
	};

	it('posts the mapped columns to the table', async () => {
		const { context, result } = run([{ id: 1, sku: 'WF-1', price: 10 }]);

		expect(await result).toEqual([
			{ json: { id: 1, sku: 'WF-1', price: 10 }, pairedItem: { item: 0 } },
		]);
		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({
				method: 'POST',
				url: TABLE_URL,
				body: { sku: 'WF-1', price: 10 },
			}),
		);
	});

	it('asks the Data API to echo the created row', async () => {
		const { context, result } = run([{ id: 1 }]);
		await result;

		const options = apiMock(context).mock.calls[0][1] as { headers: Record<string, string> };
		expect(options.headers.Prefer).toBe('return=representation');
	});

	it('sends the input item when the mapping mode is automatic', async () => {
		const { context, result } = run([{ id: 2 }], { 'columns.mappingMode': 'autoMapInputData' }, [
			{ sku: 'from-input' },
		]);
		await result;

		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ body: { sku: 'from-input' } }),
		);
	});

	it('drops input fields the table does not have', async () => {
		const { context, result } = run(
			[{ id: 1 }],
			{
				'columns.mappingMode': 'autoMapInputData',
				'columns.schema': [{ id: 'sku' }, { id: 'price' }],
			},
			[{ sku: 'WF-1', price: 10, upstreamNoise: 'x' }],
		);
		await result;

		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ body: { sku: 'WF-1', price: 10 } }),
		);
	});

	it('sends the whole item when no schema is saved', async () => {
		const { context, result } = run([{ id: 1 }], { 'columns.mappingMode': 'autoMapInputData' }, [
			{ sku: 'WF-1' },
		]);
		await result;

		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ body: { sku: 'WF-1' } }),
		);
	});

	it('sends an empty row when every column is left to the database', async () => {
		const { context, result } = run([{ id: 1 }], { 'columns.value': null });
		await result;

		expect(apiMock(context).mock.calls[0][1]).toEqual(expect.objectContaining({ body: {} }));
	});

	it('returns every row the Data API echoes back', async () => {
		const { result } = run([{ id: 1 }, { id: 2 }]);

		expect(await result).toEqual([
			{ json: { id: 1 }, pairedItem: { item: 0 } },
			{ json: { id: 2 }, pairedItem: { item: 0 } },
		]);
	});

	it.each([
		['an empty array', []],
		['no body at all', undefined],
		['something that is not an array', { ok: true }],
	])('reports success when the response is %s', async (_name, response) => {
		const { result } = run(response);

		expect(await result).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
	});

	it('pairs the row to the item index it was handed', async () => {
		const { result } = run([{ id: 9 }], {}, [{ a: 1 }, { b: 2 }, { c: 3 }], 2);

		expect(await result).toEqual([{ json: { id: 9 }, pairedItem: { item: 2 } }]);
	});
});
