import type {
	IDataObject,
	IDeclarativePollingTrigger,
	IHttpRequestOptions,
	INode,
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
	const workflow = new Workflow({ id: 'w1', nodes: [node], connections: {}, active: true, nodeTypes });
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

	test('manual run returns the last item and leaves the cursor alone', async () => {
		const { run, staticData } = setup(idTrigger, 'manual');
		respond([{ id: 1 }, { id: 2 }]);

		expect(await run()).toEqual([[{ json: { id: 2 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toBeUndefined();
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
