import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import { recordUserTurn } from '../harness/chat-loop';
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

// The proxy's real constructor builds an LLM agent; only the script it is handed
// matters here, so capture that and stub the rest (runMultiTurnConversation is
// mocked above, so no other method is reached).
const { proxyScripts } = vi.hoisted(() => ({
	proxyScripts: [] as Array<Array<{ text: string }>>,
}));

vi.mock('../utils/user-proxy', () => ({
	UserProxyLlm: class {
		constructor(config: { conversation: Array<{ text: string }> }) {
			proxyScripts.push(config.conversation);
		}
		respondToConfirmation = vi.fn().mockResolvedValue({ approve: true });
		ingestEvents = vi.fn();
		decideFollowUp = vi.fn().mockResolvedValue({ kind: 'done' });
		getDecisionStats = vi.fn().mockReturnValue({});
	},
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
		agents: [],
		projects: [],
	};
}

function makeClient(
	restoreThread: ReturnType<typeof vi.fn>,
	overrides: Partial<
		Record<'listWorkflows' | 'deleteWorkflow' | 'sendMessage', ReturnType<typeof vi.fn>>
	> = {},
): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage: overrides.sendMessage ?? vi.fn().mockResolvedValue(undefined),
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
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});

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
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});

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
				vi.fn().mockResolvedValue({ restored: 1, workflowIds: [], dataTableIds: [], agentIds: [] }),
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
				vi.fn().mockResolvedValue({ restored: 1, workflowIds: [], dataTableIds: [], agentIds: [] }),
				{ listWorkflows, deleteWorkflow },
			),
			...baseConfig,
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(deleteWorkflow).not.toHaveBeenCalled();
	});

	it('still builds when eviction fails — it is best-effort, not a gate', async () => {
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});

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
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});

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

	// The shape a real user creates by opening the assistant with a workflow in front
	// of them: the product hands the agent a resource reference, so it resolves by id
	// and never hunts by name.
	it('sends the attached seed workflow with the opening message, using the REMAPPED id', async () => {
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});
		await buildWorkflow({
			client: makeClient(restoreThread, { sendMessage }),
			...baseConfig,
			conversation: [
				{ role: 'user' as const, text: 'why is this failing?', attach: { workflow: SEED_WF_ID } },
			],
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		const [, , attachments] = sendMessage.mock.calls[0] as [
			string,
			string,
			Array<{ type: string; id: string; name: string }> | undefined,
		];
		expect(attachments).toHaveLength(1);
		expect(attachments?.[0].type).toBe('workflow');
		// The authored id is rewritten per run, so sending it verbatim would point the
		// agent at a workflow that doesn't exist on this instance.
		expect(attachments?.[0].id).not.toBe(SEED_WF_ID);
		const [, , workflows] = restoreThread.mock.calls[0] as [
			string,
			unknown,
			Array<{ id: string; name: string }>,
		];
		expect(attachments?.[0].id).toBe(workflows[0].id);
		expect(attachments?.[0].name).toBe(workflows[0].name);
	});

	// The API carries the attachment out of band, so the graded transcript would show a
	// faithful hand-off (`text: ''` + attach) as a bare empty message: an anomaly to the
	// judge, and an EMPTY prompt for the prompt-aware checks (userTurnsAsText drops
	// empty strings). The recorded turn names it instead.
	it('names the attached workflow in the RECORDED turn, so judges can see the hand-off', async () => {
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});
		vi.mocked(recordUserTurn).mockClear();

		await buildWorkflow({
			client: makeClient(restoreThread, { sendMessage }),
			...baseConfig,
			// No typed text — exactly the shape the docs promote.
			conversation: [{ role: 'user' as const, text: '', attach: { workflow: SEED_WF_ID } }],
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		const restoredWorkflows = (
			restoreThread.mock.calls[0] as [string, unknown, Array<{ id: string; name: string }>]
		)[2];
		const [, recordedText] = vi.mocked(recordUserTurn).mock.calls[0];
		const [, sentText] = sendMessage.mock.calls[0] as [string, string, unknown];

		// The RESTORED (per-run) name, not the authored one — that's what exists on the
		// instance and what the judge will see referenced.
		expect(recordedText).toBe(`[attached workflow: ${restoredWorkflows[0].name}]`);
		// The agent still gets the user's real (empty) text plus the attachment itself.
		expect(sentText).toBe('');
	});

	// The proxy renders its script and running transcript from `text` alone, so a
	// hand-off case with follow-ups would otherwise audit plans and decide follow-ups
	// against a blank opening turn that never mentions the workflow.
	it('names the attached workflow in the script the user proxy reads', async () => {
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});
		proxyScripts.length = 0;

		await buildWorkflow({
			client: makeClient(restoreThread),
			...baseConfig,
			conversation: [
				{ role: 'user' as const, text: '', attach: { workflow: SEED_WF_ID } },
				{ role: 'user' as const, text: 'now add error handling' },
			],
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		const restoredWorkflows = (
			restoreThread.mock.calls[0] as [string, unknown, Array<{ id: string; name: string }>]
		)[2];
		expect(proxyScripts[0][0].text).toBe(`[attached workflow: ${restoredWorkflows[0].name}]`);
		// Later turns are the author's own text, untouched.
		expect(proxyScripts[0][1].text).toBe('now add error handling');
	});

	it('fails loudly when the attached seed workflow is missing from the restore', async () => {
		// The schema refuses an `attach` the seed does not declare, so a miss here means
		// the restore/remap lost it. Running on would silently downgrade the case to a
		// find-it test and grade the wrong thing.
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 1,
			workflowIds: ['restored-wf-1'],
			dataTableIds: [],
			agentIds: [],
		});

		const result = await buildWorkflow({
			client: makeClient(restoreThread, { sendMessage: vi.fn().mockResolvedValue({ runId: 'r' }) }),
			...baseConfig,
			conversation: [
				{ role: 'user' as const, text: 'why?', attach: { workflow: 'never-declared' } },
			],
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/attaches seeded workflow "never-declared"/);
	});

	it('sends no attachments when the opening turn declares none', async () => {
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		await buildWorkflow({
			client: makeClient(
				vi.fn().mockResolvedValue({
					restored: 1,
					workflowIds: [],
					dataTableIds: [],
					agentIds: [],
				}),
				{ sendMessage },
			),
			...baseConfig,
			seed: { mode: 'inline' as const, ...inlineSeed() },
		});
		expect(sendMessage.mock.calls[0][2]).toBeUndefined();
	});

	it('does not restore anything for a case with no seed', async () => {
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 0, workflowIds: [], dataTableIds: [], agentIds: [] });

		const build = await buildWorkflow({ client: makeClient(restoreThread), ...baseConfig });

		expect(build.success).toBe(true);
		expect(restoreThread).not.toHaveBeenCalled();
	});
});

