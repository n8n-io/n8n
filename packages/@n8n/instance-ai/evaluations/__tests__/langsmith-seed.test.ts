import type { Client } from 'langsmith';
import { vi } from 'vitest';

// Stub the SDK parser so the reconstructor test doesn't depend on the real
// workflow-builder; we assert the build run is selected + compiled, not parsing.
vi.mock('../harness/parse-seed-workflow', () => ({
	parseSeedWorkflowCode: (code: string) => ({
		workflow: {
			name: 'Compiled WF',
			nodes: [{ id: 'n1', name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', __code: code }],
			connections: {},
		},
	}),
}));

import { configFor, reconstructSeedFromThread } from '../harness/langsmith-seed';

// Discovery test doubles return fixed, already-resolved workspace lists.
/* eslint-disable @typescript-eslint/promise-function-async */

interface FakeRun {
	id: string;
	run_type: 'chain' | 'tool';
	name: string;
	start_time: string;
	parent_run_id?: string;
	trace_id?: string;
	inputs?: Record<string, unknown>;
	outputs?: Record<string, unknown>;
	extra?: { metadata?: Record<string, unknown> };
}

/** Minimal stand-in for the LangSmith Client: yields a fixed run list. */
function fakeClient(runs: FakeRun[]) {
	return {
		// `for await` accepts a sync iterable, so a plain generator is enough.
		*listRuns(): Generator<FakeRun> {
			for (const run of runs) yield run;
		},
	} as unknown as Client;
}

const t = (s: number) => `2026-06-12T08:00:${String(s).padStart(2, '0')}.000Z`;

function turn(id: string, sec: number, message: string): FakeRun {
	return { id, run_type: 'chain', name: 'turn', start_time: t(sec), inputs: { message } };
}

/** A `tool` run (workspace edit, build, get-as-code) attached to root r1. */
function tool(
	id: string,
	sec: number,
	name: string,
	inputs: Record<string, unknown>,
	outputs: Record<string, unknown> = { success: true },
): FakeRun {
	return {
		id,
		run_type: 'tool',
		name,
		start_time: t(sec),
		inputs,
		outputs,
		extra: { metadata: { langsmith_root_run_id: 'r1' } },
	};
}

describe('reconstructSeedFromThread', () => {
	it('splits at the last user turn: seed = before, liveTurn = last', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build Otter Digest, daily 9am'), outputs: { response: 'Built it.' } },
			turn('r2', 30, 'Change the schedule to every 30 minutes instead.'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));

		expect(result.liveTurn).toBe('Change the schedule to every 30 minutes instead.');
		// Seed holds turn 1's user message + assistant response; the live turn is excluded.
		const roles = result.seed.messages.map((m) => m.role);
		expect(roles).toEqual(['user', 'assistant']);
		expect(result.seed.messages[0].content).toEqual([
			{ type: 'text', text: 'Build Otter Digest, daily 9am' },
		]);
	});

	it('pins the live turn to liveTurnRunId, seeding only the turns before the pin', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build Otter Digest, daily 9am'), outputs: { response: 'Built it.' } },
			{
				...turn('r2', 30, 'Change the schedule to every 30 minutes.'),
				outputs: { response: 'Done.' },
			},
			turn('r3', 60, 'Now add error handling'),
		];
		// Pin the MIDDLE turn: it becomes the live turn and the later real turn (r3) is discarded.
		const result = await reconstructSeedFromThread(
			{ threadId: 'th1', liveTurnRunId: 'r2' },
			fakeClient(runs),
		);

		expect(result.liveTurn).toBe('Change the schedule to every 30 minutes.');
		// Only turn 1 is seeded — the pinned turn and everything after it are excluded.
		const userTexts = result.seed.messages
			.filter((m) => m.role === 'user')
			.map((m) => (m.content as Array<{ text: string }>)[0].text);
		expect(userTexts).toEqual(['Build Otter Digest, daily 9am']);
	});

	it('falls back to the last user turn (with a warning) when liveTurnRunId matches no turn', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			turn('r2', 30, 'Change the schedule'),
		];
		const result = await reconstructSeedFromThread(
			{ threadId: 'th1', liveTurnRunId: 'no-such-run' },
			fakeClient(runs),
		);

		expect(result.liveTurn).toBe('Change the schedule'); // unchanged: the last user turn
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('not found among'));
		warn.mockRestore();
	});

	it('throws when liveTurnRunId pins the first user turn (no prior turn to seed)', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			turn('r2', 30, 'Change the schedule'),
		];
		await expect(
			reconstructSeedFromThread({ threadId: 'th1', liveTurnRunId: 'r1' }, fakeClient(runs)),
		).rejects.toThrow(/no prior turn to seed/);
	});

	it('rebuilds resolved tool-call blocks and compiles the seed workflow at the boundary', async () => {
		const buildTool: FakeRun = {
			id: 'tool1',
			run_type: 'tool',
			name: 'build-workflow',
			start_time: t(5),
			inputs: { code: 'workflow().addNode(...)' },
			outputs: { success: true, workflowId: 'WF-ORIGINAL-123', workflowName: 'Otter Digest' },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Done.' } },
			buildTool,
			turn('r2', 30, 'Now change the schedule'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));

		const assistant = result.seed.messages.find((m) => m.role === 'assistant')!;
		const toolBlock = (assistant.content as Array<Record<string, unknown>>).find(
			(b) => b.type === 'tool-call',
		);
		expect(toolBlock).toMatchObject({ toolName: 'build-workflow', state: 'resolved' });

		expect(result.seed.workflows).toHaveLength(1);
		expect(result.seed.workflows[0]).toMatchObject({ id: 'WF-ORIGINAL-123', name: 'Otter Digest' });
	});

	it('reconstructs data tables (schema only — never rows) created before the boundary', async () => {
		const createTable: FakeRun = {
			id: 'dt-create',
			run_type: 'tool',
			name: 'data-tables[create]',
			start_time: t(4),
			inputs: { action: 'create' },
			outputs: {
				table: {
					id: 's8srkfMDKYIAjEHR',
					name: 'Size Up Coffee FAQs',
					columns: [
						{ id: 'c1', name: 'keywords', type: 'string' },
						{ id: 'c2', name: 'is_active', type: 'boolean' },
					],
				},
			},
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		// An insert-rows run carrying real (PII) row content must be ignored — we
		// reconstruct the schema only, never the rows.
		const insertRows: FakeRun = {
			id: 'dt-insert',
			run_type: 'tool',
			name: 'data-tables[insert-rows]',
			start_time: t(5),
			inputs: {
				action: 'insert-rows',
				dataTableId: 's8srkfMDKYIAjEHR',
				rows: [{ keywords: 'price', is_active: true }],
			},
			outputs: { insertedCount: 1 },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build a FAQ bot'), outputs: { response: 'Done.' } },
			createTable,
			insertRows,
			turn('r2', 30, 'Now change something'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));

		expect(result.seed.dataTables).toEqual([
			{
				id: 's8srkfMDKYIAjEHR',
				name: 'Size Up Coffee FAQs',
				columns: [
					{ name: 'keywords', type: 'string' },
					{ name: 'is_active', type: 'boolean' },
				],
			},
		]);

		// The insert-rows tool-call survives in the seeded message history, but its
		// row values must be redacted there too — the messages are written to the
		// eval instance and shown to the judge.
		const assistant = result.seed.messages.find((m) => m.role === 'assistant')!;
		const insertBlock = (assistant.content as Array<Record<string, unknown>>).find(
			(b) => b.toolName === 'data-tables[insert-rows]',
		)!;
		expect((insertBlock.input as Record<string, unknown>).rows).toBe('<1 row(s) omitted>');
		// Non-row fields are preserved.
		expect((insertBlock.input as Record<string, unknown>).dataTableId).toBe('s8srkfMDKYIAjEHR');
	});

	it('takes the latest successful build per workflow id before the boundary', async () => {
		const earlyBuild: FakeRun = {
			id: 'tool1',
			run_type: 'tool',
			name: 'build-workflow',
			start_time: t(5),
			inputs: { code: 'v1' },
			outputs: { success: true, workflowId: 'WF1' },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const lateBuild: FakeRun = {
			id: 'tool2',
			run_type: 'tool',
			name: 'patch-workflow',
			start_time: t(8),
			inputs: { code: 'v2' },
			outputs: { success: true, workflowId: 'WF1' },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const runs: FakeRun[] = [
			turn('r1', 1, 'Build'),
			earlyBuild,
			lateBuild,
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));

		expect(result.seed.workflows).toHaveLength(1);
		// v2 (the later patch) wins — its code reaches the compiled node.
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'v2' });
	});

	it('ignores builds at or after the boundary (the dropped live response)', async () => {
		const postBoundaryBuild: FakeRun = {
			id: 'tool9',
			run_type: 'tool',
			name: 'build-workflow',
			start_time: t(31),
			inputs: { code: 'post' },
			outputs: { success: true, workflowId: 'WF-LIVE' },
			extra: { metadata: { langsmith_root_run_id: 'r2' } },
		};
		const runs: FakeRun[] = [turn('r1', 1, 'Build'), turn('r2', 30, 'Change'), postBoundaryBuild];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(0);
	});

	it('throws when the trace has fewer than two user turns', async () => {
		const runs: FakeRun[] = [turn('r1', 1, 'Only one user turn')];
		await expect(reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs))).rejects.toThrow(
			/no prior turn to seed/,
		);
	});

	it('throws a retention-aware error when no runs are found', async () => {
		await expect(reconstructSeedFromThread({ threadId: 'gone' }, fakeClient([]))).rejects.toThrow(
			/aged out/,
		);
	});

	it('throws when a renamed build tool produced a workflow we did not recognize', async () => {
		// SDK code in + workflowId out + success = unmistakably a build, but the
		// tool name isn't in the known set → drift detector fires.
		const renamedBuild: FakeRun = {
			id: 'tool1',
			run_type: 'tool',
			name: 'compose-workflow', // not in WORKFLOW_BUILD_TOOLS
			start_time: t(5),
			inputs: { code: 'workflow()...' },
			outputs: { success: true, workflowId: 'WF1' },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Done.' } },
			renamedBuild,
			turn('r2', 30, 'Change'),
		];
		await expect(reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs))).rejects.toThrow(
			/likely renamed/,
		);
	});

	it('throws when builds succeeded but no source was recoverable (shape drift)', async () => {
		// A recognised filePath build (post-#32545) whose workspace file was never
		// captured and has no get-as-code fallback → nothing to reconstruct from.
		const build: FakeRun = {
			id: 'tool1',
			run_type: 'tool',
			name: 'build-workflow',
			start_time: t(5),
			inputs: { filePath: 'src/workflows/main.workflow.ts' },
			outputs: { success: true, workflowId: 'WF1' },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Done.' } },
			build,
			turn('r2', 30, 'Change'),
		];
		await expect(reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs))).rejects.toThrow(
			/built in the trace but reconstruction recovered 0/,
		);
	});

	it('does not false-positive on a read-only tool that returns a workflowId', async () => {
		// get-workflow returns a workflowId but takes no `code` — not build-like,
		// so the drift detector stays quiet and the seed simply has no workflow.
		const readOnly: FakeRun = {
			id: 'tool1',
			run_type: 'tool',
			name: 'get-workflow',
			start_time: t(5),
			inputs: { workflowId: 'WF1' },
			outputs: { success: true, workflowId: 'WF1' },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Look at it'), outputs: { response: 'Here.' } },
			readOnly,
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(0);
	});

	it('skips internal resume turns when finding the split point', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Done.' } },
			turn('r2', 20, '<workflow-setup-required>'), // internal, not a user turn
			turn('r3', 30, 'Real follow-up'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.liveTurn).toBe('Real follow-up');
	});

	it('collapses an ask-user suspend+resume pair to one block carrying the answer', async () => {
		const questions = [{ id: 'q1', question: 'Which channel?', options: ['#a', '#b'] }];
		const suspend: FakeRun = {
			id: 'tool-suspend',
			run_type: 'tool',
			name: 'ask-user',
			start_time: t(3),
			inputs: { questions },
			// Suspend: a re-statement of the pending request, no answer.
			outputs: { payload: { inputType: 'questions', requestId: 'req1', questions } },
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const resume: FakeRun = {
			id: 'tool-resume',
			run_type: 'tool',
			name: 'ask-user',
			start_time: t(6),
			inputs: { questions },
			outputs: { answered: true, answers: [{ questionId: 'q1', selectedOptions: ['#a'] }] },
			extra: { metadata: { langsmith_root_run_id: 'r1', pending_tool_call_id: 'toolu_x' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Asking…' } },
			suspend,
			resume,
			turn('r2', 30, 'live turn'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));

		const askBlocks = result.seed.messages
			.filter((m) => Array.isArray(m.content))
			.flatMap((m) => m.content as Array<Record<string, unknown>>)
			.filter((b) => b.type === 'tool-call' && b.toolName === 'ask-user');
		expect(askBlocks).toHaveLength(1); // suspend dropped, resume kept — no duplication
		expect(askBlocks[0]).toMatchObject({
			output: { answers: [{ questionId: 'q1', selectedOptions: ['#a'] }] },
		});
	});

	it('collapses a setup-card suspend+resume pair to one block', async () => {
		const card = { requestId: 'req1', setupRequests: [{ node: { name: 'Slack' } }] };
		const suspend: FakeRun = {
			id: 'tool-setup-suspend',
			run_type: 'tool',
			name: 'workflows[setup]',
			start_time: t(3),
			inputs: { action: 'setup', workflowId: 'wf1' },
			outputs: { payload: card }, // HITL request envelope, no pending id → suspend half
			extra: { metadata: { langsmith_root_run_id: 'r1' } },
		};
		const resume: FakeRun = {
			id: 'tool-setup-resume',
			run_type: 'tool',
			name: 'workflows[setup]',
			start_time: t(6),
			inputs: { action: 'setup', workflowId: 'wf1' },
			outputs: { payload: card },
			extra: { metadata: { langsmith_root_run_id: 'r1', pending_tool_call_id: 'toolu_s' } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Setting up…' } },
			suspend,
			resume,
			turn('r2', 30, 'live turn'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		const setupBlocks = result.seed.messages
			.filter((m) => Array.isArray(m.content))
			.flatMap((m) => m.content as Array<Record<string, unknown>>)
			.filter((b) => b.type === 'tool-call' && b.toolName === 'workflows[setup]');
		expect(setupBlocks).toHaveLength(1); // suspend dropped, resume kept
	});

	it('keeps the answer when a suspend shares the toolCallId and comes after the resume', async () => {
		const questions = [{ id: 'q1', question: 'Which channel?', options: ['#a', '#b'] }];
		const tcid = 'toolu_shared';
		const resume: FakeRun = {
			id: 'tool-resume',
			run_type: 'tool',
			name: 'ask-user',
			start_time: t(4),
			inputs: { questions },
			outputs: { answered: true, answers: [{ questionId: 'q1', selectedOptions: ['#a'] }] },
			extra: { metadata: { langsmith_root_run_id: 'r1', pending_tool_call_id: tcid } },
		};
		// A later suspend re-statement with the SAME toolCallId must not overwrite
		// the resume's answer in the resolved-output map.
		const lateSuspend: FakeRun = {
			id: 'tool-suspend-late',
			run_type: 'tool',
			name: 'ask-user',
			start_time: t(7),
			inputs: { questions },
			outputs: { payload: { inputType: 'questions', requestId: 'req1', questions } },
			extra: { metadata: { langsmith_root_run_id: 'r1', pending_tool_call_id: tcid } },
		};
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Asking…' } },
			resume,
			lateSuspend,
			turn('r2', 30, 'live turn'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		const askBlocks = result.seed.messages
			.filter((m) => Array.isArray(m.content))
			.flatMap((m) => m.content as Array<Record<string, unknown>>)
			.filter((b) => b.type === 'tool-call' && b.toolName === 'ask-user');
		expect(askBlocks).toHaveLength(1);
		expect(askBlocks[0]).toMatchObject({
			output: { answers: [{ questionId: 'q1', selectedOptions: ['#a'] }] },
		});
	});
});

describe('reconstructSeedFromThread — filesystem-based builds (post-#32545)', () => {
	const FILE = 'src/workflows/main.workflow.ts';

	it('reconstructs a filePath build by replaying workspace file edits', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Building…' } },
			tool('w1', 2, 'workspace_write_file', { path: FILE, content: 'CODE_V1' }),
			tool('e1', 3, 'workspace_str_replace_file', {
				path: FILE,
				old_str: 'CODE_V1',
				new_str: 'CODE_V2',
			}),
			tool(
				'b1',
				4,
				'build-workflow',
				{ filePath: FILE, name: 'Main' },
				{
					success: true,
					workflowId: 'WF1',
					workflowName: 'Main',
				},
			),
			turn('r2', 30, 'change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));

		expect(result.seed.workflows).toHaveLength(1);
		expect(result.seed.workflows[0]).toMatchObject({ id: 'WF1', name: 'Main' });
		// The edited file content (V2), not the initial write (V1), reaches the compiler.
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'CODE_V2' });
	});

	it('skips a failed edit so the replay matches the unchanged sandbox file', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: '…' } },
			tool('w1', 2, 'workspace_write_file', { path: FILE, content: 'GOOD' }),
			// A failed str-replace (e.g. non-unique anchor) left the real file unchanged.
			tool(
				'e1',
				3,
				'workspace_str_replace_file',
				{ path: FILE, old_str: 'GOOD', new_str: 'BAD' },
				{ success: false },
			),
			tool('b1', 4, 'build-workflow', { filePath: FILE }, { success: true, workflowId: 'WF1' }),
			turn('r2', 30, 'change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'GOOD' });
	});

	it('falls back to a get-as-code capture when a successful edit cannot be replayed', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: '…' } },
			// Authoritative source captured by get-as-code.
			tool(
				'g1',
				2,
				'workflows[get-as-code]',
				{ action: 'get-as-code', workflowId: 'WF1' },
				{
					workflowId: 'WF1',
					name: 'Main',
					code: 'FROM_GET_AS_CODE',
				},
			),
			tool('w1', 3, 'workspace_write_file', { path: FILE, content: 'CODE_V1' }),
			// A *successful* edit whose anchor is absent in our replay → divergence
			// (mimics an untracked shell edit having changed the file first).
			tool('e1', 4, 'workspace_str_replace_file', {
				path: FILE,
				old_str: 'NOT_IN_REPLAY',
				new_str: 'X',
			}),
			tool('b1', 5, 'build-workflow', { filePath: FILE }, { success: true, workflowId: 'WF1' }),
			turn('r2', 30, 'change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(1);
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'FROM_GET_AS_CODE' });
	});

	it('emits a workflow only for built files, ignoring other written files', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: '…' } },
			tool('kb', 2, 'workspace_write_file', {
				path: 'knowledge-base/notes.md',
				content: 'scratch',
			}),
			tool('w1', 3, 'workspace_write_file', { path: FILE, content: 'REAL' }),
			tool('b1', 4, 'build-workflow', { filePath: FILE }, { success: true, workflowId: 'WF1' }),
			turn('r2', 30, 'change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		// Only the built file becomes a workflow; the scratch write is ignored.
		expect(result.seed.workflows).toHaveLength(1);
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'REAL' });
	});

	it('applies a batch str-replace atomically: any missing anchor leaves the file untouched', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: '…' } },
			tool('w1', 2, 'workspace_write_file', { path: FILE, content: 'CODE_V1' }),
			// One anchor matches, one is absent. The real tool is atomic (all-or-nothing),
			// so the file must stay CODE_V1 — never a half-applied 'GOOD'.
			tool('e1', 3, 'workspace_batch_str_replace_file', {
				path: FILE,
				replacements: [
					{ old_str: 'CODE_V1', new_str: 'GOOD' },
					{ old_str: 'NOT_PRESENT', new_str: 'Y' },
				],
			}),
			tool('b1', 4, 'build-workflow', { filePath: FILE }, { success: true, workflowId: 'WF1' }),
			turn('r2', 30, 'change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'CODE_V1' });
	});
});

