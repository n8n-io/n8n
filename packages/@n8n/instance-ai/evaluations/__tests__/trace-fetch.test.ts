// ---------------------------------------------------------------------------
// Tests for the LangSmith trace fetcher.
//
// We mock the LangSmith Client and feed it canned Run records via an async
// iterable. The fetcher's job is to (a) call listRuns with the right filter,
// (b) assemble a tree from parent_run_id pointers, (c) sort children by
// startTime, (d) degrade gracefully on errors.
// ---------------------------------------------------------------------------

import type { Client, Run } from 'langsmith';

import { fetchThreadTraces } from '../langsmith/trace-fetch';

// ---------------------------------------------------------------------------
// FakeClient
// ---------------------------------------------------------------------------

interface ListRunsCall {
	projectName?: string;
	filter?: string;
}

class FakeClient {
	readonly calls: ListRunsCall[] = [];
	private nextRuns: Run[] | Error = [];

	setNextRuns(runs: Run[] | Error): void {
		this.nextRuns = runs;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async *listRuns(args: ListRunsCall): AsyncIterable<Run> {
		this.calls.push(args);
		if (this.nextRuns instanceof Error) throw this.nextRuns;
		for (const run of this.nextRuns) yield run;
	}
}

function makeRun(partial: Partial<Run> & { id: string; name: string }): Run {
	const defaultExtra = { metadata: { thread_id: 'eval-test-thread' } };
	return {
		id: partial.id,
		name: partial.name,
		run_type: partial.run_type ?? 'chain',
		start_time: partial.start_time ?? new Date(1700000000000).toISOString(),
		end_time: partial.end_time ?? new Date(1700000001000).toISOString(),
		parent_run_id: partial.parent_run_id ?? null,
		trace_id: partial.trace_id ?? partial.id,
		inputs: partial.inputs ?? null,
		outputs: partial.outputs ?? null,
		error: partial.error ?? null,
		extra: partial.extra ?? defaultExtra,
	} as unknown as Run;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchThreadTraces', () => {
	it('returns an empty array when no runs match', async () => {
		const client = new FakeClient();
		client.setNextRuns([]);
		const trace = await fetchThreadTraces(client as unknown as Client, 'p-test', 'eval-thread-123');
		expect(trace).toEqual([]);
		expect(client.calls).toHaveLength(1);
		expect(client.calls[0].projectName).toBe('p-test');
		expect(client.calls[0].filter).toBe(
			'and(eq(metadata_key, "thread_id"), eq(metadata_value, "eval-thread-123"))',
		);
	});

	it('propagates LangSmith client errors so callers can log and degrade', async () => {
		const client = new FakeClient();
		client.setNextRuns(new Error('LangSmith down'));
		await expect(
			fetchThreadTraces(client as unknown as Client, 'p-test', 'eval-thread-123'),
		).rejects.toThrow('LangSmith down');
	});

	it('escapes double-quotes in the thread id', async () => {
		const client = new FakeClient();
		client.setNextRuns([]);
		await fetchThreadTraces(client as unknown as Client, 'p-test', 'eval-thread"with"quotes');
		expect(client.calls[0].filter).toBe(
			'and(eq(metadata_key, "thread_id"), eq(metadata_value, "eval-thread\\"with\\"quotes"))',
		);
	});

	it('assembles a tree from parent_run_id pointers', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			makeRun({
				id: 'root',
				name: 'orchestrator',
				start_time: new Date(1700000000000).toISOString(),
			}),
			makeRun({
				id: 'child1',
				name: 'tool-call-1',
				parent_run_id: 'root',
				run_type: 'tool',
				start_time: new Date(1700000000500).toISOString(),
			}),
			makeRun({
				id: 'child2',
				name: 'tool-call-2',
				parent_run_id: 'root',
				run_type: 'tool',
				start_time: new Date(1700000000200).toISOString(),
			}),
			makeRun({
				id: 'grandchild',
				name: 'llm-call',
				parent_run_id: 'child1',
				run_type: 'llm',
				start_time: new Date(1700000000600).toISOString(),
			}),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-test-thread');
		expect(trace).toHaveLength(1);
		const root = trace[0];
		expect(root.id).toBe('root');
		expect(root.name).toBe('orchestrator');
		expect(root.children).toHaveLength(2);
		// Children sorted by startTime → child2 (earlier) then child1 (later)
		expect(root.children[0].id).toBe('child2');
		expect(root.children[1].id).toBe('child1');
		expect(root.children[1].children).toHaveLength(1);
		expect(root.children[1].children[0].id).toBe('grandchild');
		expect(root.children[1].children[0].runType).toBe('llm');
	});

