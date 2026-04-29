import type { EvalLogger } from '../../harness/logger';
import { consumeSseStream } from '../../clients/sse-client';
import type { N8nClient } from '../../clients/n8n-client';
import type { CapturedEvent } from '../../types';
import {
	approveEvalConfirmations,
	buildEvalPrompt,
	buildWorkflowCreatePayload,
	extractConfirmationRequestId,
	inferColumnType,
	runEvalSetupTopologyCase,
	startSseConnection,
	waitForThreadToSettle,
} from '../runner';
import type { EvalSetupTopologyCase } from '../types';

jest.mock('../../clients/sse-client', () => ({
	consumeSseStream: jest.fn(async (_url, _cookie, handler) => {
		handler({
			type: 'message',
			data: JSON.stringify({ type: 'tool-call', payload: { ok: true } }),
		});
		handler({ type: 'message', data: '{not-json' });
		handler({ type: 'message', data: JSON.stringify(['not-record']) });
	}),
}));

function makeTestCase(): EvalSetupTopologyCase {
	return {
		slug: 'chat_agent',
		workflowPath: '/fixtures/chat_agent.json',
		datasetPath: '/fixtures/chat_agent.rows.json',
		workflow: {
			id: 'fixture-id',
			name: 'Fixture Workflow',
			active: true,
			nodes: [
				{
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					parameters: {},
				},
			],
			connections: {},
			pinData: { 'AI Agent': [{ json: { answer: 'hello' } }] },
			settings: { executionOrder: 'v1' },
			staticData: { lastId: 1 },
			meta: { templateCredsSetupCompleted: true },
		},
		datasetRows: [{ input: 'hello', score: 1 }],
		datasetColumns: ['input', 'score'],
		sidecar: {
			targets: [],
			excludeTargets: [],
			metrics: ['correctness'],
			allowNativeTestRunnerSmoke: false,
		},
	};
}

function logger(): EvalLogger {
	return {
		info: jest.fn(),
		verbose: jest.fn(),
		success: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		isVerbose: false,
	};
}

