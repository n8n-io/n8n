import type { Client } from 'langsmith';
import { vi } from 'vitest';

// Stub the SDK parser so the reconstructor test doesn't depend on the real
// workflow-builder; we assert the build run is selected + compiled, not parsing.
vi.mock('../../src/workflow-builder/parse-validate', () => ({
	parseAndValidate: (code: string) => ({
		workflow: {
			name: 'Compiled WF',
			nodes: [{ id: 'n1', name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', __code: code }],
			connections: {},
		},
		warnings: [],
	}),
}));

import { reconstructSeedFromThread } from '../harness/langsmith-seed';

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
			/need ≥2 to seed/,
		);
	});

	it('throws a retention-aware error when no runs are found', async () => {
		await expect(reconstructSeedFromThread({ threadId: 'gone' }, fakeClient([]))).rejects.toThrow(
			/aged out/,
		);
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
});