	it('treats orphan runs (parent missing from set) as additional roots', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			makeRun({ id: 'r1', name: 'root-1' }),
			// child whose parent isn't in the result set
			makeRun({ id: 'r2', name: 'orphan', parent_run_id: 'unknown-parent' }),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-test-thread');
		expect(trace).toHaveLength(2);
		const ids = trace.map((t) => t.id).sort();
		expect(ids).toEqual(['r1', 'r2']);
	});

	it('extracts token usage from outputs.usage', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			makeRun({
				id: 'llm1',
				name: 'anthropic.messages',
				run_type: 'llm',
				outputs: {
					usage: { input_tokens: 1500, output_tokens: 300, total_tokens: 1800 },
				},
			}),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-test-thread');
		expect(trace[0].tokenUsage).toEqual({ input: 1500, output: 300, total: 1800 });
	});

	it('computes durationMs from start/end timestamps', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			makeRun({
				id: 'r1',
				name: 'r1',
				start_time: new Date(1700000000000).toISOString(),
				end_time: new Date(1700000005000).toISOString(),
			}),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-test-thread');
		expect(trace[0].durationMs).toBe(5000);
	});

	it('captures metadata when present in extra', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			makeRun({
				id: 'r1',
				name: 'r1',
				extra: { metadata: { thread_id: 'eval-t1', model: 'some-model' } },
			}),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-t1');
		expect(trace[0].metadata).toEqual({ thread_id: 'eval-t1', model: 'some-model' });
	});

	// -------------------------------------------------------------------------
	// Safeguards against pulling production traces
	// -------------------------------------------------------------------------

	it('refuses to fetch when threadId does not start with eval- prefix', async () => {
		const client = new FakeClient();
		client.setNextRuns([makeRun({ id: 'r1', name: 'should-never-see' })]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'prod-thread-123');
		expect(trace).toEqual([]);
		expect(client.calls).toHaveLength(0); // no API call made
	});

	it('refuses to fetch when threadId is empty', async () => {
		const client = new FakeClient();
		client.setNextRuns([makeRun({ id: 'r1', name: 'should-never-see' })]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', '');
		expect(trace).toEqual([]);
		expect(client.calls).toHaveLength(0);
	});

	it('filters out runs whose metadata.thread_id does not start with eval-', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			// LangSmith returned a run with the right prefix — keep it
			makeRun({
				id: 'r-good',
				name: 'good-run',
				extra: { metadata: { thread_id: 'eval-test-thread' } },
			}),
			// LangSmith returned a run without the prefix (collision, misconfig,
			// LangSmith bug). Drop it as a safeguard.
			makeRun({
				id: 'r-leak',
				name: 'production-run',
				extra: { metadata: { thread_id: 'prod-user-thread' } },
			}),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-test-thread');
		expect(trace).toHaveLength(1);
		expect(trace[0].id).toBe('r-good');
	});

	it('returns empty when LangSmith returns only non-eval-prefixed runs', async () => {
		const client = new FakeClient();
		client.setNextRuns([
			makeRun({
				id: 'r-leak',
				name: 'production-run',
				extra: { metadata: { thread_id: 'prod-user-thread' } },
			}),
		]);

		const trace = await fetchThreadTraces(client as unknown as Client, 'p', 'eval-test-thread');
		expect(trace).toEqual([]);
	});
});
