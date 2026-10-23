import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	JsonObject,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
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

class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown },
	) {
		super(message);
	}
}

const apiError = (status: number, data: unknown) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
		}) as unknown as JsonObject,
	);

const notNull = () =>
	apiError(400, {
		code: '23502',
		message: 'null value in column "sku" of relation "orders" violates not-null constraint',
	});

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
	// Each entry answers one call in order; an Error entry rejects it
	const run = (
		responses: unknown[],
		overrides: Record<string, NodeParameterValueType | object> = {},
		inputJson?: IDataObject[],
		itemIndex = 0,
	) => {
		const context = setupContext(overrides, inputJson, itemIndex);
		for (const response of responses) {
			if (response instanceof Error) apiMock(context).mockRejectedValueOnce(response);
			else apiMock(context).mockResolvedValueOnce(response);
		}
		return { context, result: upsert.call(context, itemIndex) };
	};
	const sent = (context: ReturnType<typeof setupContext>, call = 0) =>
		apiMock(context).mock.calls[call][1] as {
			method: string;
			url: string;
			qs: IDataObject;
			body: IDataObject;
			headers: IDataObject;
		};

	it('posts the row against the column to match on', async () => {
		const { context, result } = run([[{ sku: 'WF-2', price: 10 }]]);

		expect(await result).toEqual([{ json: { sku: 'WF-2', price: 10 }, pairedItem: { item: 0 } }]);
		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({ method: 'POST', url: TABLE_URL }),
		);
		expect(sent(context).qs).toEqual({ on_conflict: 'sku' });
	});

	it('asks Postgres to merge rather than fail on a duplicate', async () => {
		const { context, result } = run([[{ sku: 'WF-2' }]]);
		await result;

		expect(sent(context).headers.Prefer).toBe('resolution=merge-duplicates,return=representation');
	});

	// Update strips the match column from its body. ON CONFLICT needs it, so this
	// operation must not.
	it('writes the match column too', async () => {
		const { context, result } = run([[{ sku: 'WF-2' }]]);
		await result;

		expect(sent(context).body).toEqual({ sku: 'WF-2', price: 10 });
	});

	it('does not write columns the user left alone', async () => {
		const { context, result } = run([[{ sku: 'WF-2' }]], {
			'columns.value': { sku: 'WF-2', price: 10, note: null, colour: undefined },
		});
		await result;

		expect(sent(context).body).toEqual({ sku: 'WF-2', price: 10 });
	});

	it('matches on every chosen column, for a composite key', async () => {
		const { context, result } = run([[{ sku: 'WF-2' }]], {
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
		const { context, result } = run([[{ sku: 'auto' }]], AUTO_MAP, [
			{ sku: 'auto', price: 3, upstreamNoise: 'x' },
		]);
		await result;

		expect(sent(context).qs).toEqual({ on_conflict: 'sku' });
		expect(sent(context).body).toEqual({ sku: 'auto', price: 3 });
	});

	// A reserved character ends an unquoted name, so `user.id` would reach Postgres
	// as `user` and conflict on the wrong column
	it('quotes a match column whose name needs it', async () => {
		const { context, result } = run([[{ 'user.id': 1 }]], {
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
		const { context, result } = run([[{ legacyId: value }]], {
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
		const { context, result } = run([[{ sku: 'WF-2' }]], {
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
		['the auto-mapped value is undefined', AUTO_MAP, [{ sku: undefined, price: 10 }]],
		[
			"the column is named after one of Object's own",
			{ 'columns.matchingColumns': ['constructor'], 'columns.value': { price: 10 } },
			undefined,
		],
	])(
		'refuses to run when the match column has no value and %s',
		async (_name, overrides, input) => {
			const { context, result } = run([[{ sku: 'WF-2' }]], overrides, input);

			await expect(result).rejects.toThrow('The column to match on has no value');
			expect(apiMock(context)).not.toHaveBeenCalled();
		},
	);

	it('names every match column that has no value', async () => {
		const { context, result } = run([[{ sku: 'WF-2' }]], {
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
		const { result } = run([response]);

		expect(await result).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
	});

	it('pairs each written row to the item it came from', async () => {
		const { result } = run([[{ sku: 'WF-2' }, { sku: 'WF-3' }]], {}, undefined, 2);

		expect(await result).toEqual([
			{ json: { sku: 'WF-2' }, pairedItem: { item: 2 } },
			{ json: { sku: 'WF-3' }, pairedItem: { item: 2 } },
		]);
	});

	// A partial row hits the NOT NULL check before ON CONFLICT, so the merge never
	// runs. The fallback updates the row the key already points at.
	it('updates the existing row when the insert lacks a required column', async () => {
		const { context, result } = run(
			[
				notNull(),
				[
					{ sku: 'WF-2', price: 10 },
					{ sku: 'WF-2', price: 11 },
				],
			],
			{},
			undefined,
			2,
		);

		expect(await result).toEqual([
			{ json: { sku: 'WF-2', price: 10 }, pairedItem: { item: 2 } },
			{ json: { sku: 'WF-2', price: 11 }, pairedItem: { item: 2 } },
		]);
		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(sent(context, 0)).toMatchObject({
			method: 'POST',
			qs: { on_conflict: 'sku' },
			headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
		});
		expect(sent(context, 1)).toMatchObject({
			method: 'PATCH',
			url: TABLE_URL,
			qs: { and: '(sku.eq.WF-2)' },
			body: { price: 10 },
			headers: { Prefer: 'return=representation' },
		});
	});

	it('keeps the match columns out of the update', async () => {
		const { context, result } = run([notNull(), [{ sku: 'WF-2', region: 'eu', price: 10 }]], {
			'columns.matchingColumns': ['sku', 'region'],
			'columns.value': { sku: 'WF-2', region: 'eu', price: 10 },
		});
		await result;

		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(sent(context, 1).qs).toEqual({ and: '(sku.eq.WF-2,region.eq.eu)' });
		expect(sent(context, 1).body).toEqual({ price: 10 });
	});

	it('updates from the input item when mapping automatically', async () => {
		const { context, result } = run([notNull(), [{ sku: 'auto', price: 3 }]], AUTO_MAP, [
			{ sku: 'auto', price: 3, upstreamNoise: 'x' },
		]);
		await result;

		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(sent(context, 1).qs).toEqual({ and: '(sku.eq.auto)' });
		expect(sent(context, 1).body).toEqual({ price: 3 });
	});

	it('quotes a match column in the update filter', async () => {
		const { context, result } = run([notNull(), [{ 'user.id': 1 }]], {
			'columns.matchingColumns': ['user.id'],
			'columns.value': { 'user.id': 1, price: 10 },
		});
		await result;

		expect(apiMock(context)).toHaveBeenCalledTimes(2);
		expect(sent(context, 1).qs).toEqual({ and: '("user.id".eq.1)' });
	});

	// No row came back, so the key is new and the insert error names the real gap
	it.each([
		['nothing matched', []],
		['the project does not echo rows', undefined],
		['the response is not an array', { ok: true }],
	])('rethrows the insert error when the update writes no row and %s', async (_name, answer) => {
		const error = notNull();
		const { context, result } = run([error, answer]);

		await expect(result).rejects.toBe(error);
		await expect(result).rejects.toThrow('null value in column "sku"');
		expect(apiMock(context)).toHaveBeenCalledTimes(2);
	});

	it('rethrows without a second call when only the match columns are mapped', async () => {
		const error = notNull();
		const { context, result } = run([error], { 'columns.value': { sku: 'WF-2' } });

		await expect(result).rejects.toBe(error);
		expect(apiMock(context)).toHaveBeenCalledTimes(1);
	});

	// A blank column name drops out of the filter, and an unfiltered update would
	// rewrite every row
	it('rethrows without a second call when the match column name is empty', async () => {
		const error = notNull();
		const { context, result } = run([error], {
			'columns.matchingColumns': [''],
			'columns.value': { '': 'x', price: 10 },
		});

		await expect(result).rejects.toBe(error);
		expect(apiMock(context)).toHaveBeenCalledTimes(1);
	});

	it.each([
		[
			'a conflict target without a unique constraint',
			apiError(400, { code: '42P10', message: 'no unique constraint' }),
		],
		['a duplicate key', apiError(409, { code: '23505', message: 'duplicate key' })],
		['a body that is not a record', apiError(400, 'null value in column "sku"')],
		['a transport failure', new Error('boom')],
	])('propagates %s without a second call', async (_name, error) => {
		const { context, result } = run([error]);

		await expect(result).rejects.toBe(error);
		expect(apiMock(context)).toHaveBeenCalledTimes(1);
	});

	it('surfaces an error from the update itself', async () => {
		const denied = apiError(403, { code: '42501', message: 'permission denied' });
		const { context, result } = run([notNull(), denied]);

		await expect(result).rejects.toBe(denied);
		expect(apiMock(context)).toHaveBeenCalledTimes(2);
	});
});
