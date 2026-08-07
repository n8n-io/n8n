import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { runMultiTurnConversation } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import type { ExternalWorkflowEdit } from '../harness/schema';
import type { CapturedEvent } from '../types';

/** A `tool-result` for a workflow tool — the shape the parser reads build ids
 *  out of. `success` decides whether the build SAVED: a failed build reports a
 *  workflowId too, and the hook must not count it. */
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

/** A build that parsed but did not persist. Still carries `workflowId` — this is
 *  the shape that made an early version of the hook rename an untouched workflow. */
function failedBuildEvent(workflowId: string): CapturedEvent {
	return buildEvent(workflowId, false);
}

/** A finished run, so `waitForAllActivity` returns instead of polling for one. */
function runLifecycleEvents(): CapturedEvent[] {
	return [
		{ timestamp: Date.now(), type: 'run-start', data: { type: 'run-start' } },
		{ timestamp: Date.now(), type: 'run-finish', data: { type: 'run-finish' } },
	];
}

interface RunOptions {
	events: CapturedEvent[];
	externalEdits?: ExternalWorkflowEdit[];
	/** One entry per turn boundary; `null` ends the conversation. A function runs
	 *  at that boundary first, so a test can simulate the agent building again. */
	followUps: Array<string | null | (() => string | null)>;
	updateShouldThrow?: boolean;
}

interface RunRecord {
	renames: Array<{ workflowId: string; name: unknown }>;
	messagesSent: string[];
}

async function runLoop(options: RunOptions): Promise<RunRecord> {
	const renames: RunRecord['renames'] = [];
	const messagesSent: string[] = [];
	const remaining = [...options.followUps];

	const client = {
		updateWorkflow: options.updateShouldThrow
			? vi.fn().mockRejectedValue(new Error('workflow is read-only'))
			: vi.fn().mockImplementation(async (id: string, updates: Record<string, unknown>) => {
					renames.push({ workflowId: id, name: updates.name });
					return await Promise.resolve({});
				}),
		sendMessage: vi.fn().mockImplementation(async (_threadId: string, message: string) => {
			messagesSent.push(message);
			return await Promise.resolve();
		}),
		getThreadStatus: vi.fn().mockResolvedValue({ backgroundTasks: [] }),
		cancelRun: vi.fn().mockResolvedValue(undefined),
	} as unknown as N8nClient;

	const logger = { verbose: () => {}, info: () => {}, warn: () => {} } as unknown as EvalLogger;

	await runMultiTurnConversation({
		client,
		threadId: 'thread-1',
		events: options.events,
		approvedRequests: new Set<string>(),
		startTime: Date.now(),
		timeoutMs: 30_000,
		logger,
		externalEdits: options.externalEdits,
		nextMessageDecider: vi.fn().mockImplementation(async () => {
			const next = remaining.shift() ?? null;
			const resolved = typeof next === 'function' ? next() : next;
			return await Promise.resolve(
				resolved === null ? { kind: 'done' } : { kind: 'followUp', message: resolved },
			);
		}),
	});

	return { renames, messagesSent };
}

describe('externalEdits in runMultiTurnConversation', () => {
	it('renames the built workflow once its build threshold is met', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			externalEdits: [{ afterWorkflowCount: 1, rename: 'Renamed in another tab' }],
			followUps: ['keep going', null],
		});

		expect(renames).toEqual([{ workflowId: 'wf-first', name: 'Renamed in another tab' }]);
	});

	it('applies every due edit in the array', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			externalEdits: [
				{ afterWorkflowCount: 1, rename: 'First rename' },
				{ afterWorkflowCount: 1, rename: 'Second rename' },
			],
			followUps: ['keep going', null],
		});

		expect(renames.map((r) => r.name)).toEqual(['First rename', 'Second rename']);
	});

	it('does not apply an edit on the boundary that ends the conversation', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			externalEdits: [{ afterWorkflowCount: 1, rename: 'Too late to matter' }],
			// The proxy ends the conversation at the first boundary, so the agent would
			// never get a turn to react to the edit.
			followUps: [null],
		});

		expect(renames).toHaveLength(0);
	});

	it('ignores a failed build — it reports a workflowId but saved nothing', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), failedBuildEvent('wf-never-saved')],
			externalEdits: [{ afterWorkflowCount: 1, rename: 'Should not be applied' }],
			followUps: ['keep going', 'and again', null],
		});

		// Renaming here would mutate a workflow this run never created — an
		// attached or pre-existing one the agent merely tried to save to.
		expect(renames).toHaveLength(0);
	});

	it('does not let a failed build on another workflow push the count over the threshold', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), failedBuildEvent('wf-attached'), buildEvent('wf-saved')],
			externalEdits: [{ afterWorkflowCount: 2, rename: 'Should not be applied' }],
			followUps: ['keep going', 'and again', null],
		});

		// Counting the failed build would reach 2 and rename `wf-saved` — or worse,
		// `wf-attached`, a workflow this run never created.
		expect(renames).toHaveLength(0);
	});

	it('applies a due edit exactly once, across several turn boundaries', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			externalEdits: [{ afterWorkflowCount: 1, rename: 'Renamed once' }],
			// Three boundaries, all of which the edit stays "due" for.
			followUps: ['keep going', 'and again', null],
		});

		expect(renames).toHaveLength(1);
	});

	it('waits for the build count the edit asks for', async () => {
		const events = [...runLifecycleEvents(), buildEvent('wf-first')];

		const { renames } = await runLoop({
			events,
			externalEdits: [{ afterWorkflowCount: 2, rename: 'Second build renamed' }],
			followUps: [
				// Not due yet — only one workflow exists at this boundary.
				'keep going',
				// The agent builds a second workflow during that turn; now it is due,
				// and must target the SECOND build, not the first.
				() => {
					events.push(buildEvent('wf-second'));
					return 'and again';
				},
				null,
			],
		});

		expect(renames).toEqual([{ workflowId: 'wf-second', name: 'Second build renamed' }]);
	});

	it('never fires when the build count is not reached', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			externalEdits: [{ afterWorkflowCount: 2, rename: 'Never applied' }],
			followUps: ['keep going', 'and again', null],
		});

		expect(renames).toHaveLength(0);
	});

	it('swallows a failed rename and keeps the conversation going', async () => {
		const { renames, messagesSent } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			externalEdits: [{ afterWorkflowCount: 1, rename: 'Doomed rename' }],
			followUps: ['still talking', null],
			updateShouldThrow: true,
		});

		expect(renames).toHaveLength(0);
		// The point of swallowing: the run continues so the case can grade recovery.
		expect(messagesSent).toEqual(['still talking']);
	});
});
