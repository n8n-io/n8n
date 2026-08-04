import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import type { ConversationSeed } from '../harness/conversation-seed';
import type { EvalLogger } from '../harness/logger';

// Stubbed as in build-workflow-seed-cleanup: only the restore call matters here.
vi.mock('../harness/chat-loop', () => ({
	SSE_SETTLE_DELAY_MS: 0,
	startSseConnection: vi.fn().mockResolvedValue(undefined),
	waitForAllActivity: vi.fn().mockResolvedValue(undefined),
	runMultiTurnConversation: vi.fn().mockResolvedValue(undefined),
	recordUserTurn: vi.fn(),
}));

vi.mock('../outcome/workflow-discovery', () => ({
	buildAgentOutcome: vi.fn().mockResolvedValue({
		workflowsCreated: [{ id: 'built-wf-1', name: 'Built', nodeCount: 3, active: false }],
		executionsRun: [],
		dataTablesCreated: [],
		finalText: 'done',
		workflowJsons: [{ id: 'built-wf-1', name: 'Built', nodes: [], connections: {} }],
	}),
	extractWorkflowIdsFromMessages: vi.fn().mockReturnValue([]),
}));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const SEED_WF_ID = 'wKk3RmT9xQ2bVn7L';

function inlineSeed(): ConversationSeed {
	return {
		messages: [
			{
				id: 'seed-1',
				type: 'llm',
				role: 'assistant',
				createdAt: '2026-06-29T09:00:01.000Z',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						state: 'resolved',
						input: {},
						output: { success: true, workflowId: SEED_WF_ID },
					},
				],
			},
		],
		workflows: [{ id: SEED_WF_ID, name: 'Batch loop', nodes: [], connections: {} }],
		dataTables: [],
	};
}

function makeClient(
	restoreThread: ReturnType<typeof vi.fn>,
	overrides: Partial<Record<'listWorkflows' | 'deleteWorkflow', ReturnType<typeof vi.fn>>> = {},
): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage: vi.fn().mockResolvedValue(undefined),
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		listWorkflows: overrides.listWorkflows ?? vi.fn().mockResolvedValue([]),
		deleteWorkflow: overrides.deleteWorkflow ?? vi.fn().mockResolvedValue(undefined),
		restoreThread,
	} as unknown as N8nClient;
}

const baseConfig = {
	conversation: [{ role: 'user' as const, text: 'the loop never runs twice — fix it' }],
	outcomeExpectations: ['the processing branch hangs off the loop output'],
	skipWorkflowChecks: true,
	preRunWorkflowIds: new Set<string>(),
	claimedWorkflowIds: new Set<string>(),
	logger: silentLogger,
};