describe('reconstructSeedFromThread — workflow deletes', () => {
	it('excludes a workflow deleted before the boundary and not rebuilt', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			tool('b1', 4, 'build-workflow', { code: 'v1' }, { success: true, workflowId: 'WF1' }),
			// The user said "delete everything" → the entity is removed and never rebuilt,
			// so it must not be restored into the seed.
			tool('d1', 6, 'workflows[delete]', { action: 'delete', workflowId: 'WF1' }),
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(0);
	});

	it('keeps a workflow rebuilt after an earlier delete (latest build wins)', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			tool('b1', 3, 'build-workflow', { code: 'v1' }, { success: true, workflowId: 'WF1' }),
			tool('d1', 5, 'workflows[delete]', { action: 'delete', workflowId: 'WF1' }),
			tool('b2', 7, 'build-workflow', { code: 'v2' }, { success: true, workflowId: 'WF1' }),
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(1);
		expect(result.seed.workflows[0].nodes[0]).toMatchObject({ __code: 'v2' });
	});

	it('ignores a failed delete — the workflow stays in the seed', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			tool('b1', 3, 'build-workflow', { code: 'v1' }, { success: true, workflowId: 'WF1' }),
			tool(
				'd1',
				5,
				'workflows[delete]',
				{ action: 'delete', workflowId: 'WF1' },
				{ success: false },
			),
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(1);
	});

	it('keeps a workflow when the delete only suspended for confirmation (no success)', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			tool('b1', 3, 'build-workflow', { code: 'v1' }, { success: true, workflowId: 'WF1' }),
			// HITL: the delete suspended awaiting confirmation; its output is the confirmation
			// request (no success field), not a completed delete — the workflow still exists.
			tool(
				'd1',
				5,
				'workflows[delete]',
				{ action: 'delete', workflowId: 'WF1' },
				{ requestId: 'req-1', message: 'Archive WF1', severity: 'warning' },
			),
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(1);
	});

	it('ignores a delete-shaped input from a non-workflows tool', async () => {
		const runs: FakeRun[] = [
			{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
			tool('b1', 3, 'build-workflow', { code: 'v1' }, { success: true, workflowId: 'WF1' }),
			// Same delete-shaped input + success as a real workflow delete, but a different
			// tool — the match is gated to `workflows`, so it must not evict the seed workflow.
			tool('d1', 5, 'data-tables[delete-rows]', { action: 'delete', workflowId: 'WF1' }),
			turn('r2', 30, 'Change'),
		];
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, fakeClient(runs));
		expect(result.seed.workflows).toHaveLength(1);
	});
});

