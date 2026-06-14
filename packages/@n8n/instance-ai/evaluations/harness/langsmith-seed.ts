// ---------------------------------------------------------------------------
// Reconstruct a conversation seed from a LangSmith trace, at run time.
//
// A `seedThread` test case carries only a thread id — no conversation content
// lives in the repo. At build time we pull that thread's runs from LangSmith,
// rebuild the message log (user/assistant text + resolved tool-call blocks,
// deduped across suspend/resume), and split at the LAST genuine user turn:
// everything before it is the restorable seed, the last turn is sent live.
// The seed's workflow is compiled from the build/patch tool's captured SDK
// code as of the seed boundary — i.e. the workflow exactly as the live turn
// first saw it (no "revert before export" step).
//
// Source for this is transient: LangSmith base-tier traces retain ~14 days, so
// a seedThread case is runnable only while its trace lives. Durable snapshots
// are a follow-up; until then the resolver fails loudly when a trace is gone.
// ---------------------------------------------------------------------------

import { Client } from 'langsmith';
import type { Run } from 'langsmith/schemas';

import type { ConversationSeed } from './conversation-seed';
import { parseAndValidate } from '../../src/workflow-builder/parse-validate';

/** LangSmith project the source thread was traced to. The n8n backend traces
 *  instance-ai conversations here regardless of the eval run's own project. */
const DEFAULT_SOURCE_PROJECT = process.env.SEED_LANGSMITH_PROJECT ?? 'instance-ai';

const WORKFLOW_BUILD_TOOLS = new Set(['build-workflow', 'patch-workflow', 'submit-workflow']);

export interface SeedThreadRef {
	threadId: string;
	/** Override the LangSmith project to read the source trace from. */
	project?: string;
}

export interface ReconstructedSeed {
	seed: ConversationSeed;
	/** The thread's last genuine user message — sent live, not seeded. */
	liveTurn: string;
	/** Provenance, for logging. */
	runCount: number;
	sourceProject: string;
}

