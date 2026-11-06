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
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from 'fs';
import { setTimeout as delay } from 'node:timers/promises';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { z } from 'zod';

import {
	type ClaudeSession,
	type ClaudeTurnCapture,
	type CreatedAgent,
	parseClaudeStream,
} from './claude-stream';
import { isTransientProviderError, providerRetryBackoffMs } from '../harness/transient-error';
import type { BuildTimeout, ConversationTurn, TranscriptTurn, WorkflowTestCase } from '../types';

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

// Every staged config embeds a bearer token, so exit cleanup is intrinsic to
// staging: writeMcpConfig tracks each path and the exit hook unlinks whatever
// is left. Callers that finish normally unlink eagerly via unlinkStagedMcpConfig.
const stagedConfigPaths = new Set<string>();
process.on('exit', () => {
	for (const staged of stagedConfigPaths) unlinkStagedMcpConfig(staged);
});

/** Eagerly remove a staged MCP config (and drop it from exit cleanup). */
export function unlinkStagedMcpConfig(path: string): void {
	stagedConfigPaths.delete(path);
	try {
		unlinkSync(path);
	} catch {
		// best-effort
	}
}

function writeMcpConfig(serverName: string, block: unknown, filePrefix: string): string {
	// A random suffix (not just pid+time) keeps concurrent lane stages from
	// colliding when several are written in the same millisecond.
	const tmpPath = join(
		tmpdir(),
		`${filePrefix}-${String(process.pid)}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}.json`,
	);
	writeFileSync(tmpPath, JSON.stringify({ mcpServers: { [serverName]: block } }), { mode: 0o600 });
	stagedConfigPaths.add(tmpPath);
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
 * Stage an MCP config for one build directly from a lane URL + API key, with no
 * dependency on `~/.claude.json`. Used by the fused `--build-via-mcp` path where
 * the eval CLI mints an MCP key per build user and points `claude` at that
 * lane's MCP server. Returns the temp config path; removed on process exit, or
 * earlier via unlinkStagedMcpConfig.
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
 * Classification of EVERY test-case schema key for the fused `--build-via-mcp`
 * build path (the standalone manifest builder does not consult this filter).
 * `orchestrator-only` keys are build-side setup the orchestrator seeds
 * before driving the in-product agent (conversation/thread seeding), while
 * `claude` receives only the conversation — a case relying on
 * them would build without its prerequisites and fail misleadingly, so callers
 * skip cases that declare them.
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
	// Caps simulated-user follow-ups, in the orchestrator chat loop and in the
	// multi-turn `claude` loop alike.
	messageBudget: 'supported',
	// Drives the Instance AI orchestrator's progressive-building loop; a
	// single-shot `claude` build has no mode to set, so a case that pins it
	// explicitly must run through the orchestrator.
	buildMode: 'orchestrator-only',
	promptVersion: 'orchestrator-only',
	allowUserExecution: 'orchestrator-only',
	requiresMemoryCompaction: 'orchestrator-only',
	// Judged by the harness after the build, against the `claude` transcript;
	// declaring them needs no build-side setup.
	processExpectations: 'supported',
	outcomeExpectations: 'supported',
	// Forbidden legacy key — the schema rejects it at load, so it can never
	// reach this check; classified only to keep the map schema-complete.
	buildExpectations: 'supported',
	// The fused --build-via-mcp path seeds these into the per-build member
	// user's personal project (the standalone manifest builder cannot — it has
	// no n8n session).
	credentials: 'supported',
	// The fixture server, Chromium and the relay are booted around the build;
	// `claude` gets the conversation only and no browser.
	credentialFixture: 'orchestrator-only',
	// Restored into the build user's project before `claude` starts; the earlier
	// conversation goes to `claude` as text (see run/mcp-seed.ts).
	seed: 'supported',
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
		if (key === 'allowUserExecution') return value === true;
		if (value === undefined || value === null || value === '') return false;
		// An empty array declares nothing to seed.
		return !Array.isArray(value) || value.length > 0;
	});
}