describe('reconstructSeedFromThread — workspace auto-discovery', () => {
	const seedableRuns: FakeRun[] = [
		{ ...turn('r1', 1, 'Build it'), outputs: { response: 'Built.' } },
		turn('r2', 30, 'Change the schedule'),
	];

	const twoWorkspaces = [
		{ id: 'staging-id', name: 'Staging' },
		{ id: 'prod-id', name: 'Prod' },
	];

	it('finds the thread in whichever workspace holds it and tags the source', async () => {
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, undefined, {
			listWorkspaces: () => Promise.resolve(twoWorkspaces),
			// Only Prod has the thread; Staging is empty.
			clientForWorkspace: (id: string) => fakeClient(id === 'prod-id' ? seedableRuns : []),
			ambientClient: () => fakeClient([]),
		});
		expect(result.sourceWorkspace).toBe('Prod');
		expect(result.liveTurn).toBe('Change the schedule');
	});

	it('falls back to the ambient client when no workspaces can be listed', async () => {
		const result = await reconstructSeedFromThread({ threadId: 'th1' }, undefined, {
			listWorkspaces: () => Promise.resolve([]),
			clientForWorkspace: () => fakeClient([]),
			ambientClient: () => fakeClient(seedableRuns),
		});
		expect(result.liveTurn).toBe('Change the schedule');
		expect(result.sourceWorkspace).toBeUndefined();
	});

	it('throws listing the workspaces tried when the thread is in none', async () => {
		await expect(
			reconstructSeedFromThread({ threadId: 'gone' }, undefined, {
				listWorkspaces: () => Promise.resolve(twoWorkspaces),
				clientForWorkspace: () => fakeClient([]),
				ambientClient: () => fakeClient([]),
			}),
		).rejects.toThrow(/not found in project .* across 2 workspace\(s\): Staging, Prod/);
	});

	it('propagates a found-but-not-seedable error instead of trying the next workspace', async () => {
		const oneTurn: FakeRun[] = [turn('r1', 1, 'Only one user turn')];
		await expect(
			reconstructSeedFromThread({ threadId: 'th1' }, undefined, {
				// Staging HAS the thread but it isn't seedable (<2 turns) — must not
				// be masked by trying Prod.
				listWorkspaces: () => Promise.resolve(twoWorkspaces),
				clientForWorkspace: (id: string) =>
					fakeClient(id === 'staging-id' ? oneTurn : seedableRuns),
				ambientClient: () => fakeClient([]),
			}),
		).rejects.toThrow(/no prior turn to seed/);
	});
});

