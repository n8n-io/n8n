import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { runMultiTurnConversation } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';

/** A `tool-result` for a workflow tool — the shape the parser reads build ids
 *  out of (same fixture as external-workflow-edits.test.ts). */
function buildEvent(workflowId: string, success = true): CapturedEvent {
	return {
		timestamp: Date.now(),
		type: 'tool-result',
		data: {
			type: 'tool-result',
			payload: {
				toolCallId: `call-${workflowId}-${String(success)}`,
				toolName: 'build-workflow',
				result: { workflowId, success },
			},
		},
	};
}

/** A finished run, so `waitForAllActivity` returns instead of polling for one. */
function runLifecycleEvents(): CapturedEvent[] {
	return [
		{ timestamp: Date.now(), type: 'run-start', data: { type: 'run-start' } },
		{ timestamp: Date.now(), type: 'run-finish', data: { type: 'run-finish' } },
	];
}

/** One turn boundary: a string sends that message plainly; the object form also
 *  sets `runWorkflowNow`; `null` ends the conversation. */
type Turn = string | { message: string; runWorkflowNow: true } | null;

interface RunOptions {
	events: CapturedEvent[];
	followUps: Turn[];
	midRunDataSetup?: string;
	executeShouldThrow?: boolean;
	executeResult?: { success: boolean; errors: string[] };
}

interface RunRecord {
	/** [workflowId, scenarioHints] per executeWithLlmMock call, in call order. */
	executions: Array<[string, string | undefined]>;
	/** Interleaved order of side effects and sends, for ordering assertions. */
	timeline: string[];
	warnings: string[];
	infos: string[];
}

async function runLoop(options: RunOptions): Promise<RunRecord> {
	const executions: RunRecord['executions'] = [];
	const timeline: string[] = [];
	const warnings: string[] = [];
	const infos: string[] = [];
	const remaining = [...options.followUps];

	const client = {
		executeWithLlmMock: options.executeShouldThrow
			? vi.fn().mockRejectedValue(new Error('mock executor unavailable'))
			: vi.fn().mockImplementation(async (workflowId: string, scenarioHints?: string) => {
					executions.push([workflowId, scenarioHints]);
					timeline.push(`execute:${workflowId}`);
					return await Promise.resolve({
						executionId: 'exec-1',
						success: options.executeResult?.success ?? true,
						nodeResults: {},
						errors: options.executeResult?.errors ?? [],
						hints: { scenario: '', nodes: {} },
						mockedCredentials: [],
					});
				}),
		sendMessage: vi.fn().mockImplementation(async (_threadId: string, message: string) => {
			timeline.push(`send:${message}`);
			return await Promise.resolve();
		}),
		getThreadStatus: vi.fn().mockResolvedValue({ backgroundTasks: [] }),
		cancelRun: vi.fn().mockResolvedValue(undefined),
	} as unknown as N8nClient;

	const logger = {
		verbose: () => {},
		info: (message: string) => infos.push(message),
		warn: (message: string) => warnings.push(message),
	} as unknown as EvalLogger;

	await runMultiTurnConversation({
		client,
		threadId: 'thread-1',
		events: options.events,
		approvedRequests: new Set<string>(),
		startTime: Date.now(),
		timeoutMs: 30_000,
		logger,
		midRunDataSetup: options.midRunDataSetup,
		nextMessageDecider: vi.fn().mockImplementation(async () => {
			const next = remaining.shift() ?? null;
			if (next === null) return await Promise.resolve({ kind: 'done' });
			if (typeof next === 'string') {
				return await Promise.resolve({ kind: 'followUp', message: next });
			}
			return await Promise.resolve({
				kind: 'followUp',
				message: next.message,
				runWorkflowNow: next.runWorkflowNow,
			});
		}),
	});

	return { executions, timeline, warnings, infos };
}

describe('proxy-driven mid-run mock execution in runMultiTurnConversation', () => {
	it('executes the last saved workflow before the follow-up message is delivered', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-1')],
			followUps: [{ message: 'Just ran it — looks good!', runWorkflowNow: true }, null],
		});

		expect(record.executions).toEqual([['wf-1', undefined]]);
		expect(record.timeline).toEqual(['execute:wf-1', 'send:Just ran it — looks good!']);
	});

	it('steers the execution with midRunDataSetup as scenario hints', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-1')],
			followUps: [{ message: 'Ran it.', runWorkflowNow: true }, null],
			midRunDataSetup: 'The Slack post succeeds; the table has 3 rows.',
		});

		expect(record.executions).toEqual([['wf-1', 'The Slack post succeeds; the table has 3 rows.']]);
	});

	it('targets the most recently saved workflow', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-old'), buildEvent('wf-new')],
			followUps: [{ message: 'Ran it.', runWorkflowNow: true }, null],
		});

		expect(record.executions).toEqual([['wf-new', undefined]]);
	});

	it('skips with a warning when this run has saved no workflow', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents()],
			followUps: [{ message: 'Ran it.', runWorkflowNow: true }, null],
		});

		expect(record.executions).toEqual([]);
		expect(record.warnings.some((w) => w.includes('[mid-run-execute] Skipped'))).toBe(true);
		// The message is still delivered — the agent's handling of the missing
		// run is itself gradeable.
		expect(record.timeline).toEqual(['send:Ran it.']);
	});

	it('warns but still delivers the message when the mock execution throws', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-1')],
			followUps: [{ message: 'Ran it.', runWorkflowNow: true }, null],
			executeShouldThrow: true,
		});

		expect(record.warnings.some((w) => w.includes('[mid-run-execute] Execution of wf-1'))).toBe(
			true,
		);
		expect(record.timeline).toEqual(['send:Ran it.']);
	});

	it('does nothing on a turn the proxy did not ask for a run', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-1')],
			followUps: ['Looks good so far.', null],
		});

		expect(record.executions).toEqual([]);
		expect(record.timeline).toEqual(['send:Looks good so far.']);
	});

	it('reports a successful execution at info, so its absence is a readable signal', async () => {
		const record = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-1')],
			followUps: [{ message: 'Ran it.', runWorkflowNow: true }, null],
		});

		expect(
			record.infos.some(
				(m) => m.includes('[mid-run-execute] Executed wf-1') && m.includes('success=true'),
			),
		).toBe(true);
	});
});
