import type { PushMessage, UiExtensionPageContext } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import type { ExecutionSummary, INode, ITaskData } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import type { MockInstance } from 'vitest';
import { computed, effectScope, ref, shallowRef, type ShallowRef } from 'vue';

import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

import { useUiExtensionPanelData } from './useUiExtensionPanelData';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest: vi.fn(),
}));

const SLACK = 'n8n-nodes-base.slack';

const slackType = mockNodeTypeDescription({
	name: SLACK,
	displayName: 'Slack',
	credentials: [{ name: 'slackApi', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			default: 'message',
			options: [
				{ name: 'Channel', value: 'channel' },
				{ name: 'Message', value: 'message' },
			],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			default: 'get',
			displayOptions: { show: { resource: ['channel'] } },
			options: [{ name: 'Archive', value: 'post' }],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			default: 'post',
			displayOptions: { show: { resource: ['message'] } },
			options: [{ name: 'Send', value: 'post' }],
		},
		{
			displayName: 'Send Message To',
			name: 'channelId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
		},
	],
});

const slackNode = (extra: Partial<INode> = {}) =>
	createTestNode({
		name: 'Notify sales',
		type: SLACK,
		parameters: {
			resource: 'message',
			operation: 'post',
			channelId: {
				__rl: true,
				mode: 'list',
				value: 'C123',
				cachedResultName: '#qa-alerts',
				cachedResultUrl: 'https://example.slack.com/archives/C123',
			},
			text: 'hi',
		},
		credentials: { slackApi: { id: 'c1', name: 'Sales Slack' } },
		...extra,
	});

const summary = (id: string, extra: Partial<ExecutionSummary> = {}) =>
	({
		id,
		workflowId: 'wf-1',
		workflowName: 'Lead routing',
		status: 'success',
		mode: 'manual',
		createdAt: '2026-11-16T11:00:00.000Z',
		startedAt: '2026-11-16T11:00:00.000Z',
		stoppedAt: '2026-11-16T11:00:02.000Z',
		...extra,
	}) as unknown as ExecutionSummary;

const task = (extra: Partial<ITaskData> = {}): ITaskData => ({
	startTime: Date.parse('2026-11-16T11:00:01.000Z'),
	executionTime: 500,
	executionIndex: 1,
	source: [],
	executionStatus: 'success',
	data: { main: [[{ json: { ts: '1', text: 'hello from qa' } }, { json: { ts: '2' } }]] },
	...extra,
});

const execution = (
	id: string,
	runData: Record<string, ITaskData[]>,
	extra: Partial<IExecutionResponse> = {},
) =>
	({
		id,
		status: 'success',
		data: { resultData: { runData } },
		...extra,
	}) as unknown as IExecutionResponse;

