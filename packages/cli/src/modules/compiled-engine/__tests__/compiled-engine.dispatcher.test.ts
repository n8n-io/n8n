import type { Logger } from '@n8n/backend-common';
import type { BinaryDataConfig, BinaryDataService, StorageConfig } from 'n8n-core';
import type {
	IConnections,
	INode,
	IRun,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import type { NodeTypes } from '@/node-types';

import type { CompiledEngineSync, LoadedWorkflow } from '../compiled-engine-sync.service';
import type { RunHooks } from '../compiled-engine.dispatcher';
import {
	CompiledEngineDispatcher,
	effectSeqOf,
	findTriggerNode,
	toResumeValue,
} from '../compiled-engine.dispatcher';
import type { CompiledArtifact, WfrtEvent } from '../compiled-engine.types';
import type { CompiledExecutionStore } from '../compiled-execution.store';
import type { WfrtAdminClient } from '../wfrt-admin.client';

const node = (name: string, type: string): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const connections: IConnections = {
	Webhook: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
	IF: { main: [[{ node: 'Set', type: 'main', index: 0 }], []] },
	Set: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
	'HTTP Request': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
};

const workflowData: IWorkflowBase = {
	id: 'wf1',
	name: 'Demo',
	active: false,
	isArchived: false,
	activeVersionId: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	nodes: [
		node('Webhook', 'n8n-nodes-base.webhook'),
		node('IF', 'n8n-nodes-base.if'),
		node('Set', 'n8n-nodes-base.set'),
		node('HTTP Request', 'n8n-nodes-base.httpRequest'),
		node('Respond', 'n8n-nodes-base.respondToWebhook'),
	],
	connections,
	settings: { engineType: 'compiled' },
	versionId: 'v1',
};

const artifact: CompiledArtifact = {
	key: 'hash1',
	workflowId: 'wf1',
	versionId: 'v1',
	ok: true,
	diagnostics: [],
	nodes: {},
	module: Buffer.from('wfm'),
	slots: [],
	triggers: [{ kind: 'webhook', path: 'demo' }],
	compiledAt: '2026-11-12T00:00:00.000Z',
};

type HookCall = { name: string; args: unknown[] };

class TestDispatcher extends CompiledEngineDispatcher {
	readonly calls: HookCall[] = [];

	protected createHooks(): RunHooks {
		const calls = this.calls;
		return {
			async runHook(name: string, args: unknown[]) {
				calls.push({ name, args });
			},
		} as RunHooks;
	}
}

function setup() {
	const activeExecutions = mock<ActiveExecutions>();
	let nextId = 100;
	activeExecutions.add.mockImplementation(async () => String(nextId++));
	const sync = mock<CompiledEngineSync>();
	const loadedManual: LoadedWorkflow = {
		wfrtId: 'wf1~manual',
		workflowData,
		artifact,
		active: false,
	};
	sync.prepareManualRun.mockResolvedValue(loadedManual);
	sync.findLoaded.mockImplementation((id) =>
		id === 'wf1' ? { ...loadedManual, wfrtId: 'wf1', active: true } : undefined,
	);
	sync.resumeUrlBases.mockReturnValue({
		resumeUrlBase: 'http://localhost:5678/webhook-waiting',
		resumeFormUrlBase: 'http://localhost:5678/form-waiting',
	});
	const client = mock<WfrtAdminClient>();
	const nodeTypes = mock<NodeTypes>();
	const checker = mock<CredentialsPermissionChecker>();
	checker.check.mockResolvedValue({ personalCredentialsCount: 0 });
	const storageConfig = mock<StorageConfig>({ modeTag: 'db' });
	const store = mock<CompiledExecutionStore>();
	store.readMapping.mockImplementation(async (id) => ({ wfrtId: id }));
	store.findExecutionId.mockImplementation(async (id) => (/^\d+$/.test(id) ? id : undefined));
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const binaryDataService = mock<BinaryDataService>();
	const binaryDataConfig = mock<BinaryDataConfig>({ mode: 'filesystem' });
	const dispatcher = new TestDispatcher(
		activeExecutions,
		sync,
		client,
		nodeTypes,
		checker,
		storageConfig,
		store,
		logger,
		binaryDataService,
		binaryDataConfig,
	);
	return { dispatcher, activeExecutions, sync, client, store, binaryDataService };
}

const hookNames = (calls: HookCall[]) =>
	calls.map((c) => (c.name.startsWith('node') ? `${c.name}:${String(c.args[0])}` : c.name));

const demoEvents = (executionId: string): WfrtEvent[] => [
	{
		type: 'started',
		executionId,
		workflowId: 'wf1~manual',
		versionId: 'hash1',
		mode: 'manual',
		at: 1,
	},
	{ type: 'trace', executionId, step: 'IF', items: [[{ body: { amount: 20 } }], []], at: 2 },
	{ type: 'trace', executionId, step: 'Set', items: [{ big: true }], at: 3 },
	{ type: 'step', executionId, step: 'HTTP Request', status: 'started', at: 4 },
	{
		type: 'step',
		executionId,
		step: 'HTTP Request',
		status: 'completed',
		result: [{ echo: { big: true } }],
		at: 5,
	},
	{
		type: 'step',
		executionId,
		step: 'Respond',
		status: 'started',
		args: { name: 'Respond', body: { done: true }, status: 201 },
		at: 6,
	},
	{ type: 'step', executionId, step: 'Respond', status: 'completed', result: null, at: 7 },
	{ type: 'finished', executionId, status: 'ok', at: 8 },
];

describe('CompiledEngineDispatcher', () => {
	it('turns the events of a manual run into lifecycle hooks and run data', async () => {
		const { dispatcher, activeExecutions, client } = setup();
		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData,
			pushRef: 'push-1',
			userId: 'user-1',
		};

		const executionId = await dispatcher.runManual(data);
		expect(executionId).toBe('100');

		for (const event of demoEvents(executionId)) dispatcher.handleEvent(event);
		await dispatcher.drain();

		expect(client.startExecution).toHaveBeenCalledWith({
			workflowId: 'wf1~manual',
			versionId: 'hash1',
			executionId: '100',
			trigger: {
				method: 'POST',
				path: '',
				headers: {},
				params: {},
				query: {},
				body: null,
			},
			trace: true,
		});
		expect(hookNames(dispatcher.calls)).toEqual([
			'workflowExecuteBefore',
			'nodeExecuteBefore:Webhook',
			'nodeExecuteAfter:Webhook',
			'nodeExecuteBefore:IF',
			'nodeExecuteAfter:IF',
			'nodeExecuteBefore:Set',
			'nodeExecuteAfter:Set',
			'nodeExecuteBefore:HTTP Request',
			'nodeExecuteAfter:HTTP Request',
			'nodeExecuteBefore:Respond',
			'nodeExecuteAfter:Respond',
			'workflowExecuteAfter',
		]);

		const run = dispatcher.calls.at(-1)?.args[0] as IRun;
		expect(run.status).toBe('success');
		expect(run.mode).toBe('manual');
		expect(run.data.resultData.lastNodeExecuted).toBe('Respond');
		expect(run.data.resultData.runData['HTTP Request'][0].data?.main[0]).toEqual([
			{ json: { echo: { big: true } } },
		]);
		expect(run.data.resultData.runData.IF[0].data?.main).toEqual([
			[{ json: { body: { amount: 20 } } }],
			[],
		]);
		expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('100', {
			body: { done: true },
			headers: {},
			statusCode: 201,
		});
		expect(activeExecutions.finalizeExecution).toHaveBeenCalledWith('100', run);
	});

	it('passes the request of a test webhook as the trigger value', async () => {
		const { dispatcher, client } = setup();
		const webhookNode = workflowData.nodes[0];
		await dispatcher.runManual({
			executionMode: 'manual',
			workflowData,
			executionData: createRunExecutionData({
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: webhookNode,
							data: {
								main: [
									[
										{
											json: {
												headers: { h: '1' },
												params: {},
												query: { q: '2' },
												body: { amount: 5 },
											},
										},
									],
								],
							},
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			}),
		});
		await dispatcher.drain();
		expect(client.startExecution).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: expect.objectContaining({
					body: { amount: 5 },
					headers: { h: '1' },
					query: { q: '2' },
					params: {},
				}),
			}),
		);
	});

	it('creates the execution of a trigger run from the started event, once', async () => {
		const { dispatcher, activeExecutions, store } = setup();
		const events: WfrtEvent[] = [
			{
				type: 'started',
				executionId: 'w-9',
				workflowId: 'wf1',
				versionId: 'hash1',
				mode: 'trigger',
				trigger: { body: { amount: 1 }, headers: {}, query: {} },
				at: 10,
			},
			{
				type: 'trace',
				executionId: 'w-9',
				step: 'IF',
				items: [[], [{ body: { amount: 1 } }]],
				at: 11,
			},
			{ type: 'finished', executionId: 'w-9', status: 'ok', at: 12 },
			// A repeated `finished` after a crash of wfrt changes nothing.
			{ type: 'finished', executionId: 'w-9', status: 'ok', at: 13 },
		];
		for (const event of events) dispatcher.handleEvent(event);
		await dispatcher.drain();
		dispatcher.handleEvent(events[0]);
		await dispatcher.drain();

		expect(activeExecutions.add).toHaveBeenCalledTimes(1);
		expect(activeExecutions.add.mock.calls[0][0].executionMode).toBe('webhook');
		expect(store.saveMapping).toHaveBeenCalledWith('100', { compiledEngineExecutionId: 'w-9' });
		const afters = dispatcher.calls.filter((c) => c.name === 'workflowExecuteAfter');
		expect(afters).toHaveLength(1);
		const run = afters[0].args[0] as IRun;
		expect(run.mode).toBe('webhook');
		expect(Object.keys(run.data.resultData.runData)).toEqual(['Webhook', 'IF']);
	});

	it('moves the binary data of a trigger run to the n8n execution id before the save', async () => {
		const { dispatcher, binaryDataService } = setup();
		const stored = 'filesystem-v2:workflows/wf1/executions/wfrt-w-9/binary_data/f1';
		const events: WfrtEvent[] = [
			{
				type: 'started',
				executionId: 'w-9',
				workflowId: 'wf1',
				versionId: 'hash1',
				mode: 'trigger',
				trigger: { body: {}, headers: {}, query: {} },
				at: 10,
			},
			{
				type: 'trace',
				executionId: 'w-9',
				step: 'IF',
				items: [
					[],
					[{ a: 1, $binary: { data: { id: stored, data: 'eA==', mimeType: 'text/plain' } } }],
				],
				at: 11,
			},
			{ type: 'finished', executionId: 'w-9', status: 'ok', at: 12 },
		];
		for (const event of events) dispatcher.handleEvent(event);
		await dispatcher.drain();

		expect(binaryDataService.rename).toHaveBeenCalledWith(
			'workflows/wf1/executions/wfrt-w-9/binary_data/f1',
			'workflows/wf1/executions/100/binary_data/f1',
		);
		expect(binaryDataService.deleteMany).toHaveBeenCalledWith([
			{ type: 'execution', workflowId: 'wf1', executionId: 'wfrt-w-9' },
		]);
		const after = dispatcher.calls.find((c) => c.name === 'workflowExecuteAfter');
		const run = after?.args[0] as IRun;
		const item = run.data.resultData.runData.IF[0].data?.main[1]?.[0];
		expect(item?.binary?.data).toMatchObject({
			id: 'filesystem-v2:workflows/wf1/executions/100/binary_data/f1',
			data: 'filesystem-v2',
		});
	});

	it('marks a run that fails in wfrt as an error', async () => {
		const { dispatcher } = setup();
		const executionId = await dispatcher.runManual({ executionMode: 'manual', workflowData });
		dispatcher.handleEvent({
			type: 'step',
			executionId,
			step: 'HTTP Request',
			status: 'started',
			at: 1,
		});
		dispatcher.handleEvent({
			type: 'step',
			executionId,
			step: 'HTTP Request',
			status: 'failed',
			error: 'The remote answered 500',
			at: 2,
		});
		dispatcher.handleEvent({ type: 'finished', executionId, status: 'error', at: 3 });
		await dispatcher.drain();

		const run = dispatcher.calls.at(-1)?.args[0] as IRun;
		expect(run.status).toBe('error');
		expect(run.data.resultData.error?.message).toBe('The remote answered 500');
	});

	it('saves a waiting approval and resumes it in wfrt', async () => {
		const { dispatcher, activeExecutions, client } = setup();
		const executionId = await dispatcher.runManual({ executionMode: 'manual', workflowData });
		dispatcher.handleEvent({
			type: 'waiting',
			executionId,
			step: 'Respond',
			resumeUrl: '/resume/100/3?signature=abc',
			signature: 'abc',
			at: 5,
		});
		await dispatcher.drain();

		const run = dispatcher.calls.at(-1)?.args[0] as IRun;
		expect(run.status).toBe('waiting');
		expect(run.waitTill?.getFullYear()).toBe(3000);

		await dispatcher.resume(executionId, { approved: true });
		expect(activeExecutions.add).toHaveBeenLastCalledWith(expect.anything(), {
			executionId,
			expectedStatus: 'waiting',
		});
		expect(client.resume).toHaveBeenCalledWith(executionId, '3', 'abc', { approved: true });
		expect(run.data.resumeToken).toBe('abc');
		await expect(dispatcher.resume(executionId, {})).rejects.toThrow('is not waiting');
	});

	it('resumes an approval with the output of the waiting node webhook that n8n ran', async () => {
		const { dispatcher, client } = setup();
		const executionId = await dispatcher.runManual({ executionMode: 'manual', workflowData });
		dispatcher.handleEvent({
			type: 'step',
			executionId,
			step: 'Set',
			status: 'started',
			at: 2,
		});
		dispatcher.handleEvent({
			type: 'step',
			executionId,
			step: 'Set',
			status: 'completed',
			result: [{ x: 1 }],
			at: 3,
		});
		dispatcher.handleEvent({
			type: 'waiting',
			executionId,
			step: 'HTTP Request',
			resumeUrl: '/resume/100/4',
			signature: 'sig4',
			at: 4,
		});
		await dispatcher.drain();

		const saved = (dispatcher.calls.at(-1)?.args[0] as IRun).data;
		const head = saved.executionData?.nodeExecutionStack[0];
		expect(head?.node.name).toBe('HTTP Request');
		expect(head?.data.main[0]).toEqual([{ json: { x: 1 } }]);

		const node = workflowData.nodes[3];
		await dispatcher.resumeFromN8n(executionId, {
			executionMode: 'manual',
			workflowData,
			executionData: {
				...saved,
				executionData: {
					...saved.executionData!,
					nodeExecutionStack: [
						{ node, data: { main: [[{ json: { body: { answer: 42 } } }]] }, source: null },
					],
				},
			},
		});
		expect(client.resume).toHaveBeenCalledWith(executionId, '4', 'sig4', { body: { answer: 42 } });
	});

	it('only follows a timed wait that the wait tracker resumes', async () => {
		const { dispatcher, client } = setup();
		const executionId = await dispatcher.runManual({ executionMode: 'manual', workflowData });
		dispatcher.handleEvent({ type: 'waiting', executionId, step: 'Set', waitTill: 5000, at: 5 });
		await dispatcher.drain();
		await dispatcher.resumeFromN8n(executionId, { executionMode: 'manual', workflowData });
		expect(client.resume).not.toHaveBeenCalled();
	});

	it('maps a timed wait to waitTill and claims the row on the next event', async () => {
		const { dispatcher, activeExecutions } = setup();
		const executionId = await dispatcher.runManual({ executionMode: 'manual', workflowData });
		dispatcher.handleEvent({ type: 'waiting', executionId, step: 'Set', waitTill: 5000, at: 5 });
		await dispatcher.drain();
		const waiting = dispatcher.calls.at(-1)?.args[0] as IRun;
		expect(waiting.waitTill).toEqual(new Date(5000));

		dispatcher.handleEvent({ type: 'finished', executionId, status: 'ok', at: 6 });
		await dispatcher.drain();
		expect(activeExecutions.add).toHaveBeenLastCalledWith(expect.anything(), {
			executionId,
			expectedStatus: 'waiting',
		});
		expect((dispatcher.calls.at(-1)?.args[0] as IRun).status).toBe('success');
	});

	it('stops an execution in wfrt and maps cancelled to canceled', async () => {
		const { dispatcher, client, store } = setup();
		const executionId = await dispatcher.runManual({ executionMode: 'manual', workflowData });
		await dispatcher.drain();
		client.cancelExecution.mockImplementation(async () => {
			dispatcher.handleEvent({ type: 'finished', executionId, status: 'cancelled', at: 9 });
			return true;
		});
		store.findExecution.mockResolvedValue(undefined);
		const result = await dispatcher.stop(executionId);
		expect(client.cancelExecution).toHaveBeenCalledWith(executionId);
		expect(result?.status).toBe('canceled');
		expect((dispatcher.calls.at(-1)?.args[0] as IRun).status).toBe('canceled');
	});

	it('returns undefined from stop when wfrt does not know the execution', async () => {
		const { dispatcher, client } = setup();
		client.cancelExecution.mockResolvedValue(false);
		expect(await dispatcher.stop('55')).toBeUndefined();
	});

	it('adopts a waiting execution from its row after a restart', async () => {
		const { dispatcher, store, client } = setup();
		store.readMapping.mockResolvedValue({ wfrtId: 'wfrt-4', effectSeq: '2' });
		store.findExecutionId.mockResolvedValue('77');
		store.findExecution.mockResolvedValue({
			id: '77',
			mode: 'webhook',
			status: 'waiting',
			startedAt: new Date(1),
			workflowData,
			data: {
				startData: {},
				resultData: { runData: {}, lastNodeExecuted: 'Set' },
				executionData: null,
				resumeToken: 'stored',
			},
		} as never);
		await dispatcher.resume('77', { approved: true });
		expect(client.resume).toHaveBeenCalledWith('wfrt-4', '2', 'stored', { approved: true });

		dispatcher.handleEvent({ type: 'finished', executionId: 'wfrt-4', status: 'ok', at: 3 });
		await dispatcher.drain();
		const run = dispatcher.calls.at(-1)?.args[0] as IRun;
		expect(run.status).toBe('success');
		expect(run.mode).toBe('webhook');
	});

	it('marks running rows as crashed when wfrt has no live execution', async () => {
		const { dispatcher, store } = setup();
		store.findInProgressIds.mockResolvedValue(['10', '11']);
		store.findExecution.mockImplementation(
			async (id) =>
				({
					id,
					mode: 'webhook',
					status: 'running',
					workflowData: { ...workflowData, id: id === '10' ? 'wf1' : 'wf2' },
				}) as never,
		);
		await dispatcher.reconcile([
			{ workflowId: 'wf1', versionId: 'h', active: true, executions: 0 },
			{ workflowId: 'wf2', versionId: 'h', active: true, executions: 1 },
		]);
		expect(store.markAsCrashed).toHaveBeenCalledWith(['10']);
	});

	it('logs dropped events', () => {
		const { dispatcher } = setup();
		expect(() => dispatcher.handleEvent({ type: 'dropped', count: 3, at: 1 })).not.toThrow();
	});

	it('fails the execution when wfrt refuses the start', async () => {
		const { dispatcher, client } = setup();
		client.startExecution.mockRejectedValue(new Error('wfrt is down'));
		await dispatcher.runManual({ executionMode: 'manual', workflowData });
		await dispatcher.drain();
		const run = dispatcher.calls.at(-1)?.args[0] as IRun;
		expect(run.status).toBe('error');
		expect(run.data.resultData.error?.message).toBe('wfrt is down');
	});
});

describe('helpers', () => {
	it('finds the trigger node that the converter keeps', () => {
		expect(findTriggerNode(workflowData)?.name).toBe('Webhook');
	});

	it('builds the resume value of a send-and-wait node', () => {
		expect(toResumeValue({ json: { data: { approved: true } } })).toEqual({
			approved: true,
			data: { approved: true },
		});
		expect(toResumeValue({ json: { field: 'a' } })).toEqual({ field: 'a' });
	});

	it('reads the effect number of a resume URL', () => {
		expect(effectSeqOf('/resume/12/4')).toBe('4');
		expect(effectSeqOf('http://127.0.0.1:5690/resume/12/4?x=1')).toBe('4');
	});
});
