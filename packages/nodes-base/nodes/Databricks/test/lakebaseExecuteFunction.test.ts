import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute as executeFunction } from '../actions/lakebase/executeFunction.operation';

const FN_URL = 'https://host.example/api/2.0/workspace/7/rest/app/public/rpc/spike_add';

vi.mock('../actions/lakebase/helpers', () => ({
	resolveLakebaseFunctionUrl: vi.fn(async () => FN_URL),
}));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Lakebase -> Execute Function', () => {
	const setupContext = (
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
	) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'oAuth2',
			'functionArguments.value': { a: 1, b: 2 },
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
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
		body: unknown,
		overrides: Record<string, NodeParameterValueType | object> = {},
		itemIndex = 0,
		statusCode = 200,
	) => {
		const context = setupContext(overrides, itemIndex);
		apiMock(context).mockResolvedValue({ statusCode, body, headers: {} });
		return { context, result: executeFunction.call(context, itemIndex) };
	};
	const requestOptions = (context: ReturnType<typeof setupContext>) =>
		apiMock(context).mock.calls[0][1] as { body: unknown; headers: Record<string, string> };

	it('posts the form arguments to the function', async () => {
		const { context, result } = run(3);
		await result;

		expect(apiMock(context).mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(apiMock(context).mock.calls[0][1]).toEqual(
			expect.objectContaining({
				method: 'POST',
				url: FN_URL,
				json: true,
				returnFullResponse: true,
				body: { a: 1, b: 2 },
				headers: expect.objectContaining({ Accept: 'application/json' }),
			}),
		);
		expect(requestOptions(context).headers.Prefer).toBeUndefined();
	});

	it.each([
		['null', null],
		['not an object', 'x'],
	])('sends an empty object when the form value is %s', async (_name, value) => {
		const { context, result } = run(3, { 'functionArguments.value': value });
		await result;

		expect(requestOptions(context).body).toEqual({});
	});

	it.each([
		['null', { a: 1, b: null }],
		['undefined', { a: 1, b: undefined }],
	])('leaves out a form argument that is %s', async (_name, value) => {
		const { context, result } = run(3, { 'functionArguments.value': value });
		await result;

		expect(requestOptions(context).body).toEqual({ a: 1 });
	});

	it('keeps a boolean argument that is false', async () => {
		const { context, result } = run(3, { 'functionArguments.value': { a: 1, flag: false } });
		await result;

		expect(requestOptions(context).body).toEqual({ a: 1, flag: false });
	});

	describe('JSON mode', () => {
		it('parses a JSON string', async () => {
			const { context, result } = run(3, {
				specifyArguments: 'json',
				argumentsJson: '{"a":1,"b":2}',
			});
			await result;

			expect(requestOptions(context).body).toEqual({ a: 1, b: 2 });
		});

		it('passes an object through', async () => {
			const { context, result } = run(3, { specifyArguments: 'json', argumentsJson: { a: 1 } });
			await result;

			expect(requestOptions(context).body).toEqual({ a: 1 });
		});

		it('keeps an explicit null', async () => {
			const { context, result } = run(3, {
				specifyArguments: 'json',
				argumentsJson: '{"a":1,"b":null}',
			});
			await result;

			expect(requestOptions(context).body).toEqual({ a: 1, b: null });
		});

		it.each([
			['an array', '[1,2]'],
			['a string', '"x"'],
		])('rejects %s before any request', async (_name, argumentsJson) => {
			const { context, result } = run(3, { specifyArguments: 'json', argumentsJson }, 2);

			await expect(result).rejects.toThrow('Arguments (JSON) must be a JSON object');
			await expect(result).rejects.toMatchObject({ context: { itemIndex: 2 } });
			expect(apiMock(context)).not.toHaveBeenCalled();
		});

		it('rejects invalid JSON before any request', async () => {
			const { context, result } = run(3, { specifyArguments: 'json', argumentsJson: '{nope' });

			await expect(result).rejects.toThrow('Arguments (JSON) is not valid JSON');
			expect(apiMock(context)).not.toHaveBeenCalled();
		});
	});

	it.each([
		['a number', 42, [{ result: 42 }]],
		['zero', 0, [{ result: 0 }]],
		['false', false, [{ result: false }]],
		['true', true, [{ result: true }]],
		['a string', 'ok', [{ result: 'ok' }]],
		['rows', [{ id: 1 }, { id: 2 }], [{ id: 1 }, { id: 2 }]],
		['scalars in a set', [1, 2], [{ result: 1 }, { result: 2 }]],
		['an empty set', [], []],
		['one record', { total: 3 }, [{ total: 3 }]],
		['no body', undefined, [{ success: true }]],
		['null', null, [{ result: null }]],
		['an empty string', '', [{ result: '' }]],
	])('shapes %s as items', async (_name, body, expected) => {
		const { result } = run(body);

		expect(await result).toEqual(expected.map((json) => ({ json, pairedItem: { item: 0 } })));
	});

	it('reports success for a void function (204)', async () => {
		const { result } = run(undefined, {}, 0, 204);

		expect(await result).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
	});

	it('pairs every item to the item index it was handed', async () => {
		const { result } = run([{ id: 1 }, { id: 2 }], {}, 2);

		expect(await result).toEqual([
			{ json: { id: 1 }, pairedItem: { item: 2 } },
			{ json: { id: 2 }, pairedItem: { item: 2 } },
		]);
	});
});
