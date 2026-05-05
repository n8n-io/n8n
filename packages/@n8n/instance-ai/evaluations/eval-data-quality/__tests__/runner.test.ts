import type { N8nClient } from '../../clients/n8n-client';
import { consumeSseStream } from '../../clients/sse-client';
import type { EvalLogger } from '../../harness/logger';
import type { CapturedEvent } from '../../types';
import {
	approveEvalDataConfirmation,
	buildEvalPrompt,
	buildWorkflowCreatePayload,
	extractConfirmationRequestId,
	isEvalDataConfirmation,
	rewriteDataTableId,
	runEvalDataQualityCase,
	startSseConnection,
	waitForThreadToSettle,
} from '../runner';
import { datasetSidecarSchema, type EvalDataQualityCase } from '../types';

jest.mock('../../clients/sse-client', () => ({
	consumeSseStream: jest.fn(),
}));

const sidecar = datasetSidecarSchema.parse({
	requestedRowCount: 5,
	minRowCount: 3,
	columns: [
		{ name: 'input', type: 'string' },
		{ name: 'expected_output', type: 'string' },
		{ name: 'actual_output', type: 'string' },
	],
	inputColumns: ['input'],
	expectedOutputColumns: ['expected_output'],
	actualOutputColumns: ['actual_output'],
	dataTableNodeName: 'Eval Trigger',
});

