// ---------------------------------------------------------------------------
// Shared MCP build core
//
// The `claude -p` invocation that drives an n8n MCP server to build a workflow,
// factored out so it can be used by two callers:
//
//   1. build-mcp-manifest.ts — the standalone builder that writes a manifest of
//      workflow IDs (the decoupled build → eval flow).
//   2. index.ts `--build-via-mcp` — the fused eval-loop lane worker that builds
//      each workflow on the lane it will be verified on (one process, one
//      LangSmith experiment, no manifest hop).
//
// Pure/subprocess logic only — no CLI parsing, no manifest/stats writing, so
// unit tests can import the prompt + id-extraction helpers without side effects.
// ---------------------------------------------------------------------------

import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { z } from 'zod';

import type { ConversationTurn, WorkflowTestCase } from '../types';

// ---------------------------------------------------------------------------
// MCP config staging — the `--mcp-config` file `claude -p` is pointed at
// ---------------------------------------------------------------------------

const claudeConfigSchema = z
	.object({
		mcpServers: z.record(z.unknown()).optional(),
		projects: z
			.record(z.object({ mcpServers: z.record(z.unknown()).optional() }).passthrough())
			.optional(),
	})
	.passthrough();

function readJson(path: string, label: string): unknown {
	const content = readFileSync(path, 'utf-8');
	try {
		return JSON.parse(content);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to parse ${label} at ${path}: ${msg}`);
	}
}

function uniqueDefined(values: Array<string | undefined>): string[] {
	const unique: string[] = [];
	for (const value of values) {
		if (!value || unique.includes(value)) continue;
		unique.push(value);
	}
	return unique;
}

/** Deduplicate project scopes (repo root, build cwd, process cwd) for the lookup. */
export function uniqueProjectScopes(scopes: Array<string | undefined>): string[] {
	return uniqueDefined(scopes);
}

function writeMcpConfig(serverName: string, block: unknown, filePrefix: string): string {
	// A random suffix (not just pid+time) keeps concurrent lane stages from
	// colliding when several are written in the same millisecond.
	const tmpPath = join(
		tmpdir(),
		`${filePrefix}-${String(process.pid)}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}.json`,
	);
	writeFileSync(tmpPath, JSON.stringify({ mcpServers: { [serverName]: block } }), { mode: 0o600 });
	return tmpPath;
}

/**
 * Stage an MCP config by extracting the named server block from the user's
 * `~/.claude.json` (project-scoped first, then global). Used by the standalone
 * builder, where the MCP server is configured out-of-band by the operator.
 */
export function stageMcpConfigFromClaudeJson(
	serverName: string,
	projectScopes: readonly string[],
): string {
	const claudeConfigPath = join(homedir(), '.claude.json');
	if (!existsSync(claudeConfigPath)) {
		throw new Error(`${claudeConfigPath} not found`);
	}
	const parsed = claudeConfigSchema.parse(readJson(claudeConfigPath, 'Claude Code config'));

	const projectScopedBlock = projectScopes
		.map((scope) => parsed.projects?.[scope]?.mcpServers?.[serverName])
		.find((block) => block !== undefined);
	const block = projectScopedBlock ?? parsed.mcpServers?.[serverName];
	if (block === undefined) {
		const scope = projectScopes.length
			? `project-scope under ${projectScopes.map((s) => `"${s}"`).join(', ')} or global`
			: 'global (no project scopes)';
		throw new Error(`MCP server "${serverName}" not configured in ${claudeConfigPath} (${scope})`);
	}

	return writeMcpConfig(serverName, block, 'n8n-mcp-config');
}

/**
 * Stage an MCP config for one eval lane directly from its URL + API key, with no
 * dependency on `~/.claude.json`. Used by the fused `--build-via-mcp` path where
 * the eval CLI mints an MCP key per lane and points `claude` at that lane's MCP
 * server. Returns the temp config path; the caller owns cleanup.
 */
export function stageLaneMcpConfig(opts: {
	serverName: string;
	url: string;
	apiKey: string;
}): string {
	const block = {
		type: 'http',
		url: opts.url,
		headers: { Authorization: `Bearer ${opts.apiKey}` },
	};
	return writeMcpConfig(opts.serverName, block, 'n8n-mcp-lane-config');
}

/** Each non-alphanumeric character (excluding hyphen) becomes "_". Mirrors
 *  Claude Code's tool-prefix sanitization: "n8n-mcp (instance)" maps to
 *  "n8n-mcp__instance_", and the full prefix becomes "mcp__n8n-mcp__instance___". */
export function sanitizeServerName(name: string): string {
	return name.replace(/[^a-zA-Z0-9-]/g, '_');
}

export function buildAllowedTools(serverName: string): readonly string[] {
	return [`mcp__${sanitizeServerName(serverName)}`];
}

type McpBuildKeySupport = 'supported' | 'orchestrator-only';

/**
 * Classification of EVERY test-case schema key for the `claude -p` MCP build
 * path. `orchestrator-only` keys are build-side setup the orchestrator seeds
 * before driving the in-product agent (credential creation, conversation/thread
 * seeding), while `claude` receives only the flattened conversation prompt — a
 * case relying on them would build without its prerequisites and fail
 * misleadingly, so callers skip cases that declare them.
 *
 * Deliberately exhaustive rather than a blocklist: the type covers the
 * WorkflowTestCase interface (plus the schema's forbidden legacy key), and a
 * unit test asserts parity with WORKFLOW_TEST_CASE_KEYS — adding a schema field
 * forces an explicit decision here instead of silently building unsupported
 * cases (same whitelist-over-blocklist argument as data/workflows/schema.ts).
 */
export const MCP_BUILD_KEY_SUPPORT: Record<
	keyof WorkflowTestCase | 'buildExpectations',
	McpBuildKeySupport
> = {
	description: 'supported',
	conversation: 'supported',
	complexity: 'supported',
	tags: 'supported',
	triggerType: 'supported',
	executionScenarios: 'supported',
	// Caps user-proxy follow-ups in the orchestrator chat loop — simply doesn't
	// apply to a single-shot `claude` build, so it is NOT flagged.
	messageBudget: 'supported',
	// Judged by the harness after the build (processExpectations are skipped for
	// transcript-less MCP builds there); declaring them needs no build-side setup.
	processExpectations: 'supported',
	outcomeExpectations: 'supported',
	// Forbidden legacy key — the schema rejects it at load, so it can never
	// reach this check; classified only to keep the map schema-complete.
	buildExpectations: 'supported',
	credentials: 'orchestrator-only',
	conversationSeed: 'orchestrator-only',
	priorConversation: 'orchestrator-only',
	seedThread: 'orchestrator-only',
	datasets: 'supported',
};

/** Keys flagged `orchestrator-only`, in map order (stable for messages/tests). */
const ORCHESTRATOR_ONLY_KEYS = Object.entries(MCP_BUILD_KEY_SUPPORT)
	.filter(([, support]) => support === 'orchestrator-only')
	.map(([key]) => key);

/**
 * Build-side setup fields a test case declares that the `claude -p` MCP build
 * path cannot honor (the `orchestrator-only` keys of MCP_BUILD_KEY_SUPPORT).
 * Callers should skip cases where this returns a non-empty list.
 */
export function unsupportedMcpBuildSetupFields(testCase: WorkflowTestCase): string[] {
	// Interfaces carry no implicit index signature; the spread re-types the case
	// as an anonymous object so classified keys can be looked up generically.
	const values: Partial<Record<string, unknown>> = { ...testCase };
	return ORCHESTRATOR_ONLY_KEYS.filter((key) => {
		const value = values[key];
		if (value === undefined || value === null || value === '') return false;
		// An empty array (e.g. credentials: []) declares nothing to seed.
		return !Array.isArray(value) || value.length > 0;
	});
}

// ---------------------------------------------------------------------------
// `claude -p` subprocess invocation
// ---------------------------------------------------------------------------

const claudeSessionSchema = z
	.object({
		result: z.string().optional(),
		num_turns: z.number().optional(),
		total_cost_usd: z.number().optional(),
		duration_ms: z.number().optional(),
		subtype: z.string().optional(),
	})
	.passthrough();
export type ClaudeSession = z.infer<typeof claudeSessionSchema>;

/** Per-tool call counts, keyed by the full tool name as `claude` reports it
 *  (e.g. `mcp__n8n-local__create_workflow_from_code`). */
export type ToolCallCounts = Record<string, number>;

/** Accumulate per-tool call counts from `from` into `into` (mutates `into`). */
export function mergeToolCalls(into: ToolCallCounts, from: ToolCallCounts): void {
	for (const [tool, count] of Object.entries(from)) {
		into[tool] = (into[tool] ?? 0) + count;
	}
}

/** One failed tool call: which tool errored and what `claude` saw. */
export interface ToolCallError {
	tool: string;
	/** Error text of the `tool_result`, truncated to TOOL_ERROR_MESSAGE_CAP. */
	message: string;
}

/** Cap on a recorded tool-error message — enough to diagnose (validation
 *  errors, HTTP failures) without letting a huge payload bloat run outputs. */
export const TOOL_ERROR_MESSAGE_CAP = 500;

/** The stream's trailing `result` event — same shape the old `--output-format
 *  json` single object had, plus the event-type discriminator. */
const resultEventSchema = claudeSessionSchema.extend({ type: z.literal('result') });

/** An `assistant` event: one model turn; its `tool_use` blocks name the tools
 *  the turn was spent on. Only the fields the counter reads are modeled. */
const assistantEventSchema = z
	.object({
		type: z.literal('assistant'),
		message: z
			.object({
				content: z.array(
					z
						.object({ type: z.string(), id: z.string().optional(), name: z.string().optional() })
						.passthrough(),
				),
			})
			.passthrough(),
	})
	.passthrough();

/** A `user` event carrying `tool_result` blocks — each closes a `tool_use`
 *  (matched by id) and flags failure via `is_error`. */
const toolResultEventSchema = z
	.object({
		type: z.literal('user'),
		message: z
			.object({
				content: z.array(
					z
						.object({
							type: z.string(),
							tool_use_id: z.string().optional(),
							is_error: z.boolean().optional(),
							content: z.unknown().optional(),
						})
						.passthrough(),
				),
			})
			.passthrough(),
	})
	.passthrough();

/** Flatten a `tool_result`'s content (string, or array of text blocks) into
 *  the error text, capped at TOOL_ERROR_MESSAGE_CAP. */
function toolResultText(content: unknown): string {
	let text = '';
	if (typeof content === 'string') {
		text = content;
	} else if (Array.isArray(content)) {
		const textBlockSchema = z.object({ text: z.string() });
		text = content
			.map((block) => {
				const parsed = textBlockSchema.safeParse(block);
				return parsed.success ? parsed.data.text : '';
			})
			.filter((t) => t.length > 0)
			.join('\n');
	}
	text = text.trim();
	return text.length > TOOL_ERROR_MESSAGE_CAP ? `${text.slice(0, TOOL_ERROR_MESSAGE_CAP)}…` : text;
}

export interface ParsedClaudeStream {
	/** Session totals from the trailing `result` event; undefined when the
	 *  stream never finished (killed/hung run). */
	session: ClaudeSession | undefined;
	/** `tool_use` blocks counted per tool name across all assistant turns. */
	toolCalls: ToolCallCounts;
	/** Failed tool calls (`tool_result` with `is_error`), in stream order, each
	 *  with the tool name and truncated error text. Errored calls are also
	 *  counted in `toolCalls` — this is the failure subset. */
	toolErrors: ToolCallError[];
}

/**
 * Parse `claude --output-format stream-json` NDJSON output. The trailing
 * `result` event carries the session totals (result text, num_turns, cost);
 * the assistant events' `tool_use` blocks attribute those turns to the
 * specific MCP tools they were spent on, and the `tool_result` events flag
 * which of those calls errored (matched back to the tool by `tool_use_id`).
 * Unrecognized or truncated lines are skipped, so a stream cut short by a
 * kill still yields the attribution it recorded up to that point.
 */
export function parseClaudeStream(stdout: string): ParsedClaudeStream {
	let session: ClaudeSession | undefined;
	const toolCalls: ToolCallCounts = {};
	const toolErrors: ToolCallError[] = [];
	const toolNameById = new Map<string, string>();
	for (const line of stdout.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		let event: unknown;
		try {
			event = JSON.parse(trimmed);
		} catch {
			continue;
		}
		const assistant = assistantEventSchema.safeParse(event);
		if (assistant.success) {
			for (const block of assistant.data.message.content) {
				if (block.type === 'tool_use' && block.name) {
					toolCalls[block.name] = (toolCalls[block.name] ?? 0) + 1;
					if (block.id) toolNameById.set(block.id, block.name);
				}
			}
			continue;
		}
		const toolResult = toolResultEventSchema.safeParse(event);
		if (toolResult.success) {
			for (const block of toolResult.data.message.content) {
				if (block.type !== 'tool_result' || !block.is_error) continue;
				// An id with no registered tool_use can only come from a corrupted
				// stream — attribute it anyway rather than dropping the failure.
				const tool = (block.tool_use_id && toolNameById.get(block.tool_use_id)) ?? '(unknown)';
				toolErrors.push({ tool, message: toolResultText(block.content) });
			}
			continue;
		}
		const result = resultEventSchema.safeParse(event);
		if (result.success) session = result.data;
	}
	return { session, toolCalls, toolErrors };
}

/** Default per-attempt wall-clock cap for a `claude` build. Generous enough for
 *  legitimately slow builds (the heaviest mcp cases average ~18 min) while still
 *  bounding a wedged subprocess so it can't hold an eval lane indefinitely. */
export const DEFAULT_MCP_BUILD_TIMEOUT_MS = 1_800_000; // 30 min

/** Grace period between SIGTERM and SIGKILL when killing a timed-out build. */
const KILL_GRACE_MS = 5_000;

/** Everything a single `claude -p` build needs beyond the prompt + MCP config. */
export interface McpBuildSettings {
	/** MCP server name in the staged config; also derives the tool allowlist. */
	serverName: string;
	/** Anthropic model id passed to `claude -p --model`. */
	model: string;
	/** Retries per build when no WORKFLOW_ID is returned. */
	maxAttempts: number;
	/** MCP_TIMEOUT (ms) env passed to the subprocess — bounds a single MCP tool call. */
	mcpTimeoutMs: number;
	/** Wall-clock cap (ms) for the whole `claude` subprocess per attempt. On expiry
	 *  the process is killed (SIGTERM→SIGKILL) so a hung build can't strand its lane.
	 *  Omit or set 0 to disable (e.g. the standalone batch builder, which can't
	 *  deadlock a lane). Distinct from `mcpTimeoutMs`, which is per MCP call. */
	buildTimeoutMs?: number;
	/** Working directory for the subprocess (loads that project's Claude config/skills). */
	buildCwd?: string;
	/** When set, instruct the model to create the workflow in this n8n project. */
	projectId?: string;
}

interface BuildAttempt {
	session: ClaudeSession | undefined;
	/** Per-tool `tool_use` counts parsed from the attempt's event stream —
	 *  populated even for timed-out attempts (partial streams still attribute). */
	toolCalls: ToolCallCounts;
	/** Failed tool calls from the attempt's stream, same partial-stream rules. */
	toolErrors: ToolCallError[];
	logFile: string;
	/** True when the attempt was killed by the build timeout rather than exiting. */
	timedOut: boolean;
	/** Set when the subprocess never spawned (e.g. `claude` missing from PATH).
	 *  Deterministic for this environment — callers should not retry. */
	spawnError?: string;
}

async function runClaude(
	userMessage: string,
	settings: McpBuildSettings,
	mcpConfigPath: string,
	allowedTools: readonly string[],
	logFile: string,
): Promise<BuildAttempt> {
	return await new Promise((resolve) => {
		const claudeArgs = [
			'-p',
			userMessage,
			'--model',
			settings.model,
			'--mcp-config',
			mcpConfigPath,
			'--strict-mcp-config',
			'--allowedTools',
			...allowedTools,
			// stream-json (which requires --verbose in -p mode) instead of json:
			// the per-event stream is what lets us attribute turns to the MCP
			// tools they were spent on, and is persisted verbatim for forensics.
			'--output-format',
			'stream-json',
			'--verbose',
		];
		const child = spawn('claude', claudeArgs, {
			env: { ...process.env, MCP_TIMEOUT: String(settings.mcpTimeoutMs) },
			stdio: ['ignore', 'pipe', 'pipe'],
			cwd: settings.buildCwd,
		});
		let stdout = '';
		let stderr = '';
		let timedOut = false;
		let spawnError: Error | undefined;
		let settled = false;
		let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
		let killTimer: ReturnType<typeof setTimeout> | undefined;

		const clearTimers = () => {
			if (timeoutTimer) clearTimeout(timeoutTimer);
			if (killTimer) clearTimeout(killTimer);
		};

		// Resolve only once, and only after the process is actually dead (so the
		// caller — and the lane allocator — never overlaps with a live subprocess).
		const settle = (
			session: ClaudeSession | undefined,
			toolCalls: ToolCallCounts,
			toolErrors: ToolCallError[],
		) => {
			if (settled) return;
			settled = true;
			clearTimers();
			resolve({
				session,
				toolCalls,
				toolErrors,
				logFile,
				timedOut,
				spawnError: spawnError?.message,
			});
		};

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('close', () => {
			// Persist the raw event stream (or a structured fallback) for forensics
			// regardless of parse success — including spawn failures, whose error is
			// recorded here so the log path reported to the caller stays truthful.
			const fallback = spawnError
				? JSON.stringify({ subtype: 'spawn-error', error: spawnError.message })
				: timedOut
					? '{"subtype":"timeout"}'
					: '{}';
			// A killed build's stream ends without a `result` event — append the
			// timeout marker as a trailing line so the log itself says why it stopped.
			const stream =
				timedOut && stdout ? `${stdout.replace(/\n$/, '')}\n{"subtype":"timeout"}\n` : stdout;
			writeFileSync(logFile, stream || stderr || fallback);
			let session: ClaudeSession | undefined;
			let toolCalls: ToolCallCounts = {};
			let toolErrors: ToolCallError[] = [];
			if (!spawnError) {
				// Parse even a timed-out stream: what a hung build spent its turns on
				// is exactly the forensic signal we want. `session` stays undefined on
				// timeout — the killed process never emitted its `result` event, and a
				// stray one must not turn a killed attempt into a success.
				const parsed = parseClaudeStream(stdout);
				toolCalls = parsed.toolCalls;
				toolErrors = parsed.toolErrors;
				if (!timedOut) session = parsed.session;
			}
			settle(session, toolCalls, toolErrors);
		});
		child.on('error', (error) => {
			// No pid = the process never spawned (e.g. `claude` not on PATH). Node
			// guarantees 'close' still fires after a failed spawn, so record the
			// error and let the close handler write the log and settle — settling
			// here would report a log path that isn't written yet. Other 'error'
			// causes (e.g. kill failures) keep the settle-now behavior.
			if (child.pid === undefined) {
				spawnError = error;
				return;
			}
			settle(undefined, {}, []);
		});

		if (settings.buildTimeoutMs && settings.buildTimeoutMs > 0) {
			timeoutTimer = setTimeout(() => {
				// Mark first so the eventual 'close' is reported as a timeout, then kill
				// (escalating to SIGKILL). We settle from 'close' once the process dies.
				timedOut = true;
				child.kill('SIGTERM');
				killTimer = setTimeout(() => {
					try {
						child.kill('SIGKILL');
					} catch {
						// process may already be gone
					}
				}, KILL_GRACE_MS);
			}, settings.buildTimeoutMs);
		}
	});
}

// ---------------------------------------------------------------------------
// Prompt construction + workflow-id extraction
// ---------------------------------------------------------------------------

/**
 * Flatten an authored conversation into a single MCP build prompt. The first
 * user turn is the request; any further user turns are appended as additive
 * refinements (see the `mcp` tier's "fair when flattened" contract).
 */
export function buildPromptFromConversation(conversation: ConversationTurn[]): string {
	const [firstUserTurn, ...remainingUserTurns] = conversation
		.filter((turn) => turn.role === 'user')
		.map((turn) => turn.text.trim())
		.filter((text) => text.length > 0);

	if (!firstUserTurn) return conversation[0]?.text ?? '';
	if (remainingUserTurns.length === 0) return firstUserTurn;

	return [
		firstUserTurn,
		'Additional details from the user:',
		...remainingUserTurns.map((turn, index) => `${String(index + 1)}. ${turn}`),
		'',
		"Use all details above as requirements. Configure all nodes as completely as possible and don't ask me for credentials; I'll set them up later.",
	].join('\n\n');
}

/** Extract the last `WORKFLOW_ID=<id>` token from the model's final message. */
export function tailWorkflowId(text: string): string | null {
	const matches = [...text.matchAll(/WORKFLOW_ID=([A-Za-z0-9_-]+)/g)];
	return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

/** The full instruction appended to every build prompt: create the workflow,
 *  then echo its id in a machine-parseable trailer. */
function buildUserMessage(conversation: ConversationTurn[], settings: McpBuildSettings): string {
	const projectInstruction = settings.projectId
		? `\n\nWhen calling create_workflow_from_code, pass projectId: '${settings.projectId}' so the workflow is created in that n8n project.`
		: '';

	return `${buildPromptFromConversation(conversation)}${projectInstruction}

---
After you have created the workflow with create_workflow_from_code, print a final line of the exact form:

WORKFLOW_ID=<id>

where <id> is the workflowId returned by create_workflow_from_code. Emit it verbatim, no quotes, no markdown.`;
}

// ---------------------------------------------------------------------------
// Single-workflow build (retry loop)
// ---------------------------------------------------------------------------

export interface McpBuildResult {
	/** The created workflow's id, or null if every attempt failed. */
	workflowId: string | null;
	/** Anthropic spend summed across every attempt (USD) — failed attempts cost money too. */
	cost: number;
	/** Assistant turns summed across every attempt. */
	turns: number;
	/** `tool_use` calls summed across every attempt, keyed by full tool name
	 *  (e.g. `mcp__n8n-local__create_workflow_from_code`) — attributes `turns`
	 *  to the specific MCP tools they were spent on. Timed-out attempts
	 *  contribute the calls their partial stream recorded. */
	toolCalls: ToolCallCounts;
	/** Failed tool calls across every attempt, in stream order, with truncated
	 *  error text — the failure subset of `toolCalls` (turns burned on retries
	 *  after validation/HTTP errors show up here). */
	toolErrors: ToolCallError[];
	/** `claude` wall-clock summed across every attempt (ms). */
	durationMs: number;
	/** Path to the last attempt's captured `claude` event stream (NDJSON), for post-mortem. */
	logFile: string | null;
	/** Short reason for the final failure (e.g. `no-stdout`, a claude subtype). */
	failureReason?: string;
}

/**
 * Build one workflow via `claude -p` against a staged MCP config, retrying up to
 * `settings.maxAttempts` until the model emits a `WORKFLOW_ID`. Never throws —
 * a failed build resolves with `workflowId: null` so a batch can continue.
 *
 * The log lines are surfaced through `log` (defaults to `console.log`) so the
 * standalone builder and the eval CLI can route them to their own sinks.
 */
export async function buildWorkflowViaMcp(opts: {
	conversation: ConversationTurn[];
	slug: string;
	iteration: number;
	mcpConfigPath: string;
	settings: McpBuildSettings;
	logDir: string;
	log?: (message: string) => void;
}): Promise<McpBuildResult> {
	const { conversation, slug, iteration, mcpConfigPath, settings, logDir } = opts;
	const log = opts.log ?? ((message: string) => console.log(message));
	const allowedTools = buildAllowedTools(settings.serverName);
	const userMessage = buildUserMessage(conversation, settings);

	let workflowId: string | null = null;
	let lastLogFile: string | null = null;
	let failureReason: string | undefined;
	let totalCostUsd = 0;
	let totalTurns = 0;
	let totalDurationMs = 0;
	const totalToolCalls: ToolCallCounts = {};
	const totalToolErrors: ToolCallError[] = [];

	for (let attempt = 1; attempt <= settings.maxAttempts; attempt++) {
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		// .jsonl: the persisted log is the verbatim stream-json event stream.
		const logFile = join(
			logDir,
			`${slug}-iter${String(iteration)}-attempt${String(attempt)}-${ts}.jsonl`,
		);
		lastLogFile = logFile;
		const { session, toolCalls, toolErrors, timedOut, spawnError } = await runClaude(
			userMessage,
			settings,
			mcpConfigPath,
			allowedTools,
			logFile,
		);
		totalCostUsd += session?.total_cost_usd ?? 0;
		totalTurns += session?.num_turns ?? 0;
		totalDurationMs += session?.duration_ms ?? 0;
		mergeToolCalls(totalToolCalls, toolCalls);
		totalToolErrors.push(...toolErrors);
		const id = session?.result ? tailWorkflowId(session.result) : null;
		if (id) {
			workflowId = id;
			failureReason = undefined;
			break;
		}
		if (spawnError) {
			// `claude` could not be spawned at all (e.g. not installed / not on
			// PATH) — deterministic for this environment, so retrying can't succeed.
			failureReason = 'spawn-error';
			log(
				`  [${slug}#${String(iteration)}] attempt ${String(attempt)}: could not spawn claude (${spawnError}) — not retrying (log: ${logFile})`,
			);
			break;
		}
		if (timedOut) {
			// A timeout means the build hung, not that it failed fast — retrying would
			// likely hang again and burn another full timeout. Stop here so the lane is
			// freed promptly; the case is recorded as a build failure.
			failureReason = 'timeout';
			log(
				`  [${slug}#${String(iteration)}] attempt ${String(attempt)}: build timed out after ${String(settings.buildTimeoutMs)}ms — killed, not retrying (log: ${logFile})`,
			);
			break;
		}
		failureReason = session?.subtype ?? 'no-stdout';
		log(
			`  [${slug}#${String(iteration)}] attempt ${String(attempt)}: no WORKFLOW_ID (${failureReason}, log: ${logFile})`,
		);
	}

	if (!workflowId) {
		log(`  [${slug}#${String(iteration)}] FAILED after ${String(settings.maxAttempts)} attempts`);
	} else {
		log(`  [${slug}#${String(iteration)}] ok → ${workflowId}`);
	}

	return {
		workflowId,
		cost: totalCostUsd,
		turns: totalTurns,
		toolCalls: totalToolCalls,
		toolErrors: totalToolErrors,
		durationMs: totalDurationMs,
		logFile: lastLogFile,
		failureReason: workflowId ? undefined : failureReason,
	};
}
