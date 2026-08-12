import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { runMultiTurnConversation } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
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

/** One turn boundary. A string sends that message with no rename; the tuple form
 *  is the proxy also setting `renameWorkflowTo`; `null` ends the conversation. A
 *  function runs at that boundary first, so a test can simulate the agent
 *  building again mid-conversation. */
type Turn = string | [message: string, renameWorkflowTo: string] | null;

interface RunOptions {
	events: CapturedEvent[];
	followUps: Array<Turn | (() => Turn)>;
	/** Current name the instance reports for every workflow — the ground truth the
	 *  idempotence guard reads. */
	currentName?: string;
	updateShouldThrow?: boolean;
	getShouldThrow?: boolean;
}

interface RunRecord {
	renames: Array<{ workflowId: string; name: unknown }>;
	messagesSent: string[];
	warnings: string[];
	infos: string[];
}

async function runLoop(options: RunOptions): Promise<RunRecord> {
	const renames: RunRecord['renames'] = [];
	const messagesSent: string[] = [];
	const warnings: string[] = [];
	const infos: string[] = [];
	const remaining = [...options.followUps];

	const client = {
		getWorkflow: options.getShouldThrow
			? vi.fn().mockRejectedValue(new Error('workflow not found'))
			: vi
					.fn()
					.mockImplementation(
						async (id: string) =>
							await Promise.resolve({ id, name: options.currentName ?? 'Original name' }),
					),
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
		nextMessageDecider: vi.fn().mockImplementation(async () => {
			const next = remaining.shift() ?? null;
			const resolved = typeof next === 'function' ? next() : next;
			if (resolved === null) return await Promise.resolve({ kind: 'done' });
			if (typeof resolved === 'string') {
				return await Promise.resolve({ kind: 'followUp', message: resolved });
			}
			const [message, renameWorkflowTo] = resolved;
			return await Promise.resolve({ kind: 'followUp', message, renameWorkflowTo });
		}),
	});

	return { renames, messagesSent, warnings, infos };
}

describe('proxy-driven external rename in runMultiTurnConversation', () => {
	it('renames the last saved workflow when the proxy asks for it', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			followUps: [['keep going', 'Renamed in another tab'], null],
		});

		expect(renames).toEqual([{ workflowId: 'wf-first', name: 'Renamed in another tab' }]);
	});

	it('reports a successful rename at info, so its absence is a readable signal', async () => {
		// The failure that matters most — a direction that stops setting
		// renameWorkflowTo — never reaches applyExternalRename and so cannot log
		// anything itself. Printing the success in a normal (non-verbose) run is
		// what makes a missing line mean something.
		const { infos } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			followUps: [['keep going', 'Renamed in another tab'], null],
		});

		expect(infos.some((m) => m.includes('[external-edit] Renamed wf-first'))).toBe(true);
	});

	it('does nothing on a turn the proxy did not ask for a rename', async () => {
		const { renames, messagesSent } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			followUps: ['just talking', null],
		});

		expect(renames).toHaveLength(0);
		expect(messagesSent).toEqual(['just talking']);
	});

	it('does not rename on the boundary that ends the conversation', async () => {
		const { renames } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			// The proxy ends the conversation at the first boundary, so the agent would
			// never get a turn to react to the edit.
			followUps: [null],
		});

		expect(renames).toHaveLength(0);
	});

	it('targets the most recently saved workflow', async () => {
		const events = [...runLifecycleEvents(), buildEvent('wf-first')];

		const { renames } = await runLoop({
			events,
			followUps: [
				// The agent builds a second workflow during this turn; the rename on the
				// NEXT boundary must land on that one, not the first.
				() => {
					events.push(buildEvent('wf-second'));
					return 'keep going';
				},
				['and again', 'Renamed in another tab'],
				null,
			],
		});

		expect(renames).toEqual([{ workflowId: 'wf-second', name: 'Renamed in another tab' }]);
	});

	it('follows save order, not first-seen order, when a workflow is re-saved', async () => {
		// A, then B, then A again. Deduping to distinct ids keeps FIRST-seen order,
		// so the list is [A, B] and its last element is B — while the workflow most
		// recently written is A. Renaming B here would conflict a workflow the agent
		// is no longer working on, and leave the one it IS working on untouched.
		const events = [...runLifecycleEvents(), buildEvent('wf-a')];

		const { renames } = await runLoop({
			events,
			followUps: [
				() => {
					events.push(buildEvent('wf-b'));
					return 'keep going';
				},
				() => {
					events.push(buildEvent('wf-a'));
					return 'and again';
				},
				['now rename', 'Renamed in another tab'],
				null,
			],
		});

		expect(renames).toEqual([{ workflowId: 'wf-a', name: 'Renamed in another tab' }]);
	});

	it('ignores a failed build — it reports a workflowId but saved nothing', async () => {
		const { renames, warnings } = await runLoop({
			events: [...runLifecycleEvents(), failedBuildEvent('wf-never-saved')],
			followUps: [['keep going', 'Should not be applied'], null],
		});

		// Renaming here would mutate a workflow this run never created — an
		// attached or pre-existing one the agent merely tried to save to.
		expect(renames).toHaveLength(0);
		expect(warnings.some((w) => w.includes('saved no workflow yet'))).toBe(true);
	});

	it('skips the rename when the workflow already carries that name', async () => {
		const { renames, warnings } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			currentName: 'Renamed in another tab',
			// A repeat PATCH would advance the checksum again and re-conflict a save
			// the agent may already have recovered from.
			followUps: [['keep going', 'Renamed in another tab'], null],
		});

		expect(renames).toHaveLength(0);
		expect(warnings.some((w) => w.includes('already named'))).toBe(true);
	});

	it('warns and keeps the conversation going when the rename fails', async () => {
		const { renames, messagesSent, warnings } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			followUps: [['still talking', 'Doomed rename'], null],
			updateShouldThrow: true,
		});

		expect(renames).toHaveLength(0);
		// The point of swallowing: the run continues so the case can grade recovery.
		expect(messagesSent).toEqual(['still talking']);
		// At warn, not verbose — a silent no-op reds the case as an agent failure.
		expect(warnings.some((w) => w.includes('Failed to rename'))).toBe(true);
	});

	it('warns and keeps going when the current name cannot be read', async () => {
		const { renames, messagesSent, warnings } = await runLoop({
			events: [...runLifecycleEvents(), buildEvent('wf-first')],
			followUps: [['still talking', 'Never applied'], null],
			getShouldThrow: true,
		});

		expect(renames).toHaveLength(0);
		expect(messagesSent).toEqual(['still talking']);
		expect(warnings.some((w) => w.includes('Failed to rename'))).toBe(true);
	});
});