function metadata(run: Run): Record<string, unknown> {
	return ((run.extra ?? {}) as { metadata?: Record<string, unknown> }).metadata ?? {};
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

/** A genuine user turn carries free-text in `inputs.message`; internal resume
 *  inputs (`<workflow-setup-required>`, approval payloads) start with `<`. */
function userMessageOf(run: Run): string | undefined {
	const message = asString(run.inputs?.message);
	if (run.name !== 'turn' || !message || message.startsWith('<')) return undefined;
	return message;
}

/** LangSmith redacts the `credentials:` key in captured SDK code; restore the
 *  opener so the code parses (secret values were never captured anyway). */
function unredactCode(code: string): string {
	return code.replace(/\[REDACTED\]/g, 'credentials: {');
}

interface TextBlock {
	type: 'text';
	text: string;
}
interface ToolCallBlock {
	type: 'tool-call';
	toolCallId: string;
	toolName: string;
	state: 'resolved';
	input: unknown;
	output: unknown;
}

/**
 * Pull a thread's runs from LangSmith and rebuild the seed + live turn. Throws
 * when the thread is empty (trace aged out or wrong project) or has fewer than
 * two user turns (nothing to seed — use a plain conversation case instead).
 */
export async function reconstructSeedFromThread(
	ref: SeedThreadRef,
	client: Client = new Client(),
): Promise<ReconstructedSeed> {
	const sourceProject = ref.project ?? DEFAULT_SOURCE_PROJECT;
	const runs: Run[] = [];
	for await (const run of client.listRuns({
		projectName: sourceProject,
		filter: `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${ref.threadId}"))`,
	})) {
		runs.push(run);
	}
	if (runs.length === 0) {
		throw new Error(
			`No runs for thread ${ref.threadId} in LangSmith project "${sourceProject}" — the trace may have aged out (base-tier retention is ~14 days) or the project is wrong (set seedThread.project or SEED_LANGSMITH_PROJECT)`,
		);
	}

	const byStartTime = (a: Run, b: Run) =>
		new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
	const rootRuns = runs.filter((r) => r.run_type === 'chain' && !r.parent_run_id).sort(byStartTime);
	const toolRuns = runs.filter((r) => r.run_type === 'tool').sort(byStartTime);

	// Split point: the last genuine user turn is sent live; everything strictly
	// before it is the seed.
	const userTurns = rootRuns.filter((r) => userMessageOf(r) !== undefined);
	if (userTurns.length < 2) {
		throw new Error(
			`Thread ${ref.threadId} has ${userTurns.length} user turn(s) — need ≥2 to seed (one prior + one live). Use a plain conversation case instead.`,
		);
	}
	const liveTurnRun = userTurns[userTurns.length - 1];
	const boundaryMs = new Date(liveTurnRun.start_time).getTime();
	const liveTurn = userMessageOf(liveTurnRun)!;

	const messages = buildSeedMessages(rootRuns, toolRuns, boundaryMs);
	const workflows = buildSeedWorkflows(toolRuns, boundaryMs);

	return {
		seed: {
			source: { kind: 'langsmith', threadId: ref.threadId, sourceProject },
			messages,
			workflows,
		},
		liveTurn,
		runCount: runs.length,
		sourceProject,
	};
}

/** Rebuild the native message log for every run before the seed boundary. */
function buildSeedMessages(
	rootRuns: Run[],
	toolRuns: Run[],
	boundaryMs: number,
): Array<Record<string, unknown>> {
	// A tool call can span a suspend run + resume runs under one toolCallId;
	// resolve each id to its final output (last seen wins) and emit it once, so
	// the rebuilt message list has no duplicate tool_use ids.
	const resolvedOutputById = new Map<string, unknown>();
	for (const tool of toolRuns) {
		resolvedOutputById.set(
			asString(metadata(tool).pending_tool_call_id) ?? tool.id,
			tool.outputs ?? {},
		);
	}
	const toolsByRoot = new Map<string, Run[]>();
	for (const tool of toolRuns) {
		const rootId = asString(metadata(tool).langsmith_root_run_id) ?? tool.trace_id ?? '';
		const list = toolsByRoot.get(rootId) ?? [];
		list.push(tool);
		toolsByRoot.set(rootId, list);
	}

	const emittedToolCallIds = new Set<string>();
	const messages: Array<Record<string, unknown>> = [];

	for (const root of rootRuns) {
		if (new Date(root.start_time).getTime() >= boundaryMs) break;

		const userText = userMessageOf(root);
		if (userText) {
			messages.push({
				id: `${root.id}-user`,
				role: 'user',
				type: 'llm',
				createdAt: new Date(root.start_time).toISOString(),
				content: [{ type: 'text', text: userText }],
			});
		}

		const content: Array<TextBlock | ToolCallBlock> = [];
		const responseText = asString(root.outputs?.response);
		if (responseText) content.push({ type: 'text', text: responseText });

		for (const tool of toolsByRoot.get(root.id) ?? []) {
			const toolCallId = asString(metadata(tool).pending_tool_call_id) ?? tool.id;
			if (emittedToolCallIds.has(toolCallId)) continue;
			emittedToolCallIds.add(toolCallId);
			content.push({
				type: 'tool-call',
				toolCallId,
				toolName: tool.name,
				state: 'resolved',
				input: tool.inputs ?? {},
				output: resolvedOutputById.get(toolCallId) ?? tool.outputs ?? {},
			});
		}

		if (content.length > 0) {
			messages.push({
				id: `${root.id}-assistant`,
				role: 'assistant',
				type: 'llm',
				// +1ms so the assistant reply orders after its user turn.
				createdAt: new Date(new Date(root.start_time).getTime() + 1).toISOString(),
				content,
			});
		}
	}

	return messages;
}

/**
 * Compile the workflow(s) the seed references from the build/patch tool's
 * captured SDK code, taking the latest successful build per workflow id before
 * the boundary — i.e. each workflow exactly as the live turn first saw it.
 */
function buildSeedWorkflows(toolRuns: Run[], boundaryMs: number): ConversationSeed['workflows'] {
	const latestBuildByWorkflowId = new Map<string, Run>();
	for (const tool of toolRuns) {
		if (new Date(tool.start_time).getTime() >= boundaryMs) continue;
		if (!WORKFLOW_BUILD_TOOLS.has(tool.name)) continue;
		const out = (tool.outputs ?? {}) as Record<string, unknown>;
		const workflowId = asString(out.workflowId);
		if (out.success !== true || !workflowId) continue;
		if (!asString(tool.inputs?.code)) continue;
		// Sorted ascending, so a later run overwrites — last successful build wins.
		latestBuildByWorkflowId.set(workflowId, tool);
	}

	const workflows: ConversationSeed['workflows'] = [];
	for (const [workflowId, build] of latestBuildByWorkflowId) {
		const code = unredactCode(asString(build.inputs?.code) ?? '');
		const parsed = parseAndValidate(code);
		const out = (build.outputs ?? {}) as Record<string, unknown>;
		workflows.push({
			id: workflowId,
			name: asString(out.workflowName) ?? parsed.workflow.name ?? 'workflow',
			nodes: (parsed.workflow.nodes ?? []) as Array<Record<string, unknown>>,
			connections: (parsed.workflow.connections ?? {}) as Record<string, unknown>,
		});
	}

	return workflows;
}