describe('eval setup topology runner helpers', () => {
	beforeEach(() => {
		jest.mocked(consumeSseStream).mockImplementation(async (_url, _cookie, handler) => {
			handler({
				type: 'message',
				data: JSON.stringify({ type: 'tool-call', payload: { ok: true } }),
			});
			handler({ type: 'message', data: '{not-json' });
			handler({ type: 'message', data: JSON.stringify(['not-record']) });
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('infers data table column types from row values', () => {
		expect(inferColumnType([{ value: null }, { value: '1' }], 'value')).toBe('string');
		expect(inferColumnType([{ value: true }, { value: 'yes' }], 'value')).toBe('boolean');
		expect(inferColumnType([{ value: false }, { value: 42 }], 'value')).toBe('number');
	});

	it('builds workflow create payload without fixture identity fields', () => {
		const testCase = makeTestCase();
		Object.assign(testCase.workflow, { hash: 'fixture-hash' });

		const payload = buildWorkflowCreatePayload(testCase, 'project-1');

		expect(payload).toMatchObject({
			connections: {},
			projectId: 'project-1',
			pinData: { 'AI Agent': [{ json: { answer: 'hello' } }] },
			settings: { executionOrder: 'v1' },
			staticData: { lastId: 1 },
			meta: { templateCredsSetupCompleted: true },
		});
		expect(payload.name).toMatch(/^eval-setup-topology-chat_agent-/);
		expect(payload.nodes).toHaveLength(1);
		expect(payload).not.toHaveProperty('id');
		expect(payload).not.toHaveProperty('hash');
		expect(payload).not.toHaveProperty('active');
	});

	it('builds prompt with topology and existing data table requirements', () => {
		const prompt = buildEvalPrompt({
			workflowId: 'workflow-1',
			workflowName: 'Fixture Workflow',
			dataTableId: 'dt-1',
		});

		expect(prompt).toContain('workflow-1');
		expect(prompt).toContain('Fixture Workflow');
		expect(prompt).toContain('dt-1');
		expect(prompt).toContain('evaluate each AI agent node independently');
		expect(prompt).toContain('evals flow and eval-setup agent');
		expect(prompt).toContain('do not route production side-effect nodes during eval runs');
	});

	it('extracts confirmation request IDs from supported event shapes', () => {
		expect(
			extractConfirmationRequestId({
				timestamp: 1,
				type: 'confirmation-request',
				data: { requestId: 'request-1' },
			}),
		).toBe('request-1');
		expect(
			extractConfirmationRequestId({
				timestamp: 1,
				type: 'confirmation-request',
				data: { payload: { requestId: 'request-2' } },
			}),
		).toBe('request-2');
	});

	it('captures valid JSON SSE payloads and ignores malformed payloads', async () => {
		const events: CapturedEvent[] = [];
		const client = {
			getEventsUrl: jest.fn(() => 'http://localhost/events/thread-1'),
			cookie: 'n8n-auth=abc',
		};

		await startSseConnection(client, 'thread-1', events, new AbortController().signal);

		expect(events).toEqual([
			{
				timestamp: expect.any(Number),
				type: 'tool-call',
				data: { type: 'tool-call', payload: { ok: true } },
			},
		]);
	});

	it('approves confirmation requests with existing data table selection once', async () => {
		const client = {
			confirmAction: jest.fn().mockResolvedValue(undefined),
		};
		const approvedRequestIds = new Set<string>();
		const events: CapturedEvent[] = [
			{
				timestamp: 1,
				type: 'confirmation-request',
				data: { payload: { requestId: 'request-1', toolName: 'evals' } },
			},
			{
				timestamp: 2,
				type: 'confirmation-request',
				data: { requestId: 'request-1', payload: { toolName: 'evals' } },
			},
		];

		await approveEvalConfirmations({
			client,
			events,
			approvedRequestIds,
			dataTableId: 'dt-1',
			logger: logger(),
		});

		expect(client.confirmAction).toHaveBeenCalledTimes(1);
		expect(client.confirmAction).toHaveBeenCalledWith('request-1', true, {
			mockCredentials: true,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-1',
		});
		expect(approvedRequestIds.has('request-1')).toBe(true);
	});

	it('does not approve unrelated confirmation requests', async () => {
		const client = {
			confirmAction: jest.fn().mockResolvedValue(undefined),
		};
		const approvedRequestIds = new Set<string>();
		const events: CapturedEvent[] = [
			{
				timestamp: 1,
				type: 'confirmation-request',
				data: { payload: { requestId: 'unrelated-request' } },
			},
			{
				timestamp: 2,
				type: 'confirmation-request',
				data: { requestId: 'malformed-request', payload: null },
			},
			{
				timestamp: 3,
				type: 'confirmation-request',
				data: { payload: { requestId: 'evals-request', toolName: 'evals' } },
			},
		];

		await approveEvalConfirmations({
			client,
			events,
			approvedRequestIds,
			dataTableId: 'dt-1',
			logger: logger(),
		});

		expect(client.confirmAction).toHaveBeenCalledTimes(1);
		expect(client.confirmAction).toHaveBeenCalledWith('evals-request', true, {
			mockCredentials: true,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-1',
		});
		expect(approvedRequestIds.has('unrelated-request')).toBe(false);
		expect(approvedRequestIds.has('malformed-request')).toBe(false);
		expect(approvedRequestIds.has('evals-request')).toBe(true);
	});

	it('approves eval confirmations identified by evalsPropose without toolName', async () => {
		const client = {
			confirmAction: jest.fn().mockResolvedValue(undefined),
		};
		const approvedRequestIds = new Set<string>();
		const events: CapturedEvent[] = [
			{
				timestamp: 1,
				type: 'confirmation-request',
				data: {
					payload: {
						requestId: 'request-1',
						evalsPropose: {
							detectedAiNodes: ['AI Agent'],
							proposedGraphSummary: {},
							datasetOptions: {},
							suggestedMetrics: [],
						},
					},
				},
			},
		];

		await approveEvalConfirmations({
			client,
			events,
			approvedRequestIds,
			dataTableId: 'dt-1',
			logger: logger(),
		});

		expect(client.confirmAction).toHaveBeenCalledTimes(1);
		expect(client.confirmAction).toHaveBeenCalledWith('request-1', true, {
			mockCredentials: true,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-1',
		});
		expect(approvedRequestIds.has('request-1')).toBe(true);
	});

	it('fails promptly when the SSE stream records an error during settle', async () => {
		const streamError = new Error('SSE disconnected');
		const client = {
			confirmAction: jest.fn().mockResolvedValue(undefined),
			getThreadStatus: jest.fn(),
		};

		await expect(
			waitForThreadToSettle({
				client,
				threadId: 'thread-1',
				events: [],
				approvedRequestIds: new Set<string>(),
				dataTableId: 'dt-1',
				logger: logger(),
				timeoutMs: 600_000,
				getStreamError: () => streamError,
			}),
		).rejects.toThrow('SSE disconnected');
		expect(client.getThreadStatus).not.toHaveBeenCalled();
	});

	it('cancels the active thread and cleans artifacts when the runner fails after sendMessage', async () => {
		jest.useFakeTimers();

		const testCase = makeTestCase();
		const client = {
			getPersonalProjectId: jest.fn().mockResolvedValue('project-1'),
			createWorkflow: jest.fn().mockResolvedValue({
				...testCase.workflow,
				id: 'workflow-1',
				name: 'Imported workflow',
			}),
			createDataTable: jest.fn().mockResolvedValue({ id: 'dt-1', name: 'Dataset' }),
			insertDataTableRows: jest.fn().mockResolvedValue(undefined),
			getEventsUrl: jest.fn(() => 'http://localhost/events/thread-1'),
			cookie: 'n8n-auth=abc',
			sendMessage: jest.fn().mockResolvedValue({ runId: 'run-1' }),
			getThreadStatus: jest.fn().mockRejectedValue(new Error('status failed')),
			cancelRun: jest.fn().mockResolvedValue(undefined),
			deleteWorkflow: jest.fn().mockResolvedValue(undefined),
			deleteDataTable: jest.fn().mockResolvedValue(undefined),
		};

		const runPromise = runEvalSetupTopologyCase({
			client: client as unknown as N8nClient,
			testCase,
			logger: logger(),
			timeoutMs: 600_000,
		});
		await jest.runOnlyPendingTimersAsync();
		const result = await runPromise;

		expect(result).toMatchObject({
			caseSlug: 'chat_agent',
			workflowId: 'workflow-1',
			dataTableId: 'dt-1',
			passed: false,
			error: 'status failed',
		});
		expect(client.cancelRun).toHaveBeenCalledTimes(1);
		expect(client.cancelRun).toHaveBeenCalledWith(expect.stringMatching(/^eval-setup-topology-/));
		expect(client.deleteWorkflow).toHaveBeenCalledWith('workflow-1');
		expect(client.deleteDataTable).toHaveBeenCalledWith('project-1', 'dt-1');
	});
});
