// Fetch LangSmith conversation traces for an eval thread.
// Only returns runs whose `metadata.thread_id` starts with `eval-` —
// blocks any non-eval traffic from leaking into eval reports.

import type { Client, Run } from 'langsmith';

import type { TraceNode } from '../types';

export const EVAL_THREAD_PREFIX = 'eval-';

export async function fetchThreadTraces(
	client: Client,
	projectName: string,
	threadId: string,
): Promise<TraceNode[]> {
	if (!threadId.startsWith(EVAL_THREAD_PREFIX)) return [];
	try {
		const runs = await collectRuns(client, projectName, threadId);
		const filtered = runs.filter(hasEvalThreadId);
		return filtered.length > 0 ? assembleForest(filtered) : [];
	} catch {
		return [];
	}
}

function hasEvalThreadId(run: Run): boolean {
	const extra = isRecord(run.extra) ? run.extra : {};
	const metadata = isRecord(extra.metadata) ? extra.metadata : {};
	const tid = metadata.thread_id;
	return typeof tid === 'string' && tid.startsWith(EVAL_THREAD_PREFIX);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function collectRuns(client: Client, projectName: string, threadId: string): Promise<Run[]> {
	const out: Run[] = [];
	// LangSmith TQL: arbitrary metadata fields are filtered via the
	// metadata_key/metadata_value attribute pair. (eq(metadata.thread_id,...)
	// is rejected — those attributes are not in the promoted list.)
	const escaped = escapeFilterValue(threadId);
	const filter = `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${escaped}"))`;

	const iter = client.listRuns({ projectName, filter });
	for await (const run of iter) {
		out.push(run);
	}
	return out;
}

function escapeFilterValue(value: string): string {
	// Escape backslashes and double quotes for TQL string literals.
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Build a forest from a flat run list by linking each child to its parent. */
function assembleForest(runs: Run[]): TraceNode[] {
	const byId = new Map<string, TraceNode>();
	for (const run of runs) {
		byId.set(run.id, normalizeRun(run));
	}

	const roots: TraceNode[] = [];
	for (const node of byId.values()) {
		if (node.parentRunId && byId.has(node.parentRunId)) {
			byId.get(node.parentRunId)!.children.push(node);
		} else {
			// Either no parent, or parent not in this trace (which would be a
			// LangSmith oddity — treat as a root so we don't drop it).
			roots.push(node);
		}
	}

	// Sort by startTime at every level so the tree reads chronologically.
	const sortRecursive = (nodes: TraceNode[]) => {
		nodes.sort((a, b) => a.startTime - b.startTime);
		for (const n of nodes) sortRecursive(n.children);
	};
	sortRecursive(roots);

	return roots;
}

function normalizeRun(run: Run): TraceNode {
	const startMs = parseTimestamp(run.start_time);
	const endMs = parseTimestamp(run.end_time);
	const extra = isRecord(run.extra) ? run.extra : {};
	const metadata = isRecord(extra.metadata) ? extra.metadata : {};

	return {
		id: run.id,
		traceId: typeof run.trace_id === 'string' ? run.trace_id : run.id,
		parentRunId: typeof run.parent_run_id === 'string' ? run.parent_run_id : null,
		name: typeof run.name === 'string' ? run.name : '(unnamed)',
		runType: typeof run.run_type === 'string' ? run.run_type : 'unknown',
		startTime: startMs,
		endTime: endMs,
		durationMs: endMs !== null && startMs !== 0 ? endMs - startMs : null,
		error: typeof run.error === 'string' ? run.error : null,
		inputs: run.inputs ?? null,
		outputs: run.outputs ?? null,
		metadata,
		tokenUsage: extractTokenUsage(run),
		children: [],
	};
}

function parseTimestamp(value: unknown): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
	if (value instanceof Date) return value.getTime();
	return 0;
}

function extractTokenUsage(run: Run): TraceNode['tokenUsage'] {
	const usage = isRecord(run.outputs) ? run.outputs.usage : undefined;
	if (isRecord(usage)) {
		const input = numericOrUndefined(usage.input_tokens ?? usage.prompt_tokens);
		const output = numericOrUndefined(usage.output_tokens ?? usage.completion_tokens);
		const total = numericOrUndefined(usage.total_tokens);
		if (input !== undefined || output !== undefined || total !== undefined) {
			return { input, output, total };
		}
	}
	// Fall back to extra.usage if present
	const extra = isRecord(run.extra) ? run.extra : {};
	const extraUsage = isRecord(extra.usage) ? extra.usage : undefined;
	if (isRecord(extraUsage)) {
		const input = numericOrUndefined(extraUsage.input_tokens ?? extraUsage.prompt_tokens);
		const output = numericOrUndefined(extraUsage.output_tokens ?? extraUsage.completion_tokens);
		const total = numericOrUndefined(extraUsage.total_tokens);
		if (input !== undefined || output !== undefined || total !== undefined) {
			return { input, output, total };
		}
	}
	return null;
}

function numericOrUndefined(value: unknown): number | undefined {
	return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
