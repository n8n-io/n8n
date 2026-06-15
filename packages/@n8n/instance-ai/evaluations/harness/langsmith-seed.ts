// ---------------------------------------------------------------------------
// Reconstruct a conversation seed from a LangSmith trace, at run time.
//
// A `seedThread` test case carries only a thread id — no conversation content
// lives in the repo. At build time we find which LangSmith workspace holds the
// thread (auto-discovered across the key's accessible workspaces), pull its
// runs, rebuild the message log (user/assistant text + resolved tool-call
// blocks, deduped across suspend/resume), and split at the LAST genuine user
// turn: everything before it is the restorable seed, the last turn is sent live.
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
import { isRecord } from '../utils/safe-extract';

/** Default project that instance-ai conversations are traced to (same name in
 *  every workspace). Override per case with `seedThread.project` if it differs. */
const DEFAULT_SOURCE_PROJECT = 'instance-ai';

const WORKFLOW_BUILD_TOOLS = new Set(['build-workflow', 'patch-workflow', 'submit-workflow']);

/**
 * A source thread can live in a different LangSmith **workspace** than the eval
 * writes to — e.g. seeding from **prod** while the eval traces to **staging**.
 * We don't make the user declare which: a LangSmith personal access token
 * typically spans several workspaces, so we enumerate them and find whichever
 * holds the thread (the workspace is selected per request via the `x-tenant-id`
 * header). Reads use the eval's ambient `LANGSMITH_API_KEY`; the eval still
 * writes its own traces/datasets to its own workspace, so nothing is ever
 * written to the source workspace. No extra configuration required.
 */

/** Ambient LangSmith host + key (the eval's own), used to enumerate workspaces. */
function ambientLangSmithConfig(): { apiUrl: string; apiKey: string } {
	const raw =
		process.env.LANGSMITH_ENDPOINT ??
		process.env.LANGCHAIN_ENDPOINT ??
		'https://api.smith.langchain.com';
	const host = raw.replace(/\/$/, '');
	const apiUrl = host.endsWith('/api/v1') ? host : `${host}/api/v1`;
	const apiKey = process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY ?? '';
	return { apiUrl, apiKey };
}

/** Workspaces the ambient key can access. Returns [] on any failure so the
 *  caller falls back to the key's default workspace. */
async function listAccessibleWorkspaces(): Promise<Array<{ id: string; name: string }>> {
	const { apiUrl, apiKey } = ambientLangSmithConfig();
	if (!apiKey) return [];
	try {
		const res = await fetch(`${apiUrl}/workspaces`, { headers: { 'x-api-key': apiKey } });
		if (!res.ok) return [];
		const data: unknown = await res.json();
		if (!Array.isArray(data)) return [];
		return data.flatMap((entry) => {
			if (typeof entry !== 'object' || entry === null) return [];
			const record = entry as Record<string, unknown>;
			const id = asString(record.id);
			const name = asString(record.display_name) ?? asString(record.name) ?? id;
			return id ? [{ id, name: name ?? id }] : [];
		});
	} catch {
		return [];
	}
}

/** Seams for unit-testing workspace discovery without the network. */
export interface SeedDiscoveryDeps {
	listWorkspaces: () => Promise<Array<{ id: string; name: string }>>;
	clientForWorkspace: (workspaceId: string) => Client;
	ambientClient: () => Client;
}

const realDiscoveryDeps: SeedDiscoveryDeps = {
	listWorkspaces: listAccessibleWorkspaces,
	clientForWorkspace: (workspaceId) => new Client({ workspaceId }),
	ambientClient: () => new Client(),
};

/** Thrown when a thread has no runs in the queried (workspace, project) — used
 *  as control flow during discovery to advance to the next workspace. */
class ThreadNotInWorkspaceError extends Error {}

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
	/** Workspace the thread was found in (when auto-discovered). */
	sourceWorkspace?: string;
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

/**
 * A human-in-the-loop tool spans a SUSPEND run (the pending request, no answer)
 * and a RESUME run (the answer). The suspend's output is a re-statement of the
 * request — `{ deferred: true, ... }` (setup) or `{ payload: { inputType, … } }`
 * (ask-user / confirmations). It carries no result, and the resume run holds the
 * full record, so the suspend artifact is dropped during reconstruction. The
 * `payload.inputType` check is specific to HITL request envelopes — ordinary
 * tools also wrap output in `payload`, but without `inputType`.
 */