function makeTestCase(overrides: Partial<EvalDataQualityCase> = {}): EvalDataQualityCase {
	return {
		slug: 'chat-agent',
		workflowPath: '/fixtures/chat-agent.json',
		sidecarPath: '/fixtures/chat-agent.dataset.json',
		workflow: {
			id: 'fixture-id',
			name: 'Fixture Workflow',
			active: false,
			nodes: [
				{
					name: 'Eval Trigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 4.7,
					parameters: {
						source: 'dataTable',
						dataTableId: { __rl: true, mode: 'id', value: 'PLACEHOLDER' },
					},
				},
			],
			connections: {},
			pinData: {},
		},
		sidecar,
		...overrides,
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

describe('rewriteDataTableId', () => {
	it('rewrites the resource locator on the named node', () => {
		const result = rewriteDataTableId(makeTestCase().workflow, 'Eval Trigger', 'dt-real');
		const node = result.nodes.find((n) => n.name === 'Eval Trigger');
		expect(node?.parameters?.dataTableId).toEqual({ __rl: true, mode: 'id', value: 'dt-real' });
	});

	it('rewrites a plain string dataTableId', () => {
		const original = makeTestCase().workflow;
		original.nodes[0].parameters = { dataTableId: 'old' };

		const result = rewriteDataTableId(original, 'Eval Trigger', 'dt-real');
		expect(result.nodes[0].parameters?.dataTableId).toBe('dt-real');
	});

	it('falls back to any node with a dataTableId param when no name is provided', () => {
		const result = rewriteDataTableId(makeTestCase().workflow, undefined, 'dt-real');
		expect(result.nodes[0].parameters?.dataTableId).toMatchObject({ value: 'dt-real' });
	});

	it('does not mutate the original workflow', () => {
		const original = makeTestCase().workflow;
		const cloned = structuredClone(original);
		rewriteDataTableId(original, 'Eval Trigger', 'dt-real');
		expect(original).toEqual(cloned);
	});
});

describe('buildWorkflowCreatePayload', () => {
	it('strips credentials and tags name with the slug', () => {
		const wf = makeTestCase().workflow;
		wf.nodes[0].credentials = { someCred: 'cred-id' };
		const payload = buildWorkflowCreatePayload(wf, 'my-slug', 'project-1');
		expect(payload.name).toContain('eval-data-quality-my-slug-');
		expect(payload.projectId).toBe('project-1');
		expect(payload.nodes[0].credentials).toBeUndefined();
	});
});

describe('buildEvalPrompt', () => {
	it('mentions workflow id, DataTable id, and requested row count', () => {
		const prompt = buildEvalPrompt({
			workflowId: 'w-1',
			workflowName: 'Support Writer',
			dataTableId: 'dt-1',
			requestedRowCount: 10,
		});
		expect(prompt).toContain('w-1');
		expect(prompt).toContain('Support Writer');
		expect(prompt).toContain('dt-1');
		expect(prompt).toContain('10 synthetic eval rows');
	});

	it('includes the target agent node when provided', () => {
		const prompt = buildEvalPrompt({
			workflowId: 'w-1',
			workflowName: 'wf',
			dataTableId: 'dt-1',
			requestedRowCount: 10,
			targetAgentNodeName: 'Classifier',
		});
		expect(prompt).toContain('Classifier');
	});
});

describe('isEvalDataConfirmation', () => {
	it('matches confirmation-request events with payload.toolName=eval-data', () => {
		expect(
			isEvalDataConfirmation({
				timestamp: 1,
				type: 'confirmation-request',
				data: { payload: { toolName: 'eval-data' } },
			}),
		).toBe(true);
	});

	it('matches confirmation-request events with top-level toolName=eval-data', () => {
		expect(
			isEvalDataConfirmation({
				timestamp: 1,
				type: 'confirmation-request',
				data: { toolName: 'eval-data' },
			}),
		).toBe(true);
	});

	it('rejects non-confirmation events', () => {
		expect(
			isEvalDataConfirmation({
				timestamp: 1,
				type: 'tool-call',
				data: { toolName: 'eval-data' },
			}),
		).toBe(false);
	});
});

describe('extractConfirmationRequestId', () => {
	it('reads requestId from the top-level event data', () => {
		expect(
			extractConfirmationRequestId({
				timestamp: 1,
				type: 'confirmation-request',
				data: { requestId: 'req-1' },
			}),
		).toBe('req-1');
	});

	it('reads requestId from a nested payload', () => {
		expect(
			extractConfirmationRequestId({
				timestamp: 1,
				type: 'confirmation-request',
				data: { payload: { requestId: 'req-2' } },
			}),
		).toBe('req-2');
	});

	it('returns undefined when not present', () => {
		expect(
			extractConfirmationRequestId({ timestamp: 1, type: 'confirmation-request', data: {} }),
		).toBeUndefined();
	});
});

describe('startSseConnection', () => {
	beforeEach(() => {
		jest.mocked(consumeSseStream).mockImplementation(async (_url, _cookie, handler) => {
			await Promise.resolve();
			handler({ type: 'message', data: JSON.stringify({ type: 'tool-call', x: 1 }) });
			handler({ type: 'message', data: '{not-json' });
			handler({ type: 'message', data: JSON.stringify('string-value') });
		});
	});

	it('captures structured events and ignores malformed payloads', async () => {
		const events: CapturedEvent[] = [];
		await startSseConnection(
			{ getEventsUrl: () => 'http://x', cookie: 'cookie' } as unknown as Pick<
				N8nClient,
				'getEventsUrl' | 'cookie'
			>,
			'thread-1',
			events,
			new AbortController().signal,
		);
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe('tool-call');
	});
});

describe('approveEvalDataConfirmation', () => {
	it('approves only eval-data confirmations and dedupes by requestId', async () => {
		const confirmAction = jest.fn().mockResolvedValue(undefined);
		const events: CapturedEvent[] = [
			{
				timestamp: 1,
				type: 'confirmation-request',
				data: { requestId: 'req-1', payload: { toolName: 'eval-data' } },
			},
			{
				timestamp: 2,
				type: 'confirmation-request',
				data: { requestId: 'req-2', payload: { toolName: 'workflows' } },
			},
		];
		const approvedRequestIds = new Set<string>();

		await approveEvalDataConfirmation({
			client: { confirmAction },
			events,
			approvedRequestIds,
			logger: logger(),
		});
		await approveEvalDataConfirmation({
			client: { confirmAction },
			events,
			approvedRequestIds,
			logger: logger(),
		});

		expect(confirmAction).toHaveBeenCalledTimes(1);
		expect(confirmAction).toHaveBeenCalledWith('req-1', { kind: 'approval', approved: true });
	});
});

describe('waitForThreadToSettle', () => {
	beforeEach(() => {
		jest.useFakeTimers({ doNotFake: ['nextTick'] });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns once the thread has no active run, suspended state, or background tasks', async () => {
		const getThreadStatus = jest
			.fn()
			.mockResolvedValueOnce({ hasActiveRun: true, isSuspended: false, backgroundTasks: [] })
			.mockResolvedValue({ hasActiveRun: false, isSuspended: false, backgroundTasks: [] });
		const confirmAction = jest.fn();
		const promise = waitForThreadToSettle({
			client: { getThreadStatus, confirmAction },
			threadId: 'thread-1',
			events: [],
			approvedRequestIds: new Set(),
			logger: logger(),
			timeoutMs: 5_000,
		});
		await jest.runOnlyPendingTimersAsync();
		await jest.runOnlyPendingTimersAsync();
		await expect(promise).resolves.toBeUndefined();
	});

	it('throws when the timeout elapses', async () => {
		const getThreadStatus = jest
			.fn()
			.mockResolvedValue({ hasActiveRun: true, isSuspended: false, backgroundTasks: [] });
		const confirmAction = jest.fn();
		const promise = waitForThreadToSettle({
			client: { getThreadStatus, confirmAction },
			threadId: 'thread-1',
			events: [],
			approvedRequestIds: new Set(),
			logger: logger(),
			timeoutMs: 50,
		});
		const captured = promise.catch((reason: unknown) => reason);
		await jest.advanceTimersByTimeAsync(2_000);
		const settled = await captured;
		expect(settled).toBeInstanceOf(Error);
		expect((settled as Error).message).toMatch(/Timed out/);
	});
});

describe('runEvalDataQualityCase', () => {
	beforeEach(() => {
		jest.mocked(consumeSseStream).mockImplementation(async () => {});
	});

	it('runs end-to-end against a mocked client and returns a verifier result', async () => {
		const dataTable = {
			id: 'dt-real',
			name: 'dt',
			columns: [
				{ name: 'input', type: 'string' },
				{ name: 'expected_output', type: 'string' },
				{ name: 'actual_output', type: 'string' },
			],
		};
		const client = {
			getPersonalProjectId: jest.fn().mockResolvedValue('project-1'),
			createDataTable: jest.fn().mockResolvedValue(dataTable),
			createWorkflow: jest
				.fn()
				.mockResolvedValue({ id: 'wf-1', name: 'wf', active: false, nodes: [], connections: {} }),
			sendMessage: jest.fn().mockResolvedValue({ runId: 'run-1' }),
			getThreadStatus: jest
				.fn()
				.mockResolvedValue({ hasActiveRun: false, isSuspended: false, backgroundTasks: [] }),
			getThreadMessages: jest.fn().mockResolvedValue(undefined),
			getDataTableRows: jest.fn().mockResolvedValue({
				count: 3,
				data: [
					{ input: 'a', expected_output: 'X', actual_output: null },
					{ input: 'b', expected_output: 'Y', actual_output: null },
					{ input: 'c', expected_output: 'Z', actual_output: null },
				],
			}),
			confirmAction: jest.fn().mockResolvedValue(undefined),
			cancelRun: jest.fn().mockResolvedValue(undefined),
			deleteWorkflow: jest.fn().mockResolvedValue(undefined),
			deleteDataTable: jest.fn().mockResolvedValue(undefined),
			getEventsUrl: () => 'http://x',
			cookie: 'cookie',
		} as unknown as N8nClient;

		const result = await runEvalDataQualityCase({
			client,
			testCase: makeTestCase(),
			logger: logger(),
			timeoutMs: 10_000,
		});

		expect(client.createDataTable).toHaveBeenCalledWith(
			'project-1',
			expect.objectContaining({ columns: sidecar.columns }),
		);
		expect(client.createWorkflow).toHaveBeenCalled();
		expect(client.deleteWorkflow).toHaveBeenCalledWith('wf-1');
		expect(client.deleteDataTable).toHaveBeenCalledWith('project-1', 'dt-real');
		expect(result.workflowId).toBe('wf-1');
		expect(result.dataTableId).toBe('dt-real');
		expect(result.dataset.passed).toBe(true);
	});

	it('captures runner errors as findings and still cleans up', async () => {
		const client = {
			getPersonalProjectId: jest.fn().mockResolvedValue('project-1'),
			createDataTable: jest.fn().mockRejectedValue(new Error('boom')),
			deleteWorkflow: jest.fn(),
			deleteDataTable: jest.fn(),
			cancelRun: jest.fn(),
			getEventsUrl: () => 'http://x',
			cookie: 'cookie',
		} as unknown as N8nClient;

		const result = await runEvalDataQualityCase({
			client,
			testCase: makeTestCase(),
			logger: logger(),
			timeoutMs: 1_000,
		});

		expect(result.passed).toBe(false);
		expect(result.error).toBe('boom');
		expect(result.dataset.findings[0].code).toBe('runner_error');
	});
});