const CLAUDE_ENV_AUTH = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN'];

/**
 * Why an MCP build cannot authenticate, or undefined when it can. Without a build
 * cwd every attempt runs with an empty CLAUDE_CONFIG_DIR, so a stored `claude`
 * login is not visible and auth must come from the environment.
 */
export function isolatedClaudeAuthError(buildCwd: string | undefined): string | undefined {
	if (buildCwd || CLAUDE_ENV_AUTH.some((name) => process.env[name])) return undefined;
	return `MCP builds without --build-cwd run claude isolated from ~/.claude — set one of ${CLAUDE_ENV_AUTH.join(', ')}, or pass --build-cwd to use the host claude setup.`;
}

// ---------------------------------------------------------------------------
// `claude -p` subprocess invocation
// ---------------------------------------------------------------------------

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
	/** Working directory for the subprocess (loads that project's Claude config/skills).
	 *  When omitted, every build attempt runs isolated: an empty temp config dir and
	 *  cwd, no built-in tools, and auth from the environment only. */
	buildCwd?: string;
	/** When set, instruct the model to create the workflow in this n8n project. */
	projectId?: string;
}

/** Throwaway Claude home for one build attempt, shared by its turns so
 *  `--resume` finds the session. */
interface IsolatedClaudeHome {
	root: string;
	configDir: string;
	workDir: string;
}

function createIsolatedClaudeHome(): IsolatedClaudeHome {
	const root = mkdtempSync(join(tmpdir(), 'n8n-mcp-build-'));
	const configDir = join(root, 'config');
	const workDir = join(root, 'work');
	mkdirSync(configDir);
	mkdirSync(workDir);
	return { root, configDir, workDir };
}

function removeIsolatedClaudeHome(home: IsolatedClaudeHome): void {
	try {
		rmSync(home.root, { recursive: true, force: true });
	} catch {
		// best-effort
	}
}

/** Per-attempt context shared by every turn of one conversation. */
interface ClaudeRunContext {
	settings: McpBuildSettings;
	mcpConfigPath: string;
	allowedTools: readonly string[];
	isolation?: IsolatedClaudeHome;
}

interface ClaudeTurnOptions {
	userMessage: string;
	logFile: string;
	/** Continue this `claude` session instead of starting a new one. */
	resumeSessionId?: string;
	/** Wall-clock cap for this turn; 0 or undefined disables it. */
	timeoutMs?: number;
}

interface TurnAttempt {
	capture: ClaudeTurnCapture;
	/** True when the turn was killed by the build timeout rather than exiting. */
	timedOut: boolean;
	/** Set when the subprocess never spawned (e.g. `claude` missing from PATH).
	 *  Deterministic for this environment — callers should not retry. */
	spawnError?: string;
}

function emptyCapture(): ClaudeTurnCapture {
	return {
		session: undefined,
		sessionId: undefined,
		steps: [],
		agentText: '',
		createdWorkflowIds: [],
		createdAgents: [],
		updatedWorkflowIds: [],
		updatedAgentIds: [],
	};
}

/** `claude` saves a large MCP tool result in its config dir and gives the model only a
 *  preview, so the model needs `Read` there. Both spellings: macOS resolves `/var` to `/private/var`. */
function isolatedReadRules(home: IsolatedClaudeHome): string[] {
	const dirs = uniqueDefined([home.configDir, realpathSync(home.configDir)]);
	return dirs.map((dir) => `Read(/${dir}/**)`);
}

function claudeArgs(context: ClaudeRunContext, turn: ClaudeTurnOptions): string[] {
	const { isolation } = context;
	return [
		'-p',
		turn.userMessage,
		'--model',
		context.settings.model,
		'--mcp-config',
		context.mcpConfigPath,
		'--strict-mcp-config',
		'--allowedTools',
		...context.allowedTools,
		...(isolation ? isolatedReadRules(isolation) : []),
		'--output-format',
		'stream-json',
		'--verbose',
		...(turn.resumeSessionId ? ['--resume', turn.resumeSessionId] : []),
		// The MCP server's tools plus `Read` of saved tool results: no other host access.
		...(isolation ? ['--tools', 'Read', '--permission-mode', 'dontAsk'] : []),
	];
}