function isSuspendArtifact(output: unknown): boolean {
	if (!isRecord(output)) return false;
	if (output.deferred === true) return true;
	return isRecord(output.payload) && typeof output.payload.inputType === 'string';
}

/** A HITL request envelope: `{ payload: { requestId, … } }` — emitted by both the
 *  suspend and resume halves of ask-user / setup-card. Used (with the absence of
 *  a pending id) to identify the suspend half to drop. */
function isHitlRequestEnvelope(output: unknown): boolean {
	return (
		isRecord(output) && isRecord(output.payload) && typeof output.payload.requestId === 'string'
	);
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
 * Reconstruct a thread's seed + live turn. The workspace holding the thread is
 * auto-discovered (the user only supplies a thread id); pass an explicit
 * `client` to bypass discovery (tests).
 *
 * Throws when the thread isn't found in any accessible workspace (trace aged out
 * or wrong project), or when it has fewer than two user turns.
 */
export async function reconstructSeedFromThread(
	ref: SeedThreadRef,
	client?: Client,
	deps: SeedDiscoveryDeps = realDiscoveryDeps,
): Promise<ReconstructedSeed> {
	const project = ref.project ?? DEFAULT_SOURCE_PROJECT;
	// An explicit client (tests) reads that one source; otherwise auto-discover.
	if (client) return await reconstructWithClient(ref, client, project);
	return await discoverAndReconstruct(ref, project, deps);
}

/** Find the workspace holding the thread and reconstruct from it. Falls back to
 *  the key's default workspace when workspaces can't be enumerated. */
async function discoverAndReconstruct(
	ref: SeedThreadRef,
	project: string,
	deps: SeedDiscoveryDeps,
): Promise<ReconstructedSeed> {
	const workspaces = await deps.listWorkspaces();
	if (workspaces.length === 0) {
		return await reconstructWithClient(ref, deps.ambientClient(), project);
	}
	const tried: string[] = [];
	for (const workspace of workspaces) {
		tried.push(workspace.name);
		try {
			const result = await reconstructWithClient(
				ref,
				deps.clientForWorkspace(workspace.id),
				project,
			);
			return { ...result, sourceWorkspace: workspace.name };
		} catch (error) {
			// Not in this workspace → try the next; anything else (found but not
			// seedable, drift) is a real problem and propagates.
			if (error instanceof ThreadNotInWorkspaceError) continue;
			throw error;
		}
	}
	throw new Error(
		`Thread ${ref.threadId} not found in project "${project}" across ${String(workspaces.length)} workspace(s): ${tried.join(', ')}. The trace may have aged out (~14-day base retention), or the project name differs (set seedThread.project).`,
	);
}

