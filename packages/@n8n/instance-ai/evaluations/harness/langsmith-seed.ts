// Reconstruct a conversation seed from a LangSmith trace at run time: pull the
// thread's runs, rebuild the message log, split at the last user turn (before =
// seed, last = live), and reconstruct each seed workflow from its source at the
// build boundary. Transient: traces retain ~14 days.

import { isRecord } from '@n8n/utils';
import { Client } from 'langsmith';
import type { Run } from 'langsmith/schemas';

import type { ConversationSeed } from './conversation-seed';
import { parseSeedWorkflowCode } from './parse-seed-workflow';
import { DOMAIN_TOOL_IDS } from '../../src/tools/tool-ids';

/** Default project that instance-ai conversations are traced to (same name in
 *  every workspace). Override per case with `seedThread.project` if it differs. */
const DEFAULT_SOURCE_PROJECT = 'instance-ai';

// Reference the live tool-id so a rename there follows here (or breaks the import).
// patch/submit-workflow were removed in #32545 but stay for older traces.
const WORKFLOW_BUILD_TOOLS = new Set<string>([
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	'patch-workflow',
	'submit-workflow',
]);

// Workspace tools (@n8n/agents) whose ops mutate file content we replay. The names
// live here only; a contract test pins them — and the arg keys below — against the
// live tool set + Zod schema, so a rename in @n8n/agents fails CI loudly instead of
// silently no-op'ing a mutation (the same drift class #32545 caused).
const WORKSPACE_TOOL = {
	WRITE: 'workspace_write_file',
	APPEND: 'workspace_append_file',
	STR_REPLACE: 'workspace_str_replace_file',
	BATCH_STR_REPLACE: 'workspace_batch_str_replace_file',
	MOVE: 'workspace_move_file',
	COPY: 'workspace_copy_file',
	DELETE: 'workspace_delete_file',
} as const;

/** Input keys the replay reads per tool — pinned against the live Zod schema. */
export const REPLAYED_WORKSPACE_TOOL_ARGS: Record<string, readonly string[]> = {
	[WORKSPACE_TOOL.WRITE]: ['path', 'content'],
	[WORKSPACE_TOOL.APPEND]: ['path', 'content'],
	[WORKSPACE_TOOL.STR_REPLACE]: ['path', 'old_str', 'new_str'],
	[WORKSPACE_TOOL.BATCH_STR_REPLACE]: ['path', 'replacements'],
	[WORKSPACE_TOOL.MOVE]: ['src', 'dest'],
	[WORKSPACE_TOOL.COPY]: ['src', 'dest'],
	[WORKSPACE_TOOL.DELETE]: ['path'],
};

/** Live filesystem tools we deliberately don't replay (reads + dir ops) — listed so
 *  the contract test can prove every live filesystem tool is classified. */
export const IGNORED_WORKSPACE_TOOLS: readonly string[] = [
	'workspace_read_file',
	'workspace_list_files',
	'workspace_file_stat',
	'workspace_mkdir',
	'workspace_rmdir',
];

// The source thread may live in a different workspace than the eval writes to
// (e.g. seed from prod, trace to staging). A PAT spans workspaces, so we
// enumerate them and find the one holding the thread; reads are read-only.

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

/** A genuine user turn: a 'turn' root with free-text `inputs.message`. System
 *  control inputs (e.g. `<workflow-setup-required>`) are angle-bracket tags —
 *  matched as a leading `<tag>`, not any `<`, so real messages like "<3" stay. */
function userMessageOf(run: Run): string | undefined {
	const message = asString(run.inputs?.message);
	if (run.name !== 'turn' || !message || /^<[a-z][\w-]*>/i.test(message)) return undefined;
	return message;
}

/** LangSmith redacts the `credentials:` key in captured SDK code; restore the
 *  opener so the code parses (secret values were never captured anyway). */
function unredactCode(code: string): string {
	return code.replace(/\[REDACTED\]/g, 'credentials: {');
}

/** A HITL suspend artifact (the pending request, no result) — dropped in favour
 *  of its resume run, which holds both request and answer. */
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