async function runClaude(context: ClaudeRunContext, turn: ClaudeTurnOptions): Promise<TurnAttempt> {
	const { settings, isolation } = context;
	const { logFile } = turn;
	return await new Promise((resolve) => {
		const child = spawn('claude', claudeArgs(context, turn), {
			env: {
				...process.env,
				MCP_TIMEOUT: String(settings.mcpTimeoutMs),
				...(isolation
					? {
							CLAUDE_CONFIG_DIR: isolation.configDir,
							CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
							// An empty home has no memory: without this, `claude` spends a call reading it.
							CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
						}
					: {}),
			},
			stdio: ['ignore', 'pipe', 'pipe'],
			cwd: isolation?.workDir ?? settings.buildCwd,
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
		const settle = (capture: ClaudeTurnCapture) => {
			if (settled) return;
			settled = true;
			clearTimers();
			resolve({ capture, timedOut, spawnError: spawnError?.message });
		};

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on('close', () => {
			// Persist stdout (or a structured fallback) for forensics regardless of
			// parse success — including spawn failures, whose error is recorded here
			// so the log path reported to the caller stays truthful.
			const fallback = spawnError
				? JSON.stringify({ subtype: 'spawn-error', error: spawnError.message })
				: timedOut
					? '{"subtype":"timeout"}'
					: '{}';
			// Appended: every turn of one attempt shares the log file.
			appendFileSync(logFile, `${(stdout || stderr || fallback).trimEnd()}\n`);
			// A killed turn still keeps its partial transcript; only the session
			// summary is dropped, so the caller treats it as unfinished.
			const capture = spawnError
				? emptyCapture()
				: parseClaudeStream(stdout, sanitizeServerName(settings.serverName));
			if (timedOut) capture.session = undefined;
			settle(capture);
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
			settle(emptyCapture());
		});

		if (turn.timeoutMs && turn.timeoutMs > 0) {
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
			}, turn.timeoutMs);
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

/** Append the harness instructions to a build prompt: create the workflow in
 *  the right project, then (unless `withTrailer` is false) echo its id in a
 *  machine-parseable trailer. */
function withHarnessInstructions(
	prompt: string,
	settings: McpBuildSettings,
	withTrailer = true,
): string {
	const projectInstruction = settings.projectId
		? `\n\nWhen calling create_workflow_from_code, pass projectId: '${settings.projectId}' so the workflow is created in that n8n project.`
		: '';
	if (!withTrailer) return `${prompt}${projectInstruction}`;

	return `${prompt}${projectInstruction}

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
	/** The n8n Agent `claude` created, when the request asked for an Agent. */
	agent?: CreatedAgent;
	/** Anthropic spend summed across every attempt (USD) — failed attempts cost money too. */
	cost: number;
	/** Assistant turns summed across every attempt. */
	turns: number;
	/** `claude` wall-clock summed across every attempt (ms). */
	durationMs: number;
	/** Path to the last attempt's captured `claude` output, for post-mortem. */
	logFile: string | null;
	/** Short reason for the final failure (e.g. `no-stdout`, a claude subtype). */
	failureReason?: string;
	/** The last attempt's conversation: user messages, narration and MCP tool calls. */
	transcript: TranscriptTurn[];
	/** Set when the build timeout ended the conversation. Anything saved before
	 *  is graded, but its verdicts are kept out of the rate. */
	timeout?: BuildTimeout;
	/** True when the last attempt's conversation ran to its end, so a missing
	 *  workflow is the builder's answer rather than a crash or a timeout. */
	finished?: boolean;
}

/** The simulated user of a multi-turn MCP build. `UserProxyLlm` satisfies it. */
export interface McpConversationDriver {
	recordAssistantMessage(text: string): void;
	decideFollowUp(): Promise<
		| { kind: 'followUp'; message: string; renameWorkflowTo?: string; runWorkflowId?: string }
		| { kind: 'done' }
	>;
}

interface ConversationAttempt {
	workflowId: string | null;
	agent?: CreatedAgent;
	transcript: TranscriptTurn[];
	cost: number;
	turns: number;
	durationMs: number;
	/** The last turn's session; undefined when that turn never finished. */
	lastSession: ClaudeSession | undefined;
	timedOut: boolean;
	/** The user turn (1-based) in flight, or about to start, when time ran out. */
	timeoutTurn?: number;
	spawnError?: string;
}

/**
 * Run one conversation with `claude`: the opening message, then (with a driver)
 * simulated follow-ups through `--resume` until the driver is done. The build
 * timeout bounds the whole conversation.
 */
async function runConversationAttempt(opts: {
	context: ClaudeRunContext;
	opening: { text: string; sent: string };
	driver?: McpConversationDriver;
	logFile: string;
	label: string;
	log: (message: string) => void;
	seededWorkflowIds?: string[];
	seededAgentIds?: string[];
}): Promise<ConversationAttempt> {
	const { context, driver, logFile, label, log } = opts;
	const timeoutMs = context.settings.buildTimeoutMs ?? 0;
	const deadline = timeoutMs > 0 ? Date.now() + timeoutMs : undefined;
	const attempt: ConversationAttempt = {
		workflowId: null,
		transcript: [],
		cost: 0,
		turns: 0,
		durationMs: 0,
		lastSession: undefined,
		timedOut: false,
	};
	const createdWorkflowIds: string[] = [];
	const updatedWorkflowIds: string[] = [];
	const updatedAgentIds: string[] = [];
	let trailerWorkflowId: string | null = null;
	let sessionId: string | undefined;
	let next: { text: string; sent: string } | undefined = opts.opening;

	while (next) {
		const remainingMs = deadline === undefined ? undefined : deadline - Date.now();
		if (remainingMs !== undefined && remainingMs <= 0) {
			attempt.timedOut = true;
			attempt.timeoutTurn = attempt.transcript.length + 1;
			break;
		}
		const turn = await runClaude(context, {
			userMessage: next.sent,
			logFile,
			resumeSessionId: sessionId,
			timeoutMs: remainingMs,
		});
		const { capture } = turn;
		attempt.transcript.push({ userMessage: next.text, steps: capture.steps });
		// `total_cost_usd` covers the whole session, including turns before `--resume`;
		// `num_turns` and `duration_ms` cover only this run.
		attempt.cost = capture.session?.total_cost_usd ?? attempt.cost;
		attempt.turns += capture.session?.num_turns ?? 0;
		attempt.durationMs += capture.session?.duration_ms ?? 0;
		attempt.lastSession = capture.session;
		createdWorkflowIds.push(...capture.createdWorkflowIds);
		updatedWorkflowIds.push(...capture.updatedWorkflowIds);
		updatedAgentIds.push(...capture.updatedAgentIds);
		attempt.agent = capture.createdAgents.at(-1) ?? attempt.agent;
		trailerWorkflowId =
			tailWorkflowId(`${capture.agentText}\n${capture.session?.result ?? ''}`) ?? trailerWorkflowId;
		sessionId = capture.sessionId ?? sessionId;
		attempt.timedOut = turn.timedOut;
		if (turn.timedOut) attempt.timeoutTurn = attempt.transcript.length;
		attempt.spawnError = turn.spawnError;

		if (!driver || turn.timedOut || turn.spawnError) break;
		if (capture.session?.subtype !== 'success' || !sessionId) break;

		driver.recordAssistantMessage(capture.agentText);
		const decision = await beforeDeadline(driver.decideFollowUp(), deadline);
		if (decision === undefined) {
			// The simulated user did not answer in time: the conversation is unfinished.
			// The proxy's model call may still settle later; it no longer holds the lane.
			attempt.timedOut = true;
			attempt.timeoutTurn = attempt.transcript.length + 1;
			attempt.lastSession = undefined;
			break;
		}
		if (decision.kind === 'done') break;
		if (decision.renameWorkflowTo !== undefined || decision.runWorkflowId !== undefined) {
			log(
				`  [${label}] simulated user asked for a rename or run — not supported over MCP, ignored`,
			);
		}
		next = { text: decision.message, sent: decision.message };
	}

	// The tool result is authoritative; the trailer covers a missed or unparsable result.
	// A seeded case may edit an existing workflow, or only inspect one: a finished
	// conversation then builds that workflow, as on the Instance AI arm.
	const finished = attempt.lastSession?.subtype === 'success';
	const agentId = updatedAgentIds.at(-1) ?? (finished ? opts.seededAgentIds?.[0] : undefined);
	attempt.agent ??= agentId === undefined ? undefined : { id: agentId };
	attempt.workflowId =
		createdWorkflowIds.at(-1) ??
		trailerWorkflowId ??
		updatedWorkflowIds.at(-1) ??
		(finished ? (opts.seededWorkflowIds?.[0] ?? null) : null);
	return attempt;
}

/** Resolve with `promise`, or with undefined once `deadline` (epoch ms) passes. */
async function beforeDeadline<T>(promise: Promise<T>, deadline: number | undefined) {
	if (deadline === undefined) return await promise;
	const timer = new AbortController();
	try {
		return await Promise.race([
			promise,
			delay(Math.max(0, deadline - Date.now()), undefined, { signal: timer.signal }).catch(
				() => undefined,
			),
		]);
	} finally {
		timer.abort();
	}
}

/** Provider-outage evidence lives in the session's free-text result; keep enough
 *  of it to classify on without dragging a whole transcript into an error. */
function truncateForReason(result: unknown): string | undefined {
	if (typeof result !== 'string') return undefined;
	const text = result.trim();
	if (!text) return undefined;
	return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

/**
 * Build one workflow via `claude -p` against a staged MCP config. Never throws —
 * a failed build resolves with `workflowId: null` so a batch can continue.
 *
 * Without `createDriver`, the whole conversation is flattened into one prompt and
 * an attempt is retried (up to `settings.maxAttempts`) when it yields no workflow.
 * With `createDriver`, only the first user turn is sent and a fresh simulated user
 * drives the follow-ups of each attempt. A conversation that completes without a
 * workflow is a build failure and is not retried; only an unfinished one is.
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
	createDriver?: () => McpConversationDriver;
	/** Harness context sent before the opening message but kept out of the transcript. */
	openingMessagePrefix?: string;
	/** Sent and recorded ahead of the opening message, e.g. the attached workflow. */
	openingNote?: string;
	/** Harness context sent with the opening message but kept out of the transcript. */
	openingMessageSuffix?: string;
	/** Workflows the case seeded, the attached one first. */
	seededWorkflowIds?: string[];
	/** Agents the case seeded, the attached one first. */
	seededAgentIds?: string[];
}): Promise<McpBuildResult> {
	const { conversation, slug, iteration, mcpConfigPath, settings, logDir, createDriver } = opts;
	const log = opts.log ?? ((message: string) => console.log(message));
	const allowedTools = buildAllowedTools(settings.serverName);
	const label = `${slug}#${String(iteration)}`;
	const openingText = [
		opts.openingNote,
		createDriver
			? (conversation.find((turn) => turn.role === 'user')?.text ?? '')
			: buildPromptFromConversation(conversation),
	]
		.filter(Boolean)
		.join(' ');
	// The trailer tells `claude` to build in its first reply, which would keep it
	// from asking a clarifying question. With a driver, the tool result gives the id.
	const opening = {
		text: openingText,
		sent: withHarnessInstructions(
			`${[opts.openingMessagePrefix, openingText].filter(Boolean).join('\n\n')}${opts.openingMessageSuffix ?? ''}`,
			settings,
			!createDriver,
		),
	};

	let workflowId: string | null = null;
	let agent: CreatedAgent | undefined;
	let lastLogFile: string | null = null;
	let failureReason: string | undefined;
	let transcript: TranscriptTurn[] = [];
	let totalCostUsd = 0;
	let totalTurns = 0;
	let totalDurationMs = 0;
	let attemptsUsed = 0;
	let timeout: BuildTimeout | undefined;
	let finished = false;

	for (let attempt = 1; attempt <= settings.maxAttempts; attempt++) {
		attemptsUsed = attempt;
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		const logFile = join(
			logDir,
			`${slug}-iter${String(iteration)}-attempt${String(attempt)}-${ts}.jsonl`,
		);
		lastLogFile = logFile;
		const isolation = settings.buildCwd ? undefined : createIsolatedClaudeHome();
		let result: ConversationAttempt;
		try {
			result = await runConversationAttempt({
				context: { settings, mcpConfigPath, allowedTools, isolation },
				opening,
				driver: createDriver?.(),
				logFile,
				label,
				log,
				seededWorkflowIds: opts.seededWorkflowIds,
				seededAgentIds: opts.seededAgentIds,
			});
		} finally {
			if (isolation) removeIsolatedClaudeHome(isolation);
		}
		const { lastSession: session, timedOut, spawnError } = result;
		totalCostUsd += result.cost;
		totalTurns += result.turns;
		totalDurationMs += result.durationMs;
		transcript = result.transcript;
		agent = result.agent;
		finished = session?.subtype === 'success' && !timedOut;
		timeout = timedOut
			? {
					kind: 'conversation',
					turn: result.timeoutTurn ?? result.transcript.length,
					elapsedMs: settings.buildTimeoutMs ?? 0,
				}
			: undefined;
		if (result.workflowId || result.agent) {
			workflowId = result.workflowId;
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
		// The session's own result text, not just its subtype: a provider outage
		// inside `claude` (AI_APICallError / overloaded_error / HTTP 529) shows up
		// ONLY there, and the orchestrator classifies off this string. Without it
		// `findProviderOutage` has nothing to match and an upstream outage is
		// filed as a builder failure (TRUST-374). Truncated — it rides in an
		// error message, and the tail is boilerplate.
		failureReason = [session?.subtype ?? 'no-stdout', truncateForReason(session?.result)]
			.filter(Boolean)
			.join(': ');
		if (createDriver && session?.subtype === 'success') {
			// The conversation ran to its end: retrying would give the builder a
			// second chance that the Instance AI arm does not get.
			failureReason = ['no-workflow', truncateForReason(session.result)].filter(Boolean).join(': ');
			log(
				`  [${label}] attempt ${String(attempt)}: conversation ended without a workflow — not retrying (log: ${logFile})`,
			);
			break;
		}
		log(
			`  [${slug}#${String(iteration)}] attempt ${String(attempt)}: no WORKFLOW_ID (${failureReason}, log: ${logFile})`,
		);
		// A provider outage is upstream of every lane and every attempt, so an
		// instant retry just re-hits it and burns the remaining attempts at the
		// speed of the failures. Same backoff the non-MCP build path uses.
		if (isTransientProviderError(failureReason) && attempt < settings.maxAttempts) {
			const backoffMs = providerRetryBackoffMs(attempt);
			log(
				`  [${slug}#${String(iteration)}] provider outage — waiting ${String(Math.round(backoffMs / 1000))}s before attempt ${String(attempt + 1)}`,
			);
			await delay(backoffMs);
		}
	}

	const built = [workflowId, agent ? `agent ${agent.id}` : undefined].filter(Boolean).join(', ');
	if (!built) {
		const attempts = attemptsUsed === 1 ? '1 attempt' : `${String(attemptsUsed)} attempts`;
		log(`  [${slug}#${String(iteration)}] FAILED after ${attempts}`);
	} else {
		log(`  [${slug}#${String(iteration)}] ok → ${built}`);
	}

	return {
		workflowId,
		...(agent ? { agent } : {}),
		cost: totalCostUsd,
		turns: totalTurns,
		durationMs: totalDurationMs,
		logFile: lastLogFile,
		failureReason: built ? undefined : failureReason,
		transcript,
		...(timeout ? { timeout } : {}),
		finished,
	};
}