/** Pull a thread's runs from one client/project and rebuild the seed + live turn. */
async function reconstructWithClient(
	ref: SeedThreadRef,
	client: Client,
	sourceProject: string,
): Promise<ReconstructedSeed> {
	const runs: Run[] = [];
	for await (const run of client.listRuns({
		projectName: sourceProject,
		filter: `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${ref.threadId}"))`,
	})) {
		runs.push(run);
	}
	if (runs.length === 0) {
		// Recognised by discovery to advance to the next workspace; the message
		// still reads well if it surfaces directly (explicit-client path).
		throw new ThreadNotInWorkspaceError(
			`No runs for thread ${ref.threadId} in LangSmith project "${sourceProject}" — the trace may have aged out (~14-day base retention) or the project name is wrong.`,
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
	if (messages.length === 0) {
		throw new Error(
			`Thread ${ref.threadId} reconstructed to zero seed messages before the live turn — the trace shape may have drifted (expected root runs named 'turn' with inputs.message / outputs.response).`,
		);
	}
	const workflows = buildSeedWorkflows(toolRuns, boundaryMs, ref.threadId);
	const dataTables = buildSeedDataTables(toolRuns, boundaryMs);

	return {
		seed: {
			source: { kind: 'langsmith', threadId: ref.threadId, sourceProject },
			messages,
			workflows,
			dataTables,
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
			// A human-in-the-loop tool (ask-user, confirmations, setup) records a
			// SUSPEND run (the pending request, no result) under the asking turn and
			// a separate RESUME run (carrying the answer/outcome) under a later
			// `resume:` root. They share no id, so they can't be deduped by key —
			// instead drop the suspend artifact and keep the resume, which alone
			// holds both the request input and the resolved answer.
			if (isSuspendArtifact(tool.outputs)) continue;
			const pendingId = asString(metadata(tool).pending_tool_call_id);
			// Setup-card suspend: a HITL request envelope (payload.requestId) with no
			// pending id is the suspend half — its resume (with a pending id) carries
			// the same card and is kept, so drop this to avoid a duplicate block.
			if (!pendingId && isHitlRequestEnvelope(tool.outputs)) continue;
			const toolCallId = pendingId ?? tool.id;
			if (emittedToolCallIds.has(toolCallId)) continue;
			emittedToolCallIds.add(toolCallId);
			// The emitted (non-suspend) run is the resume for a HITL call or the
			// single run for a normal tool — its own output is the resolved result.
			content.push({
				type: 'tool-call',
				toolCallId,
				toolName: tool.name,
				state: 'resolved',
				input: tool.inputs ?? {},
				output: tool.outputs ?? {},
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
function buildSeedWorkflows(
	toolRuns: Run[],
	boundaryMs: number,
	threadId: string,
): ConversationSeed['workflows'] {
	const latestBuildByWorkflowId = new Map<string, Run>();
	// Name-independent "this was a build" signal: a tool run that takes SDK
	// `code` and returns a `workflowId` on success is unmistakably a build/patch,
	// whatever it's called. Lets us detect a renamed build tool instead of
	// silently producing a workflow-less seed.
	let sawBuildLikeRun = false;
	for (const tool of toolRuns) {
		if (new Date(tool.start_time).getTime() >= boundaryMs) continue;
		const out = (tool.outputs ?? {}) as Record<string, unknown>;
		const workflowId = asString(out.workflowId);
		const buildLike = out.success === true && !!workflowId && !!asString(tool.inputs?.code);
		if (buildLike) sawBuildLikeRun = true;
		if (!WORKFLOW_BUILD_TOOLS.has(tool.name)) continue;
		if (!buildLike || !workflowId) continue;
		// Sorted ascending, so a later run overwrites — last successful build wins.
		latestBuildByWorkflowId.set(workflowId, tool);
	}

	if (latestBuildByWorkflowId.size === 0 && sawBuildLikeRun) {
		throw new Error(
			`Thread ${threadId}: a tool run built a workflow (SDK code in, workflowId out) but its name isn't in the known build set {${[...WORKFLOW_BUILD_TOOLS].join(', ')}} — the build tool was likely renamed; update WORKFLOW_BUILD_TOOLS.`,
		);
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

type DataTableColumnType = 'string' | 'number' | 'boolean' | 'date';
const DATA_TABLE_COLUMN_TYPES = new Set<string>(['string', 'number', 'boolean', 'date']);
function isDataTableColumnType(value: string): value is DataTableColumnType {
	return DATA_TABLE_COLUMN_TYPES.has(value);
}

/**
 * Reconstruct the data tables the seed references (schema only), so a restored
 * workflow's data-table node id resolves. A data table is an instance-scoped
 * resource: the built workflow points at the id the source instance assigned,
 * which doesn't exist on the eval instance, so the node fails at execution. The
 * `create` run carries the schema (columns) and the assigned id — enough to
 * recreate an empty table, which is all the node needs to resolve.
 *
 * Rows are deliberately NOT reconstructed: a real conversation's rows are the
 * highest-PII payload in the trace (customer messages, contacts, …), and an
 * empty table already satisfies "the table exists". Keeping rows in LangSmith
 * — never materialised into the eval instance — is the cheap, safe default.
 *
 * Detection is by shape, not tool name (a `create` returns `table.id` +
 * `table.columns`), so a renamed data-table tool still reconstructs. Only
 * tables with a `create` in the seed window are emitted — without it we lack
 * the schema.
 */
function buildSeedDataTables(toolRuns: Run[], boundaryMs: number): ConversationSeed['dataTables'] {
	const created = new Map<string, ConversationSeed['dataTables'][number]>();

	for (const tool of toolRuns) {
		if (new Date(tool.start_time).getTime() >= boundaryMs) continue;
		const out = isRecord(tool.outputs) ? tool.outputs : {};

		// A `create`: output carries the new table's id, name and columns.
		const table = isRecord(out.table) ? out.table : undefined;
		const tableId = table ? asString(table.id) : undefined;
		if (!table || !tableId || !Array.isArray(table.columns)) continue;
		const columns = table.columns.flatMap((col) => {
			if (!isRecord(col)) return [];
			const name = asString(col.name);
			const type = asString(col.type);
			if (!name || !type || !isDataTableColumnType(type)) return [];
			return [{ name, type }];
		});
		created.set(tableId, { id: tableId, name: asString(table.name) ?? 'data table', columns });
	}

	return [...created.values()];
}