describe(useUiExtensionPanelData, () => {
	let documentStore: ShallowRef<WorkflowDocumentStore | null>;
	let context: ReturnType<typeof ref<UiExtensionPageContext>>;
	let fetchExecution: MockInstance<ReturnType<typeof useWorkflowsStore>['fetchExecutionDataById']>;
	let pushHandler: ((message: PushMessage) => void) | undefined;
	let scope: ReturnType<typeof effectScope>;

	const workflowPage = (): UiExtensionPageContext => ({
		page: 'workflow',
		routeName: 'NodeViewExisting',
		workflow: {
			id: 'wf-1',
			name: 'Lead routing',
			active: false,
			nodes: (documentStore.value?.allNodes ?? []).map((node) => ({
				name: node.name,
				type: node.type,
				isService: node.type === SLACK,
			})),
		},
	});

	const listPage: UiExtensionPageContext = {
		page: 'workflows',
		routeName: 'WorkflowsView',
		projectId: null,
		totalWorkflows: 2,
	};

	function setup(page: UiExtensionPageContext, enabled = true) {
		context = ref(page);
		const isEnabled = ref(enabled);
		scope = effectScope();
		const result = scope.run(() =>
			useUiExtensionPanelData(
				computed(() => context.value!),
				documentStore,
				isEnabled,
			),
		)!;
		return { ...result, isEnabled };
	}

	function respondRuns(...results: ExecutionSummary[][]) {
		for (const runs of results) {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ results: runs });
		}
	}

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.mocked(makeRestApiRequest).mockReset();
		useNodeTypesStore().setNodeTypes([slackType]);
		const store = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
		store.setNodes([
			createTestNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }),
			slackNode(),
		]);
		documentStore = shallowRef(store);
		fetchExecution = vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById');
		pushHandler = undefined;
		vi.spyOn(usePushConnectionStore(), 'addEventListener').mockImplementation((handler) => {
			pushHandler = handler;
			return () => {
				pushHandler = undefined;
			};
		});
	});

	afterEach(() => scope?.stop());

	it('builds the runs, the last failure and the service cards of the open workflow', async () => {
		respondRuns([
			summary('3', { status: 'running', stoppedAt: undefined }),
			summary('2', { status: 'error' }),
			summary('1'),
		]);
		const failedTask = task({
			executionStatus: 'error',
			error: { message: 'channel_not_found' } as ITaskData['error'],
			data: undefined,
		});
		fetchExecution.mockResolvedValue(
			execution('2', {}, {
				status: 'error',
				data: {
					resultData: {
						runData: { 'Notify sales': [failedTask] },
						error: { message: 'channel_not_found', node: { name: 'Notify sales' } },
						lastNodeExecuted: 'Notify sales',
					},
				},
			} as unknown as Partial<IExecutionResponse>),
		);

		const { panelData } = setup(workflowPage());
		expect(panelData.value.state).toBe('loading');
		await flushPromises();

		expect(makeRestApiRequest).toHaveBeenCalledWith(expect.anything(), 'GET', '/executions', {
			filter: { workflowId: 'wf-1' },
			limit: 10,
		});
		// The newest run that has finished.
		expect(fetchExecution).toHaveBeenCalledWith('2');
		expect(panelData.value).toEqual({
			state: 'ready',
			runs: {
				scope: 'workflow',
				items: [
					{
						id: '3',
						workflowId: 'wf-1',
						workflowName: 'Lead routing',
						status: 'running',
						mode: 'manual',
						startedAt: '2026-11-16T11:00:00.000Z',
						stoppedAt: null,
					},
					expect.objectContaining({ id: '2', status: 'error' }),
					expect.objectContaining({ id: '1', stoppedAt: '2026-11-16T11:00:02.000Z' }),
				],
				lastError: { nodeName: 'Notify sales', message: 'channel_not_found' },
			},
			services: [
				{
					nodeName: 'Notify sales',
					nodeType: SLACK,
					displayName: 'Slack',
					resource: 'Message',
					operation: 'Send',
					targets: [
						{
							label: 'Send Message To',
							name: '#qa-alerts',
							url: 'https://example.slack.com/archives/C123',
						},
					],
					credentialName: 'Sales Slack',
					lastRun: {
						executionId: '2',
						status: 'error',
						finishedAt: '2026-11-16T11:00:01.500Z',
						itemCount: 0,
						items: [],
						error: 'channel_not_found',
					},
				},
			],
		});
	});

	it('takes the first items of a node, with flat values, cut values and no binary data', async () => {
		const long = 'x'.repeat(250);
		const items = [
			{
				json: { text: long, nested: { a: 1 }, count: 3, empty: null },
				binary: { file: { data: 'BINARY', mimeType: 'text/plain' } },
			},
			{ json: { n: 2 } },
			{ json: { n: 3 } },
			{ json: { n: 4 } },
		];
		respondRuns([summary('1')]);
		fetchExecution.mockResolvedValue(
			execution('1', { 'Notify sales': [task(), task({ data: { main: [items] } as never })] }),
		);

		const { panelData } = setup(workflowPage());
		await flushPromises();

		const lastRun = panelData.value.services?.[0].lastRun;
		expect(lastRun?.itemCount).toBe(4);
		expect(lastRun?.items).toHaveLength(3);
		expect(lastRun?.items[0]).toEqual({
			text: `${'x'.repeat(199)}…`,
			nested: '{"a":1}',
			count: '3',
			empty: 'null',
		});
		expect(JSON.stringify(lastRun)).not.toContain('BINARY');
	});

	it('keeps at most 20 keys of an item', async () => {
		const json = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`k${i}`, i]));
		respondRuns([summary('1')]);
		fetchExecution.mockResolvedValue(
			execution('1', { 'Notify sales': [task({ data: { main: [[{ json }]] } })] }),
		);

		const { panelData } = setup(workflowPage());
		await flushPromises();

		expect(Object.keys(panelData.value.services?.[0].lastRun?.items[0] ?? {})).toHaveLength(20);
	});

	it('gives no link for a stored URL that is not http(s), and skips expressions', async () => {
		documentStore.value?.setNodes([
			slackNode({
				parameters: {
					channelId: {
						__rl: true,
						mode: 'list',
						value: 'C123',
						cachedResultName: '#qa-alerts',
						cachedResultUrl: 'javascript:alert(1)',
					},
					user: { __rl: true, mode: 'id', value: '={{ $json.user }}' },
				},
			}),
		]);
		respondRuns([]);

		const { panelData } = setup(workflowPage());
		await flushPromises();

		expect(panelData.value.services?.[0].targets).toEqual([
			{ label: 'Send Message To', name: '#qa-alerts' },
		]);
		expect(panelData.value.services?.[0].lastRun).toBeNull();
		expect(fetchExecution).not.toHaveBeenCalled();
	});

	it('shows the runs of all workflows on the workflows list, with no services', async () => {
		respondRuns([summary('9', { workflowId: 'wf-2', workflowName: 'Invoices' })]);

		const { panelData } = setup(listPage);
		await flushPromises();

		expect(makeRestApiRequest).toHaveBeenCalledWith(expect.anything(), 'GET', '/executions', {
			filter: {},
			limit: 10,
		});
		expect(fetchExecution).not.toHaveBeenCalled();
		expect(panelData.value).toEqual({
			state: 'ready',
			runs: {
				scope: 'all',
				items: [expect.objectContaining({ id: '9', workflowName: 'Invoices' })],
			},
			services: null,
		});
	});

	it('fetches nothing on other pages', async () => {
		const { panelData } = setup({ page: 'other', routeName: 'SettingsPersonalView' });
		await flushPromises();

		expect(makeRestApiRequest).not.toHaveBeenCalled();
		expect(panelData.value).toEqual({ state: 'ready', runs: null, services: null });
	});

	it('fetches nothing while it is not enabled, and fetches once it is', async () => {
		respondRuns([summary('1')]);
		const { isEnabled } = setup(listPage, false);
		await flushPromises();
		expect(makeRestApiRequest).not.toHaveBeenCalled();

		isEnabled.value = true;
		await flushPromises();

		expect(makeRestApiRequest).toHaveBeenCalledOnce();
	});

	it('shows an error when a call fails, and recovers on refresh', async () => {
		vi.mocked(makeRestApiRequest).mockRejectedValueOnce(new Error('offline'));
		const { panelData, refresh } = setup(listPage);
		await flushPromises();
		expect(panelData.value).toEqual({ state: 'error', runs: null, services: null });

		respondRuns([summary('1')]);
		await refresh();

		expect(panelData.value.state).toBe('ready');
		expect(panelData.value.runs?.items).toHaveLength(1);
	});

	it('merges calls that overlap into one more fetch', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		vi.mocked(makeRestApiRequest).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveFirst = resolve;
			}),
		);
		const { refresh } = setup(listPage);
		void refresh();
		void refresh();
		void refresh();
		respondRuns([summary('2')]);

		resolveFirst({ results: [summary('1')] });
		await flushPromises();

		expect(makeRestApiRequest).toHaveBeenCalledTimes(2);
	});

	it('drops a response for a page that is no longer open', async () => {
		let resolveList: (value: unknown) => void = () => {};
		vi.mocked(makeRestApiRequest).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveList = resolve;
			}),
		);
		const { panelData } = setup(listPage);
		respondRuns([]);

		context.value = workflowPage();
		resolveList({ results: [summary('9', { workflowName: 'Invoices' })] });
		await flushPromises();

		expect(panelData.value.runs).toEqual({ scope: 'workflow', items: [] });
	});

	it('fetches again when a run of the open workflow finishes', async () => {
		respondRuns([], [summary('1')]);
		fetchExecution.mockResolvedValue(execution('1', { 'Notify sales': [task()] }));
		const { panelData } = setup(workflowPage());
		await flushPromises();
		expect(panelData.value.runs?.items).toEqual([]);

		pushHandler?.({
			type: 'executionFinished',
			data: { executionId: '1', workflowId: 'other', status: 'success' },
		});
		await flushPromises();
		expect(makeRestApiRequest).toHaveBeenCalledOnce();

		pushHandler?.({
			type: 'executionFinished',
			data: { executionId: '1', workflowId: 'wf-1', status: 'success' },
		});
		await flushPromises();

		expect(makeRestApiRequest).toHaveBeenCalledTimes(2);
		expect(panelData.value.runs?.items).toHaveLength(1);
		expect(panelData.value.services?.[0].lastRun?.executionId).toBe('1');
	});

	it('stops listening for runs when its scope ends', () => {
		setup(listPage);
		expect(pushHandler).toBeDefined();

		scope.stop();

		expect(pushHandler).toBeUndefined();
	});
});