// Dual-tenant READS (US→EU migration): a seed ref's `endpoint` selects which
// LangSmith tenant to read from. Writes are unaffected (they stay on the home
// tenant elsewhere). The endpoint→key mapping is the cross-repo contract that
// LangTracer's exported `seedThread.endpoint` rides on (TRUST-212).
describe('configFor — dual-tenant read resolution', () => {
	const EU = 'https://eu.api.smith.langchain.com';
	const US = 'https://api.smith.langchain.com';

	beforeEach(() => {
		vi.stubEnv('LANGSMITH_ENDPOINT', EU);
		vi.stubEnv('LANGSMITH_API_KEY', 'eu-key');
		vi.stubEnv('LANGSMITH_ENDPOINT_US', US);
		vi.stubEnv('LANGSMITH_API_KEY_US', 'us-key');
	});
	afterEach(() => vi.unstubAllEnvs());

	it('resolves an omitted endpoint to the home (EU) host + key', () => {
		expect(configFor()).toEqual({ apiUrl: EU, apiKey: 'eu-key' });
	});

	it('resolves the home endpoint to the home key', () => {
		expect(configFor(EU)).toEqual({ apiUrl: EU, apiKey: 'eu-key' });
	});

	it('resolves the US endpoint to the US key — never the home key', () => {
		expect(configFor(US)).toEqual({ apiUrl: US, apiKey: 'us-key' });
	});

	it('tolerates a trailing slash and an /api/v1 suffix on the endpoint', () => {
		expect(configFor(`${US}/`)).toEqual({ apiUrl: US, apiKey: 'us-key' });
		expect(configFor(`${EU}/api/v1`)).toEqual({ apiUrl: EU, apiKey: 'eu-key' });
	});

	it('throws (does NOT fall back to the home key) when the US key is missing', () => {
		vi.stubEnv('LANGSMITH_API_KEY_US', '');
		expect(() => configFor(US)).toThrow(/LANGSMITH_API_KEY_US is not set/);
	});

	it('throws on an endpoint that matches no configured tenant', () => {
		expect(() => configFor('https://made-up.smith.langchain.com')).toThrow(
			/no configured LangSmith tenant/,
		);
	});

	it('routes a US-endpoint ref through the US resolver (no silent home fallback)', async () => {
		// End-to-end: the endpoint flows ref → discoveryDepsFor(ref.endpoint) →
		// configFor, so a missing US key fails loudly instead of querying EU.
		vi.stubEnv('LANGSMITH_API_KEY_US', '');
		await expect(reconstructSeedFromThread({ threadId: 't1', endpoint: US })).rejects.toThrow(
			/LANGSMITH_API_KEY_US is not set/,
		);
	});
});