describe('buildWorkflow with scenario seed data tables', () => {
	const jobApplications = {
		id: 'job-applications-1234',
		name: 'Job Applications',
		columns: [{ name: 'application_id', type: 'string' as const }],
		rows: [{ application_id: 'row_001' }],
	};

	it('creates the table under a per-run name and tells the agent THAT name', async () => {
		// The name is project-unique, so a per-run suffix is what lets two iterations of
		// one case coexist. The agent binds by discovery, so it has to be told the real
		// name — sending the declared one would make it create a duplicate.
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 0, workflowIds: [], dataTableIds: ['dt-real-1'] });

		const build = await buildWorkflow({
			client: makeClient(restoreThread, { sendMessage }),
			...baseConfig,
			executionScenarios: [
				{
					name: 's1',
					description: 'd',
					dataSetup: 'setup',
					successCriteria: 'ok',
					seedDataTables: [jobApplications],
				},
			],
		});

		const [, , , dataTables] = restoreThread.mock.calls[0] as [
			string,
			unknown,
			unknown,
			Array<{ name: string; rows?: unknown }>,
		];
		const created = dataTables[0].name;
		expect(created).toMatch(/^Job Applications \[seed [0-9a-f]{8}\]$/);
		// Schema only before the build — rows are reseeded per scenario.
		expect(dataTables[0].rows).toBeUndefined();

		const [, sentText] = sendMessage.mock.calls[0] as [string, string];
		expect(sentText).toContain(created);

		// Keyed by the DECLARED name, which is what a scenario's seedDataTables writes.
		expect(build.seededScenarioTableIdsByName).toEqual({ 'Job Applications': 'dt-real-1' });
		// Tracked for cleanup by id, so the rename can't orphan it.
		expect(build.createdDataTableIds).toContain('dt-real-1');
	});
});