describe('buildWorkflow with an inline seed', () => {
	it('restores the inline seed before the live turn', async () => {
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 1, workflowIds: ['restored-wf-1'], dataTableIds: [] });

		const build = await buildWorkflow({
			client: makeClient(restoreThread),
			...baseConfig,
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(build.success).toBe(true);
		expect(restoreThread).toHaveBeenCalledTimes(1);
		const [, messages, workflows] = restoreThread.mock.calls[0] as [
			string,
			Array<Record<string, unknown>>,
			Array<{ id: string }>,
		];
		expect(messages).toHaveLength(1);
		expect(workflows).toHaveLength(1);
		// Remapped to a fresh id so parallel iterations can't share one row.
		const newId = workflows[0].id;
		expect(newId).not.toBe(SEED_WF_ID);
		expect(JSON.stringify(messages)).toContain(newId);
		expect(JSON.stringify(messages)).not.toContain(SEED_WF_ID);
	});

	it('fails as a seeding problem when the restore fails — never runs unseeded', async () => {
		const restoreThread = vi.fn().mockRejectedValue(new Error('restore rejected'));

		const build = await buildWorkflow({
			client: makeClient(restoreThread),
			...baseConfig,
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(build.success).toBe(false);
		expect(build.seedingFailed).toBe(true);
	});

	// A leftover copy sharing the seed's name is a workflow the agent can
	// rationally ground on instead of its own, which grades a different artifact than
	// the agent edited — false greens as readily as false reds.
	it('evicts a leftover seed workflow with the same base name before restoring', async () => {
		const deleteWorkflow = vi.fn().mockResolvedValue(undefined);
		const listWorkflows = vi.fn().mockResolvedValue([
			{ id: 'leftover-1', name: 'Batch loop [seed aaaaaaaa]' },
			{ id: 'leftover-2', name: 'Batch loop [seed bbbbbbbb]' },
		]);
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 1, workflowIds: ['restored-wf-1'], dataTableIds: [] });

		await buildWorkflow({
			client: makeClient(restoreThread, { listWorkflows, deleteWorkflow }),
			...baseConfig,
			// Both were on the instance before this lane started — that is what makes
			// them leftovers rather than another live build's artifact.
			preRunWorkflowIds: new Set(['leftover-1', 'leftover-2']),
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(deleteWorkflow.mock.calls.map((call) => String(call[0]))).toEqual([
			'leftover-1',
			'leftover-2',
		]);
		// Eviction happens BEFORE the restore, or it would delete this run's own copy.
		expect(deleteWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
			restoreThread.mock.invocationCallOrder[0],
		);
	});

	// A lane admits several case slugs at once, and it is released before scenario
	// execution finishes — so a sibling case sharing this seed's base name is live,
	// not stale. Hard-deleting its workflow mid-run is worse than the collision.
	it('never evicts a workflow created during the run — a sibling build is live', async () => {
		const deleteWorkflow = vi.fn().mockResolvedValue(undefined);
		const listWorkflows = vi.fn().mockResolvedValue([
			{ id: 'stale-from-a-previous-run', name: 'Batch loop [seed aaaaaaaa]' },
			// Same base name, same suffix shape — but created after the lane snapshot,
			// so it belongs to a build that is still using it.
			{ id: 'sibling-live-restore', name: 'Batch loop [seed cccccccc]' },
		]);

		await buildWorkflow({
			client: makeClient(
				vi.fn().mockResolvedValue({ restored: 1, workflowIds: [], dataTableIds: [] }),
				{ listWorkflows, deleteWorkflow },
			),
			...baseConfig,
			preRunWorkflowIds: new Set(['stale-from-a-previous-run']),
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(deleteWorkflow.mock.calls.map((call) => String(call[0]))).toEqual([
			'stale-from-a-previous-run',
		]);
	});

	it('never touches a workflow without the seed suffix', async () => {
		// The suffix is minted only by the remap, so a real workflow — and anything the
		// agent itself built — is out of reach even when the name matches.
		const deleteWorkflow = vi.fn().mockResolvedValue(undefined);
		const listWorkflows = vi.fn().mockResolvedValue([
			{ id: 'real-1', name: 'Batch loop' },
			{ id: 'agent-built', name: 'Batch loop (copy)' },
			{ id: 'other-seed', name: 'Something else [seed cccccccc]' },
		]);

		await buildWorkflow({
			client: makeClient(
				vi.fn().mockResolvedValue({ restored: 1, workflowIds: [], dataTableIds: [] }),
				{ listWorkflows, deleteWorkflow },
			),
			...baseConfig,
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(deleteWorkflow).not.toHaveBeenCalled();
	});

	it('still builds when eviction fails — it is best-effort, not a gate', async () => {
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 1, workflowIds: ['restored-wf-1'], dataTableIds: [] });

		const build = await buildWorkflow({
			client: makeClient(restoreThread, {
				listWorkflows: vi.fn().mockRejectedValue(new Error('list exploded')),
			}),
			...baseConfig,
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(build.success).toBe(true);
		expect(restoreThread).toHaveBeenCalledTimes(1);
	});

	// One undeletable leftover must not shield the rest: whatever survives stays
	// selectable by name, which is the collision eviction exists to prevent.
	it('keeps evicting the remaining leftovers after one delete fails', async () => {
		const deleteWorkflow = vi.fn(
			async (id: string) =>
				await (id === 'leftover-1'
					? Promise.reject(new Error('archive failed'))
					: Promise.resolve()),
		);
		const listWorkflows = vi.fn().mockResolvedValue([
			{ id: 'leftover-1', name: 'Batch loop [seed aaaaaaaa]' },
			{ id: 'leftover-2', name: 'Batch loop [seed bbbbbbbb]' },
			{ id: 'leftover-3', name: 'Batch loop [seed cccccccc]' },
		]);
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 1, workflowIds: ['restored-wf-1'], dataTableIds: [] });

		const build = await buildWorkflow({
			client: makeClient(restoreThread, { listWorkflows, deleteWorkflow }),
			...baseConfig,
			preRunWorkflowIds: new Set(['leftover-1', 'leftover-2', 'leftover-3']),
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(deleteWorkflow.mock.calls.map((call) => String(call[0]))).toEqual([
			'leftover-1',
			'leftover-2',
			'leftover-3',
		]);
		expect(build.success).toBe(true);
	});

	it('does not restore anything for a case with no seed', async () => {
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 0, workflowIds: [], dataTableIds: [] });

		const build = await buildWorkflow({ client: makeClient(restoreThread), ...baseConfig });

		expect(build.success).toBe(true);
		expect(restoreThread).not.toHaveBeenCalled();
	});
});
