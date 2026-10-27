import type {
	IBinaryData,
	IExecuteData,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INode,
	INodeExecutionData,
	INodeTypes,
	PostReceiveAction,
} from 'n8n-workflow';
import { NodeOperationError, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { runPostReceiveAction } from '../post-receive';

const node: INode = {
	id: 'n1',
	name: 'Test',
	type: 'test',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};
const workflow = new Workflow({
	nodes: [node],
	connections: {},
	active: false,
	nodeTypes: mock<INodeTypes>(),
});
const executeData: IExecuteData = { node, data: {}, source: null };
const binaryData = mock<IBinaryData>();
const executeSingleFunctions = mock<IExecuteSingleFunctions>({
	getExecuteData: () => executeData,
	helpers: { prepareBinaryData: vi.fn(async () => binaryData) },
});
const getCredentials = vi.fn(async () => ({ minId: 2 }));

const run = async (
	action: PostReceiveAction,
	items: INodeExecutionData[],
	body: IN8nHttpFullResponse['body'] = {},
	parameterValue?: string,
) =>
	await runPostReceiveAction(
		executeSingleFunctions,
		action,
		items,
		{ body, headers: {}, statusCode: 200 },
		parameterValue,
		0,
		0,
		{
			node,
			resolveValue: (value, itemIndex, runIndex, data, additionalKeys) =>
				workflow.expression.getParameterValue(
					value,
					null,
					runIndex,
					itemIndex,
					node.name,
					[],
					'internal',
					additionalKeys,
					data,
				),
			getCredentials,
		},
	);

const json = (items: INodeExecutionData[]) => items.map((item) => item.json);

describe('runPostReceiveAction', () => {
	test('calls a function action with the items and the response', async () => {
		const action = vi.fn(async (items: INodeExecutionData[]) => items.slice(1));
		const items = [{ json: { id: 1 } }, { json: { id: 2 } }];

		const result = await run(action, items, { ok: true });

		expect(json(result)).toEqual([{ id: 2 }]);
		expect(action.mock.contexts[0]).toBe(executeSingleFunctions);
		expect(action).toHaveBeenCalledWith(items, expect.objectContaining({ body: { ok: true } }));
	});

	describe('rootProperty', () => {
		test('returns one item for each array entry and wraps a single value', async () => {
			const result = await run({ type: 'rootProperty', properties: { property: 'data.list' } }, [
				{ json: { data: { list: [{ id: 1 }, { id: 2 }] } } },
				{ json: { data: { list: { id: 3 } } } },
			]);

			expect(json(result)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
		});

		test('throws a NodeOperationError when an item cannot be read', async () => {
			const unreadable = {
				get json(): never {
					throw new Error('unreadable');
				},
			};

			await expect(
				run({ type: 'rootProperty', properties: { property: 'data' } }, [unreadable]),
			).rejects.toThrow(NodeOperationError);
		});
	});

	test('filter keeps the items that pass and can read $credentials', async () => {
		const result = await run(
			{ type: 'filter', properties: { pass: '={{ $responseItem.id >= $credentials.minId }}' } },
			[{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }],
		);

		expect(json(result)).toEqual([{ id: 2 }, { id: 3 }]);
		expect(getCredentials).toHaveBeenCalled();
	});

	test('limit keeps the first maxResults items', async () => {
		const result = await run(
			{ type: 'limit', properties: { maxResults: '={{ $value }}' } },
			[{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }],
			{},
			'2',
		);

		expect(json(result)).toEqual([{ id: 1 }, { id: 2 }]);
	});

	test('set replaces the items with one resolved value', async () => {
		const result = await run(
			{ type: 'set', properties: { value: '={{ { total: $response.body.total, v: $version } }}' } },
			[{ json: { id: 1 } }, { json: { id: 2 } }],
			{ total: 2 },
		);

		expect(json(result)).toEqual([{ total: 2, v: 2 }]);
	});

	test('sort orders items by key without case, with missing values first', async () => {
		const result = await run({ type: 'sort', properties: { key: 'name' } }, [
			{ json: { name: 'banana' } },
			{ json: {} },
			{ json: { name: 'Apple' } },
			{ json: { name: 'BANANA' } },
			{ json: { name: 'cherry' } },
		]);

		expect(json(result)).toEqual([
			{},
			{ name: 'Apple' },
			{ name: 'banana' },
			{ name: 'BANANA' },
			{ name: 'cherry' },
		]);
	});

	test('setKeyValue builds each item from the resolved properties', async () => {
		const result = await run(
			{
				type: 'setKeyValue',
				properties: { name: '={{ $responseItem.label }}', value: '={{ $responseItem.id }}' },
			},
			[{ json: { id: 1, label: 'One' } }, { json: { id: 2, label: 'Two' } }],
		);

		expect(json(result)).toEqual([
			{ name: 'One', value: 1 },
			{ name: 'Two', value: 2 },
		]);
	});

	test('binaryData attaches the response body as binary data to each item', async () => {
		const result = await run(
			{ type: 'binaryData', properties: { destinationProperty: '={{ "file" + $version }}' } },
			[{ json: 'raw body' as never }, { json: { id: 1 } }],
			'file contents',
		);

		expect(executeSingleFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from('file contents'),
		);
		expect(result).toEqual([
			{ json: {}, binary: { file2: binaryData } },
			{ json: { id: 1 }, binary: { file2: binaryData } },
		]);
	});

	test('returns no items for an unknown action type', async () => {
		const result = await run({ type: 'unknown' } as never, [{ json: { id: 1 } }]);

		expect(result).toEqual([]);
	});
});
