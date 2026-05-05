// ---------------------------------------------------------------------------
// plan-capture.ts unit tests.
//
// We mock the SSE stream consumer so the test can dispatch synthetic events
// at controlled points in the lifecycle. The N8nClient is also mocked to
// observe sendMessage/confirmAction/cancelRun calls.
// ---------------------------------------------------------------------------

// jest.mock is hoisted to the top of the file by the Jest transformer, so
// these `consumeSseStream` mocks land before the module-under-test imports it.
jest.mock('../clients/sse-client', () => ({
	consumeSseStream: jest.fn(
		async (
			_url: string,
			_cookie: string,
			handler: (event: { data: string }) => void,
			signal: AbortSignal,
		) => {
			sseHandlers.handler = handler;
			sseHandlers.signal = signal;
			await new Promise<void>((resolve, reject) => {
				sseHandlers.resolve = resolve;
				sseHandlers.reject = reject;
				signal.addEventListener('abort', () => resolve());
			});
		},
	),
}));

import type { N8nClient } from '../clients/n8n-client';
import type { SseEvent } from '../clients/sse-client';
import type { EvalLogger } from '../harness/logger';
import { capturePlanFromPrompt, PlanCaptureFailedError } from '../harness/plan-capture';

const sseHandlers: {
	resolve?: () => void;
	reject?: (error: unknown) => void;
	handler?: (event: SseEvent) => void;
	signal?: AbortSignal;
} = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatch(rawEvent: Record<string, unknown>): void {
	if (!sseHandlers.handler) throw new Error('SSE handler not registered yet');
	sseHandlers.handler({ data: JSON.stringify(rawEvent) });
}

function makeLogger(): EvalLogger {
	return {
		info: jest.fn(),
		verbose: jest.fn(),
		success: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		isVerbose: false,
	};
}

interface ClientMock {
	client: N8nClient;
	sendMessage: jest.Mock;
	confirmAction: jest.Mock;
	cancelRun: jest.Mock;
}

function makeClient(): ClientMock {
	const sendMessage = jest.fn().mockResolvedValue({ runId: 'run-123' });
	const confirmAction = jest.fn().mockResolvedValue(undefined);
	const cancelRun = jest.fn().mockResolvedValue(undefined);

	const client = {
		sendMessage,
		confirmAction,
		cancelRun,
		getEventsUrl: jest.fn().mockReturnValue('http://test/events'),
		get cookie() {
			return 'n8n-auth=fake';
		},
	} as unknown as N8nClient;

	return { client, sendMessage, confirmAction, cancelRun };
}

function toolCallEvent(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
	return {
		type: 'tool-call',
		runId: 'run-123',
		agentId: 'planner',
		payload: { toolCallId: 'tc-' + toolName + '-' + Math.random(), toolName, args },
	};
}

function tasksUpdateEvent(planItems: unknown[]): Record<string, unknown> {
	return {
		type: 'tasks-update',
		runId: 'run-123',
		agentId: 'planner',
		payload: {
			tasks: {
				tasks: planItems.map((p) =>
					isRecord(p) ? { id: p.id, description: p.title, status: 'todo' } : p,
				),
			},
			planItems,
		},
	};
}

function planReviewConfirmation(requestId: string): Record<string, unknown> {
	return {
		type: 'confirmation-request',
		runId: 'run-123',
		agentId: 'planner',
		payload: {
			requestId,
			toolCallId: 'tc-submit',
			toolName: 'submit-plan',
			args: {},
			severity: 'info',
			message: 'Review the plan',
			inputType: 'plan-review',
			planItems: [],
		},
	};
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Drives the capture forward by waiting one tick — lets the polling loop
// observe the `captured` flag we just flipped via SSE dispatches.
async function tick(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 300));
}

