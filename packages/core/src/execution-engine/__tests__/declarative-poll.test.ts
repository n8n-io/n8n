import type {
	IDataObject,
	IDeclarativePollingTrigger,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createDeclarativePoll, DECLARATIVE_CURSOR_KEY } from '../declarative-poll';
import { PollContext } from '../node-execution-context';

const httpRequest = vi.fn<(options: IHttpRequestOptions) => Promise<unknown>>();

vi.mock('../node-execution-context/utils/request-helper-functions', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getRequestHelperFunctions: () => ({ httpRequest }),
}));

const makeNodeType = (trigger: IDeclarativePollingTrigger): INodeType => ({
	description: {
		displayName: 'Test Poll',
		name: 'testPoll',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		requestDefaults: { baseURL: 'https://api.example.com' },
		trigger,
	},
});

const idTrigger: IDeclarativePollingTrigger = {
	type: 'polling',
	routing: {
		request: { url: '/items', qs: { since: '={{ $cursor.value }}' } },
		output: { postReceive: [{ type: 'rootProperty', properties: { property: 'items' } }] },
	},
	cursor: { type: 'id', field: 'id' },
};

function setup(trigger: IDeclarativePollingTrigger, mode: WorkflowExecuteMode = 'trigger') {
	const nodeType = makeNodeType(trigger);
	const node: INode = {
		id: 'n1',
		name: 'Poll',
		type: 'testPoll',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const nodeTypes = mock<INodeTypes>({ getByNameAndVersion: () => nodeType });
	const workflow = new Workflow({
		id: 'w1',
		nodes: [node],
		connections: {},
		active: true,
		nodeTypes,
	});
	const context = new PollContext(
		workflow,
		node,
		mock<IWorkflowExecuteAdditionalData>({
			executionId: 'e1',
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
		}),
		mode,
		'init',
	);
	const poll = createDeclarativePoll(nodeType, trigger);
	const staticData = () => workflow.getStaticData('node', node);
	return { run: async () => await poll.call(context), staticData };
}

const respond = (items: IDataObject[]) =>
	httpRequest.mockResolvedValueOnce({ body: { items }, headers: {}, statusCode: 200 });

beforeEach(() => httpRequest.mockReset());

describe('createDeclarativePoll', () => {
	test('id cursor: first run seeds and emits nothing, later runs emit only newer items', async () => {
		const { run, staticData } = setup(idTrigger);

		respond([{ id: 1 }, { id: 2 }]);
		expect(await run()).toBeNull();
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 2 });

		respond([{ id: 2 }, { id: 4 }, { id: 3 }]);
		expect(await run()).toEqual([[{ json: { id: 4 } }, { json: { id: 3 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 4 });
		expect(httpRequest.mock.lastCall?.[0].qs).toEqual({ since: 2 });

		respond([{ id: 4 }]);
		expect(await run()).toBeNull();
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 4 });
	});

	test('timestamp cursor: first run seeds with now and makes no request', async () => {
		const { run, staticData } = setup({ ...idTrigger, cursor: { type: 'timestamp', field: 'at' } });
		const before = Date.now();

		expect(await run()).toBeNull();
		expect(httpRequest).not.toHaveBeenCalled();
		const seeded = new Date(String((staticData()[DECLARATIVE_CURSOR_KEY] as IDataObject).value));
		expect(seeded.getTime()).toBeGreaterThanOrEqual(before);

		respond([{ at: '2000-01-01T00:00:00Z' }, { at: '2999-01-01T00:00:00Z' }]);
		expect(await run()).toEqual([[{ json: { at: '2999-01-01T00:00:00Z' } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: '2999-01-01T00:00:00Z' });
	});

	test('timestamp cursor: a non-date field fails loudly instead of never emitting', async () => {
		const { run } = setup({ ...idTrigger, cursor: { type: 'timestamp', field: 'at' } });

		expect(await run()).toBeNull(); // seeds with an ISO "now"

		respond([{ at: 1757238000 }]);
		await expect(run()).rejects.toThrow(/non-date value from "at"/);
	});

	test('manual run returns the last item and leaves the cursor alone', async () => {
		const { run, staticData } = setup(idTrigger, 'manual');
		respond([{ id: 1 }, { id: 2 }]);

		expect(await run()).toEqual([[{ json: { id: 2 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toBeUndefined();
	});

	test('manual run shapes items through a function cursor but stores nothing', async () => {
		const cursor = vi.fn(async (items: INodeExecutionData[]) => ({
			items: items.map((item) => ({ json: { ...item.json, shaped: true } })),
			cursor: { value: 99 },
		}));
		const { run, staticData } = setup({ ...idTrigger, cursor }, 'manual');
		respond([{ id: 1 }, { id: 2 }]);

		expect(await run()).toEqual([[{ json: { id: 2, shaped: true } }]]);
		expect(cursor).toHaveBeenCalledWith([{ json: { id: 1 } }, { json: { id: 2 } }], undefined);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toBeUndefined();
	});

	test.each([
		{ maxResults: 0, expected: null },
		{ maxResults: -5, expected: null },
		{ maxResults: -Infinity, expected: null },
		{ maxResults: 2, expected: [[{ json: { id: 2 } }, { json: { id: 3 } }]] },
		// NaN falls back to the default; Infinity means "no limit".
		{ maxResults: NaN, expected: [[{ json: { id: 3 } }]] },
		{
			maxResults: Infinity,
			expected: [[{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]],
		},
	])('manual run clamps maxResults $maxResults', async ({ maxResults, expected }) => {
		const { run } = setup({ ...idTrigger, manual: { maxResults } }, 'manual');
		respond([{ id: 1 }, { id: 2 }, { id: 3 }]);

		expect(await run()).toEqual(expected);
	});

	test('$cursor resolves in postReceive actions, not only in the request', async () => {
		const { run } = setup({
			...idTrigger,
			routing: {
				request: { url: '/items' },
				output: {
					postReceive: [
						{ type: 'rootProperty', properties: { property: 'items' } },
						// Drops everything up to and including the stored cursor. Resolves to
						// `pass: false` for every item if `$cursor` is not threaded through.
						{
							type: 'filter',
							properties: { pass: '={{ $responseItem.id > ($cursor.value ?? 0) }}' },
						},
					],
				},
			},
		});

		respond([{ id: 1 }, { id: 2 }]);
		expect(await run()).toBeNull(); // seeds at 2

		respond([{ id: 1 }, { id: 2 }, { id: 3 }]);
		expect(await run()).toEqual([[{ json: { id: 3 } }]]);
	});

	test('function cursor gets items and the stored cursor and decides both outputs', async () => {
		const cursorFn = vi.fn(async (items, cursor) => ({
			items: items.slice(0, 1),
			cursor: { count: ((cursor?.count as number | undefined) ?? 0) + items.length },
		}));
		const { run, staticData } = setup({ ...idTrigger, cursor: cursorFn });

		respond([{ id: 1 }]);
		expect(await run()).toBeNull();
		expect(cursorFn).toHaveBeenLastCalledWith([{ json: { id: 1 } }], undefined);

		respond([{ id: 2 }, { id: 3 }]);
		expect(await run()).toEqual([[{ json: { id: 2 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ count: 3 });
	});
});
