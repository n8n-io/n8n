import type {
	ICredentialsHelper,
	IExecutionContext,
	IDataObject,
	IDeclarativePollingTrigger,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createDeclarativePoll, DECLARATIVE_CURSOR_KEY } from '../declarative-poll';
import { PollContext } from '../node-execution-context';

const httpRequest = vi.fn<(options: IHttpRequestOptions) => Promise<unknown>>();
const httpRequestWithAuthentication = async function (
	this: IExecuteSingleFunctions,
	credentialType: string,
	options: IHttpRequestOptions,
) {
	await this.getCredentials(credentialType);
	return await httpRequest(options);
};

vi.mock('../node-execution-context/utils/request-helper-functions', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getRequestHelperFunctions: () => ({ httpRequest, httpRequestWithAuthentication }),
}));

/** The position of the options argument of `ICredentialsHelper.getDecrypted`. */
const CREDENTIAL_OPTIONS_ARG = 7;

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

function setup(
	trigger: IDeclarativePollingTrigger,
	mode: WorkflowExecuteMode = 'trigger',
	nodeOverrides: Partial<INode> = {},
) {
	const nodeType = makeNodeType(trigger);
	const node: INode = {
		id: 'n1',
		name: 'Poll',
		type: 'testPoll',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...nodeOverrides,
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
	const warn = vi.spyOn(context.logger, 'warn');
	const poll = createDeclarativePoll(nodeType, trigger);
	const staticData = () => workflow.getStaticData('node', node);
	return { run: async () => await poll.call(context), staticData, warn };
}

const respond = (items: IDataObject[]) =>
	httpRequest.mockResolvedValueOnce({ body: { items }, headers: {}, statusCode: 200 });

beforeEach(() => httpRequest.mockReset());

describe('createDeclarativePoll', () => {
	test.each<WorkflowExecuteMode>(['trigger', 'manual'])(
		'loads credentials as a trigger in %s mode',
		async (mode) => {
			const nodeType = makeNodeType(idTrigger);
			nodeType.description.credentials = [{ name: 'testApi', required: true }];
			const node: INode = {
				id: 'n1',
				name: 'Poll',
				type: 'testPoll',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { testApi: { id: 'c1', name: 'Test' } },
			};
			const workflow = new Workflow({
				id: 'w1',
				nodes: [node],
				connections: {},
				active: true,
				nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => nodeType }),
			});
			const credentialsHelper = mock<ICredentialsHelper>();
			credentialsHelper.getDecrypted.mockResolvedValue({ apiKey: 'k' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);
			const context = new PollContext(
				workflow,
				node,
				mock<IWorkflowExecuteAdditionalData>({
					executionId: 'e1',
					webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
					formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
					credentialsHelper,
				}),
				mode,
				'init',
			);
			respond([{ id: 1 }]);

			await createDeclarativePoll(nodeType, idTrigger).call(context);

			expect(credentialsHelper.getDecrypted).toHaveBeenCalled();
			for (const call of credentialsHelper.getDecrypted.mock.calls) {
				expect(call[CREDENTIAL_OPTIONS_ARG]).toEqual({ credentialUsage: 'trigger' });
			}
		},
	);

	test('loads credentials with the execution context of the poll', async () => {
		const nodeType = makeNodeType(idTrigger);
		nodeType.description.credentials = [{ name: 'testApi', required: true }];
		const node: INode = {
			id: 'n1',
			name: 'Poll',
			type: 'testPoll',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { testApi: { id: 'c1', name: 'Test' } },
		};
		const workflow = new Workflow({
			id: 'w1',
			nodes: [node],
			connections: {},
			active: true,
			nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => nodeType }),
		});
		const executionContext: IExecutionContext = {
			version: 1,
			establishedAt: 1,
			source: 'manual',
			credentials: 'sealed-credential-context',
		};
		const contextsAtLoad: unknown[] = [];
		const credentialsHelper = mock<ICredentialsHelper>();
		credentialsHelper.getDecrypted.mockImplementation(async (additionalData) => {
			contextsAtLoad.push(additionalData.executionContext);
			return { apiKey: 'k' };
		});
		credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			executionId: 'e1',
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			credentialsHelper,
		});
		additionalData.executionContext = executionContext;
		const context = new PollContext(workflow, node, additionalData, 'manual', 'init');
		respond([{ id: 1 }]);

		await createDeclarativePoll(nodeType, idTrigger).call(context);

		expect(contextsAtLoad.length).toBeGreaterThan(0);
		for (const contextAtLoad of contextsAtLoad) expect(contextAtLoad).toBe(executionContext);
		expect(additionalData.executionContext).toBe(executionContext);
	});

	test('id cursor: first run seeds and emits nothing, later runs emit only newer items', async () => {
		const { run, staticData } = setup(idTrigger);

		respond([{ id: 1 }, { id: 2 }]);
		expect(await run()).toBeNull();
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 2 });

		respond([{ id: 2 }, { id: 4 }, { id: 3 }]);
		expect(await run()).toMatchObject([[{ json: { id: 4 } }, { json: { id: 3 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 4 });
		expect(httpRequest.mock.lastCall?.[0].qs).toEqual({ since: 2 });

		respond([{ id: 4 }]);
		expect(await run()).toBeNull();
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 4 });
	});

	test('id cursor: compares integer strings by value, also above the safe integer range', async () => {
		const { run, staticData } = setup(idTrigger);

		respond([{ id: '9' }]);
		expect(await run()).toBeNull();

		respond([{ id: '10' }, { id: '8' }]);
		expect(await run()).toMatchObject([[{ json: { id: '10' } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: '10' });

		staticData()[DECLARATIVE_CURSOR_KEY] = { value: '9007199254740993' };
		respond([{ id: '9007199254740992' }, { id: '9007199254740994' }]);
		expect(await run()).toMatchObject([[{ json: { id: '9007199254740994' } }]]);
	});

	test('id cursor: compares non-numeric ids as strings', async () => {
		const { run } = setup(idTrigger);

		respond([{ id: 'b' }]);
		expect(await run()).toBeNull();

		respond([{ id: 'a' }, { id: 'c' }]);
		expect(await run()).toMatchObject([[{ json: { id: 'c' } }]]);
	});

	test('id cursor: an empty first poll stores an empty cursor, so the next poll emits', async () => {
		const { run, staticData } = setup(idTrigger);

		respond([]);
		expect(await run()).toBeNull();
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({});

		respond([{ id: 1 }, { name: 'no id' }, { id: null }, { id: '' }]);
		expect(await run()).toMatchObject([[{ json: { id: 1 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 1 });
	});

	test('throws a failed request also when the node continues on error', async () => {
		const { run, staticData } = setup(idTrigger, 'trigger', { onError: 'continueRegularOutput' });
		staticData()[DECLARATIVE_CURSOR_KEY] = { value: 1 };
		httpRequest.mockRejectedValueOnce(new Error('Service unavailable'));

		await expect(run()).rejects.toThrow('Service unavailable');
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 1 });
	});

	test('a stored cursor that is not an object counts as no cursor', async () => {
		const { run, staticData } = setup(idTrigger);
		staticData()[DECLARATIVE_CURSOR_KEY] = 'corrupt';

		respond([{ id: 1 }]);
		expect(await run()).toBeNull();
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: 1 });
	});

	test('fails when not called with a PollContext', async () => {
		const poll = createDeclarativePoll(makeNodeType(idTrigger), idTrigger);

		await expect(poll.call(mock<IPollFunctions>())).rejects.toThrow(/needs a PollContext/);
	});

	test('timestamp cursor: first run seeds with now and makes no request', async () => {
		const { run, staticData } = setup({ ...idTrigger, cursor: { type: 'timestamp', field: 'at' } });
		const before = Date.now();

		expect(await run()).toBeNull();
		expect(httpRequest).not.toHaveBeenCalled();
		const seeded = new Date((staticData()[DECLARATIVE_CURSOR_KEY] as { value: string }).value);
		expect(seeded.getTime()).toBeGreaterThanOrEqual(before);

		respond([{ at: '2000-01-01T00:00:00Z' }, { at: '2999-01-01T00:00:00Z' }]);
		expect(await run()).toMatchObject([[{ json: { at: '2999-01-01T00:00:00Z' } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: '2999-01-01T00:00:00Z' });
	});

	test('timestamp cursor: a value that is not text fails the poll', async () => {
		const { run } = setup({ ...idTrigger, cursor: { type: 'timestamp', field: 'at' } });

		expect(await run()).toBeNull(); // seeds with an ISO "now"

		respond([{ at: 1757238000 }]);
		await expect(run()).rejects.toThrow(
			expect.objectContaining({
				name: 'NodeOperationError',
				message: expect.stringContaining('needs a text date in "at", but it got a number value'),
			}),
		);
	});

	test('timestamp cursor: skips a text date that does not parse and emits the other items', async () => {
		const { run, staticData, warn } = setup({
			...idTrigger,
			cursor: { type: 'timestamp', field: 'at' },
		});

		expect(await run()).toBeNull(); // seeds with an ISO "now"

		respond([{ at: '0000-00-00 00:00:00' }, { at: '2999-01-01T00:00:00Z' }]);
		expect(await run()).toMatchObject([[{ json: { at: '2999-01-01T00:00:00Z' } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: '2999-01-01T00:00:00Z' });
		expect(warn).toHaveBeenCalledWith(
			'Polling trigger "Poll" skipped 1 item(s) with a date in "at" that cannot be read',
			{ workflowId: 'w1' },
		);
		expect(JSON.stringify(warn.mock.calls)).not.toContain('0000-00-00');
	});

	test('timestamp cursor: skips items with an empty field', async () => {
		const { run } = setup({ ...idTrigger, cursor: { type: 'timestamp', field: 'at' } });

		expect(await run()).toBeNull(); // seeds with an ISO "now"

		respond([{ at: '' }, { at: '2999-01-01T00:00:00Z' }]);
		expect(await run()).toMatchObject([[{ json: { at: '2999-01-01T00:00:00Z' } }]]);
	});

	test('manual run returns the last item and leaves the cursor alone', async () => {
		const { run, staticData } = setup(idTrigger, 'manual');
		respond([{ id: 1 }, { id: 2 }]);

		expect(await run()).toMatchObject([[{ json: { id: 2 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toBeUndefined();
	});

	test('manual run with a timestamp cursor sends the request with an empty $cursor', async () => {
		const { run, staticData } = setup(
			{ ...idTrigger, cursor: { type: 'timestamp', field: 'at' } },
			'manual',
		);
		staticData()[DECLARATIVE_CURSOR_KEY] = { value: '2000-01-01T00:00:00Z' };
		respond([{ at: '1990-01-01T00:00:00Z' }]);

		expect(await run()).toMatchObject([[{ json: { at: '1990-01-01T00:00:00Z' } }]]);
		expect(httpRequest.mock.lastCall?.[0].qs).toEqual({});
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ value: '2000-01-01T00:00:00Z' });
	});

	test('manual run shapes items through a function cursor but stores nothing', async () => {
		const cursor = vi.fn(async (items: INodeExecutionData[]) => ({
			items: items.map((item) => ({ json: { ...item.json, shaped: true } })),
			cursor: { value: 99 },
		}));
		const { run, staticData } = setup({ ...idTrigger, cursor }, 'manual');
		respond([{ id: 1 }, { id: 2 }]);

		expect(await run()).toMatchObject([[{ json: { id: 2, shaped: true } }]]);
		expect(cursor).toHaveBeenCalledWith(
			[expect.objectContaining({ json: { id: 1 } }), expect.objectContaining({ json: { id: 2 } })],
			undefined,
		);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toBeUndefined();
	});

	test.each([
		{ maxResults: 0, expected: null },
		{ maxResults: -5, expected: null },
		{ maxResults: 2.7, expected: [[{ json: { id: 2 } }, { json: { id: 3 } }]] },
		{
			maxResults: Infinity,
			expected: [[{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]],
		},
	])('manual run returns the last $maxResults items', async ({ maxResults, expected }) => {
		const { run } = setup({ ...idTrigger, manual: { maxResults } }, 'manual');
		respond([{ id: 1 }, { id: 2 }, { id: 3 }]);

		const result = await run();
		if (expected === null) expect(result).toBeNull();
		else expect(result).toMatchObject(expected);
	});

	test('$cursor resolves in postReceive actions, not only in the request', async () => {
		const { run } = setup({
			...idTrigger,
			routing: {
				request: { url: '/items' },
				output: {
					postReceive: [
						{ type: 'rootProperty', properties: { property: 'items' } },
						// Passes no item if `$cursor` is missing here.
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
		expect(await run()).toMatchObject([[{ json: { id: 3 } }]]);
	});

	test('function cursor gets items and the stored cursor and decides both outputs', async () => {
		const cursorFn = vi.fn(
			async (items: INodeExecutionData[], cursor: IDataObject | undefined) => ({
				items: items.slice(0, 1),
				cursor: { count: ((cursor?.count as number | undefined) ?? 0) + items.length },
			}),
		);
		const { run, staticData } = setup({ ...idTrigger, cursor: cursorFn });

		respond([{ id: 1 }]);
		expect(await run()).toBeNull();
		expect(cursorFn).toHaveBeenLastCalledWith(
			[expect.objectContaining({ json: { id: 1 } })],
			undefined,
		);

		respond([{ id: 2 }, { id: 3 }]);
		expect(await run()).toMatchObject([[{ json: { id: 2 } }]]);
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ count: 3 });
	});

	test('function cursor: an undefined cursor after the first run keeps the stored cursor', async () => {
		const cursorFn = vi.fn(async (items: INodeExecutionData[]) => ({ items, cursor: undefined }));
		const { run, staticData } = setup({ ...idTrigger, cursor: cursorFn });
		staticData()[DECLARATIVE_CURSOR_KEY] = { page: 'abc' };

		respond([{ id: 1 }]);
		expect(await run()).toMatchObject([[{ json: { id: 1 } }]]);
		expect(cursorFn).toHaveBeenLastCalledWith(expect.any(Array), { page: 'abc' });
		expect(staticData()[DECLARATIVE_CURSOR_KEY]).toEqual({ page: 'abc' });
	});
});