beforeEach(() => {
	jest.clearAllMocks();
	sseHandlers.handler = undefined;
	sseHandlers.signal = undefined;
	sseHandlers.resolve = undefined;
	sseHandlers.reject = undefined;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('capturePlanFromPrompt', () => {
	it('captures plan items, reconstructs blueprint, declines plan-review, and returns', async () => {
		const { client, sendMessage, confirmAction, cancelRun } = makeClient();

		const capturePromise = capturePlanFromPrompt({
			client,
			parentExampleId: 'parent-1',
			prompt: 'build me a thing',
			timeoutMs: 5_000,
			logger: makeLogger(),
		});

		// Wait for SSE to register before driving events.
		await waitForHandler();
		await tick(); // Let sendMessage fire.

		expect(sendMessage).toHaveBeenCalledWith(
			expect.stringMatching(/^eval-plan-capture-/),
			'build me a thing',
		);

		// Planner adds 3 items: 1 workflow, 1 data-table, 1 research.
		dispatch(
			toolCallEvent('add-plan-item', {
				summary: 'A simple automation',
				assumptions: ['user has webhook endpoint'],
				item: {
					kind: 'workflow',
					id: 'wf-1',
					name: 'Notify on submission',
					purpose: 'Receive webhook and send notification',
					integrations: ['Slack'],
					triggerDescription: 'Webhook POST',
					dependsOn: [],
				},
			}),
		);
		dispatch(
			toolCallEvent('add-plan-item', {
				item: {
					kind: 'data-table',
					id: 'dt-1',
					name: 'submissions',
					purpose: 'Store form submissions',
					columns: [
						{ name: 'id', type: 'string' },
						{ name: 'created_at', type: 'date' },
					],
					dependsOn: [],
				},
			}),
		);
		dispatch(
			toolCallEvent('add-plan-item', {
				item: {
					kind: 'research',
					id: 'r-1',
					question: 'What format does Slack expect?',
					dependsOn: [],
				},
			}),
		);

		// tasks-update carrying the reconciled plan items as submit-plan would emit them.
		dispatch(
			tasksUpdateEvent([
				{
					id: 'wf-1',
					title: "Build 'Notify on submission' workflow",
					kind: 'build-workflow',
					spec: 'Receive webhook and send notification\nTrigger: Webhook POST\nIntegrations: Slack',
					deps: [],
				},
				{
					id: 'dt-1',
					title: "Create 'submissions' data table",
					kind: 'manage-data-tables',
					spec: 'Create a data table named submissions...',
					deps: [],
				},
				{
					id: 'r-1',
					title: 'What format does Slack expect?',
					kind: 'research',
					spec: 'What format does Slack expect?',
					deps: [],
				},
			]),
		);

		// Plan review confirmation arrives — should be declined.
		dispatch(planReviewConfirmation('req-plan-1'));

		const result = await capturePromise;

		// Plan-review was declined, run was cancelled.
		expect(confirmAction).toHaveBeenCalledWith(
			'req-plan-1',
			expect.objectContaining({ kind: 'approval', approved: false }),
		);
		expect(cancelRun).toHaveBeenCalled();

		// All planItems came through verbatim — filtering by kind happens later in the sync.
		expect(result.plannedTasks).toHaveLength(3);
		expect(result.plannedTasks.map((t) => t.kind)).toEqual([
			'build-workflow',
			'manage-data-tables',
			'research',
		]);

		// Blueprint reconstructed from add-plan-item events.
		expect(result.blueprint.summary).toBe('A simple automation');
		expect(result.blueprint.assumptions).toEqual(['user has webhook endpoint']);
		expect(result.blueprint.workflows).toHaveLength(1);
		expect(result.blueprint.workflows[0]).toMatchObject({
			id: 'wf-1',
			name: 'Notify on submission',
			integrations: ['Slack'],
			triggerDescription: 'Webhook POST',
		});
		expect(result.blueprint.dataTables).toHaveLength(1);
		expect(result.blueprint.dataTables[0].columns).toEqual([
			{ name: 'id', type: 'string' },
			{ name: 'created_at', type: 'date' },
		]);
		expect(result.blueprint.researchItems).toHaveLength(1);
	});

	it('auto-resolves non-plan-review confirmations (e.g. ask-user) so the planner reaches submit-plan', async () => {
		const { client, confirmAction } = makeClient();

		const capturePromise = capturePlanFromPrompt({
			client,
			parentExampleId: 'parent-2',
			prompt: 'something ambiguous',
			timeoutMs: 5_000,
			logger: makeLogger(),
		});

		await waitForHandler();
		await tick();

		// ask-user fires before submit-plan.
		dispatch({
			type: 'confirmation-request',
			runId: 'run-123',
			agentId: 'planner',
			payload: {
				requestId: 'req-ask-1',
				toolCallId: 'tc-ask',
				toolName: 'ask-user',
				args: {},
				severity: 'info',
				message: 'Need clarification',
				inputType: 'questions',
				questions: [{ id: 'q1', question: 'Which one?', type: 'single', options: ['a', 'b'] }],
			},
		});

		// Wait for the auto-resolution to be sent.
		await tick();

		expect(confirmAction).toHaveBeenCalledWith(
			'req-ask-1',
			expect.objectContaining({ kind: 'questions', answers: [] }),
		);

		// Planner then submits a plan.
		dispatch(
			toolCallEvent('add-plan-item', {
				summary: 'plan',
				item: {
					kind: 'workflow',
					id: 'wf-only',
					name: 'Only workflow',
					purpose: 'Do the thing',
					integrations: [],
					dependsOn: [],
				},
			}),
		);
		dispatch(
			tasksUpdateEvent([
				{
					id: 'wf-only',
					title: "Build 'Only workflow' workflow",
					kind: 'build-workflow',
					spec: 'Do the thing',
					deps: [],
				},
			]),
		);
		dispatch(planReviewConfirmation('req-plan-2'));

		const result = await capturePromise;
		expect(result.plannedTasks).toHaveLength(1);
		expect(confirmAction).toHaveBeenCalledWith(
			'req-plan-2',
			expect.objectContaining({ kind: 'approval', approved: false }),
		);
	});

	it('throws PlanCaptureFailedError(timeout) when no plan-review arrives within the deadline', async () => {
		const { client, cancelRun } = makeClient();

		const capturePromise = capturePlanFromPrompt({
			client,
			parentExampleId: 'parent-3',
			prompt: 'will hang',
			timeoutMs: 600,
			logger: makeLogger(),
		});

		await waitForHandler();

		await expect(capturePromise).rejects.toBeInstanceOf(PlanCaptureFailedError);
		await expect(capturePromise).rejects.toMatchObject({
			parentExampleId: 'parent-3',
			reason: 'timeout',
		});

		// Run cancelled even on timeout.
		expect(cancelRun).toHaveBeenCalled();
	});

	it('throws PlanCaptureFailedError(no-plan-emitted) when run-finish arrives without a tasks-update', async () => {
		const { client } = makeClient();

		const capturePromise = capturePlanFromPrompt({
			client,
			parentExampleId: 'parent-4',
			prompt: 'will fail before submitting',
			timeoutMs: 5_000,
			logger: makeLogger(),
		});

		await waitForHandler();
		await tick();

		dispatch({
			type: 'run-finish',
			runId: 'run-123',
			agentId: 'planner',
			payload: { status: 'failed' },
		});

		await expect(capturePromise).rejects.toMatchObject({
			parentExampleId: 'parent-4',
			reason: 'no-plan-emitted',
		});
	});

	it('handles malformed SSE events without crashing', async () => {
		const { client } = makeClient();

		const capturePromise = capturePlanFromPrompt({
			client,
			parentExampleId: 'parent-5',
			prompt: 'noisy stream',
			timeoutMs: 5_000,
			logger: makeLogger(),
		});

		await waitForHandler();
		await tick();

		// Garbled JSON.
		sseHandlers.handler!({ data: '{not json' });
		// Wrong shape.
		sseHandlers.handler!({ data: JSON.stringify({ type: 'unknown-event' }) });
		// Missing payload.
		sseHandlers.handler!({ data: JSON.stringify({ type: 'tool-call' }) });

		// Recover: emit a valid plan + plan-review.
		dispatch(
			toolCallEvent('add-plan-item', {
				summary: 's',
				item: {
					kind: 'workflow',
					id: 'wf-x',
					name: 'X',
					purpose: 'do x',
					integrations: [],
					dependsOn: [],
				},
			}),
		);
		dispatch(
			tasksUpdateEvent([
				{
					id: 'wf-x',
					title: "Build 'X' workflow",
					kind: 'build-workflow',
					spec: 'do x',
					deps: [],
				},
			]),
		);
		dispatch(planReviewConfirmation('req-x'));

		const result = await capturePromise;
		expect(result.plannedTasks).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function waitForHandler(): Promise<void> {
	for (let i = 0; i < 50; i++) {
		if (sseHandlers.handler) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error('SSE handler never registered');
}
