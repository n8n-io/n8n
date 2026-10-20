import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as upsert } from '../actions/lakebase/upsert.operation';

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

describe('Lakebase -> Insert or Update', () => {
	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		inputJson: IDataObject[] = [{ sku: 'from-input', price: 10 }],
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'oAuth2',
			'columns.mappingMode': 'defineBelow',
			'columns.matchingColumns': ['sku'],
			'columns.value': { sku: 'WF-2', price: 10 },
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue(inputJson.map((json) => ({ json })));
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name, index, fallback) =>
			// Core answers the fallback for a parameter that is not there, but hands
			// back a stored null as null, which is what the mapper writes before it
			// is opened. `??` would collapse the two.
			(index === itemIndex || name === 'authentication') && parameters[name] !== undefined
				? parameters[name]
				: fallback,
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
		return { context, result: upsert.call(context, itemIndex) };
	};
	const sent = (context: ReturnType<typeof setupContext>) =>
		apiMock(context).mock.calls[0][1] as {
			qs: IDataObject;
			body: IDataObject;
			headers: IDataObject;
		};

	it('posts the row against the column to match on', async () => {
		const { context, result } = run([{ sku: 'WF-2', price: 10 }]);

		expect(await result).toEqual([{ json: { sku: 'WF-2', price: 10 }, pairedItem: { item: 0 } }]);
		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ method: 'POST', url: TABLE_URL }),
		);
		expect(sent(context).qs).toEqual({ on_conflict: 'sku' });
	});

	it('asks Postgres to merge rather than fail on a duplicate', async () => {
		const { context, result } = run([{ sku: 'WF-2' }]);
		await result;

		expect(sent(context).headers.Prefer).toBe('resolution=merge-duplicates,return=representation');
	});

	// Update strips the match column from its body. ON CONFLICT needs it, so this
	// operation must not.
	it('writes the match column too', async () => {
		const { context, result } = run([{ sku: 'WF-2' }]);
		await result;

		expect(sent(context).body).toEqual({ sku: 'WF-2', price: 10 });
	});

	it('does not write columns the user left alone', async () => {
		const { context, result } = run([{ sku: 'WF-2' }], {
			'columns.value': { sku: 'WF-2', price: 10, note: null, colour: undefined },
		});
		await result;

		expect(sent(context).body).toEqual({ sku: 'WF-2', price: 10 });
	});

	it('matches on every chosen column, for a composite key', async () => {
		const { context, result } = run([{ sku: 'WF-2' }], {
			'columns.matchingColumns': ['sku', 'region'],
			'columns.value': { sku: 'WF-2', region: 'eu', price: 10 },
		});
		await result;

		expect(sent(context).qs).toEqual({ on_conflict: 'sku,region' });
		expect(sent(context).body).toEqual({ sku: 'WF-2', region: 'eu', price: 10 });
	});

	const AUTO_MAP = {
		'columns.mappingMode': 'autoMapInputData',
		'columns.schema': [{ id: 'sku' }, { id: 'price' }],
	};

	it('takes the match value from the input item when mapping automatically', async () => {
		const { context, result } = run([{ sku: 'auto' }], AUTO_MAP, [
			{ sku: 'auto', price: 3, upstreamNoise: 'x' },
		]);
		await result;

		expect(sent(context).qs).toEqual({ on_conflict: 'sku' });
		expect(sent(context).body).toEqual({ sku: 'auto', price: 3 });
	});

	// A reserved character ends an unquoted name, so `user.id` would reach Postgres
	// as `user` and conflict on the wrong column
	it('quotes a match column whose name needs it', async () => {
		const { context, result } = run([{ 'user.id': 1 }], {
			'columns.matchingColumns': ['user.id'],
			'columns.value': { 'user.id': 1, price: 10 },
		});
		await result;

		expect(sent(context).qs).toEqual({ on_conflict: '"user.id"' });
	});

	// 0 and false are real keys. The guard looks for an absent column, not a falsy one.
	it.each([
		['zero', 0],
		['false', false],
		['an empty string', ''],
	])('matches on a value of %s', async (_name, value) => {
		const { context, result } = run([{ legacyId: value }], {
			'columns.matchingColumns': ['legacyId'],
			'columns.value': { legacyId: value, price: 10 },
		});
		await result;

		expect(sent(context).qs).toEqual({ on_conflict: 'legacyId' });
		expect(sent(context).body).toEqual({ legacyId: value, price: 10 });
	});

	it.each([
		['the user chose none', []],
		['the parameter is absent', undefined],
	])('refuses to run when %s', async (_name, matchingColumns) => {
		const { context, result } = run([{ sku: 'WF-2' }], {
			'columns.matchingColumns': matchingColumns,
		});

		await expect(result).rejects.toThrow('Select a column to match on');
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	// A null is the case that matters: Postgres counts two nulls as different, so
	// ON CONFLICT would never fire and every run would insert another row.
	it.each<[string, Record<string, NodeParameterValueType | object>, IDataObject[] | undefined]>([
		['the user left it empty', { 'columns.value': { price: 10 } }, undefined],
		['the mapper was never opened', { 'columns.value': null }, undefined],
		['the mapped value is null', { 'columns.value': { sku: null, price: 10 } }, undefined],
		['the input item carries a null', AUTO_MAP, [{ sku: null, price: 10 }]],
		[
			"the column is named after one of Object's own",
			{ 'columns.matchingColumns': ['constructor'], 'columns.value': { price: 10 } },
			undefined,
		],
	])(
		'refuses to run when the match column has no value and %s',
		async (_name, overrides, input) => {
			const { context, result } = run([{ sku: 'WF-2' }], overrides, input);

			await expect(result).rejects.toThrow('The column to match on has no value');
			expect(apiMock(context)).not.toHaveBeenCalled();
		},
	);

	it('names every match column that has no value', async () => {
		const { context, result } = run([{ sku: 'WF-2' }], {
			'columns.matchingColumns': ['sku', 'region'],
			'columns.value': { price: 10 },
		});

		await expect(result).rejects.toThrow('The column to match on has no value: sku, region');
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	// The row is always written, so an empty answer is the project declining to
	// echo it, not a miss.
	it.each([
		['the project does not echo rows', undefined],
		['the response is not an array', { ok: true }],
		['the response is empty', []],
	])('reports success when %s', async (_name, response) => {
		const { result } = run(response);

		expect(await result).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
	});

	it('pairs each written row to the item it came from', async () => {
		const { result } = run([{ sku: 'WF-2' }, { sku: 'WF-3' }], {}, undefined, 2);

		expect(await result).toEqual([
			{ json: { sku: 'WF-2' }, pairedItem: { item: 2 } },
			{ json: { sku: 'WF-3' }, pairedItem: { item: 2 } },
		]);
	});
});