/** Top-level fields that carry data-table row values across the data-table
 *  tools (insert/upsert/update take `rows`; reads return `data`). */
const DATA_TABLE_ROW_FIELDS = new Set(['rows', 'data']);

/** Replace data-table row arrays with an omission marker, keeping the rest of
 *  the payload — so seeded history carries no real (PII) row values. */
function redactDataTableRowPayload(value: unknown): Record<string, unknown> {
	if (!isRecord(value)) return {};
	const out: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(value)) {
		out[key] =
			DATA_TABLE_ROW_FIELDS.has(key) && Array.isArray(val) ? `<${val.length} row(s) omitted>` : val;
	}
	return out;
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
	// Fetch only the run_types reconstruction uses — root `chain` turns + `tool` runs.
	// Paging every run_type (the llm/nested bulk is usually the majority) multiplied
	// /runs/query calls and tripped LangSmith rate limits on long threads. No is_root
	// filter: tools are non-root, so it can't be expressed as a single boolean.
	for await (const run of client.listRuns({
		projectName: sourceProject,
		filter: `and(eq(thread_id, "${ref.threadId}"), or(eq(run_type, "chain"), eq(run_type, "tool")))`,
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
			// HITL tools split into a suspend run + a later resume run (no shared id):
			// drop the suspend, keep the resume which holds request + answer.
			if (isSuspendArtifact(tool.outputs)) continue;
			const pendingId = asString(metadata(tool).pending_tool_call_id);
			// Setup-card suspend half (request envelope, no pending id) — its resume is kept.
			if (!pendingId && isHitlRequestEnvelope(tool.outputs)) continue;
			const toolCallId = pendingId ?? tool.id;
			if (emittedToolCallIds.has(toolCallId)) continue;
			emittedToolCallIds.add(toolCallId);
			// Redact data-table row payloads: seeded messages are written to the eval
			// instance + shown to the judge, so real (PII) rows must not ride along.
			const isDataTable = tool.name.startsWith('data-tables');
			content.push({
				type: 'tool-call',
				toolCallId,
				toolName: tool.name,
				state: 'resolved',
				input: isDataTable ? redactDataTableRowPayload(tool.inputs) : (tool.inputs ?? {}),
				output: isDataTable ? redactDataTableRowPayload(tool.outputs) : (tool.outputs ?? {}),
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

/** Replay one content-mutating workspace tool onto the reconstructed file map.
 *  Returns false when an edit can't be applied faithfully (a str-replace whose
 *  anchor is absent) — the reconstruction has diverged from the real sandbox. */
function applyFileMutation(files: Map<string, string>, tool: Run): boolean {
	const input = isRecord(tool.inputs) ? tool.inputs : {};
	// A failed edit left the real file unchanged — treat as a no-op (no divergence).
	if (isRecord(tool.outputs) && tool.outputs.success === false) return true;
	if (tool.name === WORKSPACE_TOOL.WRITE) {
		const path = asString(input.path);
		const content = asString(input.content);
		if (path && content !== undefined) files.set(path, content);
		return true;
	}
	if (tool.name === WORKSPACE_TOOL.APPEND) {
		const path = asString(input.path);
		if (path) files.set(path, (files.get(path) ?? '') + (asString(input.content) ?? ''));
		return true;
	}
	if (tool.name === WORKSPACE_TOOL.STR_REPLACE) {
		// The tool requires one exact, unique match; mirror it (first occurrence).
		const path = asString(input.path);
		const current = path !== undefined ? files.get(path) : undefined;
		const oldStr = asString(input.old_str);
		const newStr = asString(input.new_str);
		if (path === undefined || current === undefined || !oldStr || newStr === undefined) return true;
		if (!current.includes(oldStr)) return false;
		files.set(path, current.replace(oldStr, newStr));
		return true;
	}
	if (tool.name === WORKSPACE_TOOL.BATCH_STR_REPLACE) {
		// The real tool is atomic — it validates every anchor up front and applies
		// all or nothing (@n8n/ai-utilities TextEditorDocument.executeBatch). Mirror
		// that, like single str-replace: any missing anchor → file untouched, diverged.
		const path = asString(input.path);
		const current = path !== undefined ? files.get(path) : undefined;
		if (path === undefined || current === undefined) return true;
		const replacements = Array.isArray(input.replacements) ? input.replacements : [];
		let next = current;
		for (const replacement of replacements) {
			if (!isRecord(replacement)) continue;
			const oldStr = asString(replacement.old_str);
			const newStr = asString(replacement.new_str);
			if (!oldStr || newStr === undefined) continue;
			if (!next.includes(oldStr)) return false;
			next = next.replace(oldStr, newStr);
		}
		files.set(path, next);
		return true;
	}
	if (tool.name === WORKSPACE_TOOL.MOVE || tool.name === WORKSPACE_TOOL.COPY) {
		const src = asString(input.src);
		const dest = asString(input.dest);
		const content = src !== undefined ? files.get(src) : undefined;
		if (src !== undefined && dest !== undefined && content !== undefined) {
			files.set(dest, content);
			if (tool.name === WORKSPACE_TOOL.MOVE) files.delete(src);
		}
		return true;
	}
	if (tool.name === WORKSPACE_TOOL.DELETE) {
		const path = asString(input.path);
		if (path) files.delete(path);
		return true;
	}
	return true; // read/list/grep/etc. — no content change
}

/** Reconstruct the seed's workflows: the latest successful build per workflow id
 *  before the boundary. Post-#32545 the builder builds from a workspace file
 *  (`build-workflow {filePath}`, no inline code), so the source is that file
 *  replayed from the workspace ops; inline `code` and `get-as-code` are fallbacks.
 *  Only files an actual build references become workflows. */
function buildSeedWorkflows(
	toolRuns: Run[],
	boundaryMs: number,
	threadId: string,
): ConversationSeed['workflows'] {
	const files = new Map<string, string>();
	const divergedPaths = new Set<string>();
	const getAsCodeByWorkflowId = new Map<string, string>();
	// workflowId -> reconstructed source + name at its latest successful build.
	const builtByWorkflowId = new Map<string, { code: string; diverged: boolean; name?: string }>();
	// Workflow ids with a build-shaped run (source in, success + workflowId out),
	// name-independent — drives the drift tripwire below.
	const buildSignalIds = new Set<string>();

	for (const tool of toolRuns) {
		if (new Date(tool.start_time ?? 0).getTime() >= boundaryMs) continue;

		if (tool.name.startsWith('workspace_')) {
			const path = asString((isRecord(tool.inputs) ? tool.inputs : {}).path);
			const applied = applyFileMutation(files, tool);
			// A full write replaces the file, healing any earlier divergence.
			if (tool.name === WORKSPACE_TOOL.WRITE) {
				if (path !== undefined) divergedPaths.delete(path);
			} else if (!applied && path !== undefined) {
				divergedPaths.add(path);
			}
			continue;
		}

		const out = isRecord(tool.outputs) ? tool.outputs : {};
		if (tool.name.includes('get-as-code')) {
			const code = asString(out.code);
			const workflowId = asString(out.workflowId);
			if (code && workflowId) getAsCodeByWorkflowId.set(workflowId, code);
		}

		const workflowId = asString(out.workflowId);
		if (out.success !== true || workflowId === undefined) continue;
		const input = isRecord(tool.inputs) ? tool.inputs : {};
		const filePath = asString(input.filePath);
		const inlineCode = asString(input.code);
		if (filePath === undefined && inlineCode === undefined) continue;
		// A build happened for this id (even if the tool's name isn't recognised).
		buildSignalIds.add(workflowId);
		if (!WORKFLOW_BUILD_TOOLS.has(tool.name)) continue;
		// Current builder: the workspace file's content at this build. Legacy: inline code.
		const code = filePath !== undefined ? (files.get(filePath) ?? '') : (inlineCode ?? '');
		const diverged = filePath !== undefined ? divergedPaths.has(filePath) : false;
		// Sorted ascending → the latest successful build wins.
		builtByWorkflowId.set(workflowId, { code, diverged, name: asString(out.workflowName) });
	}

	const workflows: ConversationSeed['workflows'] = [];
	const degraded: string[] = [];
	const skipped: string[] = [];
	for (const [workflowId, built] of builtByWorkflowId) {
		const getAsCode = getAsCodeByWorkflowId.get(workflowId) ?? '';
		// Resolve in descending order of trust: clean file replay, then a
		// `get-as-code` capture, then a diverged replay as a last resort.
		const candidates: Array<[string, string]> = [
			['replay', built.diverged ? '' : built.code],
			['get-as-code', getAsCode],
			['diverged-replay', built.diverged ? built.code : ''],
		];
		let resolved: ReturnType<typeof tryParseSeedWorkflow>;
		let via = '';
		for (const [label, code] of candidates) {
			if (code === '') continue;
			resolved = tryParseSeedWorkflow(unredactCode(code));
			if (resolved) {
				via = label;
				break;
			}
		}
		if (!resolved) {
			skipped.push(workflowId);
			continue;
		}
		if (via !== 'replay') degraded.push(`${workflowId}→${via}`);
		workflows.push({
			id: workflowId,
			name: built.name ?? resolved.name ?? 'workflow',
			nodes: resolved.nodes,
			connections: resolved.connections,
		});
	}
	if (degraded.length > 0) {
		console.warn(
			`[seed] Thread ${threadId}: ${degraded.length} workflow(s) reconstructed via a fallback source (file replay diverged — likely an untracked shell edit); verify before trusting: ${degraded.join(', ')}`,
		);
	}
	if (skipped.length > 0) {
		console.warn(
			`[seed] Thread ${threadId}: ${skipped.length} built workflow(s) could not be reconstructed and were skipped: ${skipped.join(', ')}`,
		);
	}

	// Builds happened but we recovered nothing → throw rather than silently seed 0
	// workflows (reported as a framework_issue; the message names the likely cause).
	if (buildSignalIds.size > 0 && workflows.length === 0) {
		throw new Error(
			`Thread ${threadId}: ${buildSignalIds.size} workflow(s) were built in the trace but reconstruction recovered 0 — the build tool was likely renamed or its input/output shape changed (e.g. inline-code → filePath). Update reconstruction (WORKFLOW_BUILD_TOOLS / source extraction in buildSeedWorkflows).`,
		);
	}
	if (workflows.length < buildSignalIds.size) {
		console.warn(
			`[seed] Thread ${threadId}: reconstructed ${workflows.length}/${buildSignalIds.size} built workflow(s) — partial; check for trace-shape drift if unexpected.`,
		);
	}

	return workflows;
}

/** Parse reconstructed SDK code into workflow JSON, returning undefined instead
 *  of throwing so a caller can fall back to another source. */
function tryParseSeedWorkflow(
	code: string,
):
	| { name?: string; nodes: Array<Record<string, unknown>>; connections: Record<string, unknown> }
	| undefined {
	try {
		const { workflow } = parseSeedWorkflowCode(code);
		return {
			name: workflow.name,
			nodes: (workflow.nodes ?? []) as unknown as Array<Record<string, unknown>>,
			connections: (workflow.connections ?? {}) as Record<string, unknown>,
		};
	} catch {
		return undefined;
	}
}

type DataTableColumnType = 'string' | 'number' | 'boolean' | 'date';
const DATA_TABLE_COLUMN_TYPES = new Set<string>(['string', 'number', 'boolean', 'date']);
function isDataTableColumnType(value: string): value is DataTableColumnType {
	return DATA_TABLE_COLUMN_TYPES.has(value);
}

/** Reconstruct the seed's data tables, schema only — enough for a restored
 *  workflow's data-table node to resolve. Rows are deliberately not pulled
 *  (highest-PII payload). Detected by shape (`create` returns `table.id` +
 *  `table.columns`), so a renamed tool still reconstructs. */
function buildSeedDataTables(toolRuns: Run[], boundaryMs: number): ConversationSeed['dataTables'] {
	const created = new Map<string, ConversationSeed['dataTables'][number]>();

	for (const tool of toolRuns) {
		if (new Date(tool.start_time ?? 0).getTime() >= boundaryMs) continue;
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
