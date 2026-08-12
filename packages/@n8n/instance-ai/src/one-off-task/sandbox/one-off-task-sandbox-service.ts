/**
 * One-off task sandbox lifecycle (workstream B of the one-off task design —
 * see `docs/one-off-task-sandboxes.md`).
 *
 * A fresh sandbox is created per task on the n8n sandbox service provider,
 * bootstrapped with the pinned pi harness and the harness asset files, driven
 * through pi's JSON event-stream one-shot mode, and destroyed at task end.
 * Secret values are passed only on the harness exec's `env` — never written
 * to a file, never baked into the sandbox.
 */
import type {
	CommandResult,
	ExecuteCommandOptions,
	SandboxFilesystem,
	SandboxInstance,
} from '@n8n/agents/sandbox';
import { OperationalError, UnexpectedError } from 'n8n-workflow';
import { posix } from 'node:path';

import type { Logger } from '../../logger';
import {
	harnessReportSchema,
	ONE_OFF_TASK_PI_VERSION,
	REPORT_PATH,
	SECRETS_MANIFEST_PATH,
	SESSION_DIR,
	TASK_DIR,
	type HarnessReport,
	type HarnessRunResult,
	type OneOffTaskSandbox,
	type SecretsManifest,
} from '../contracts';
import { harnessAssetFiles } from '../harness-assets';
import { scrub } from '../redaction';

/**
 * Hard wall-clock lifetime for the whole sandbox. The sandbox holds decrypted
 * credentials, so its lifetime bounds theirs; when the TTL fires, any running
 * harness exec is aborted and the sandbox is destroyed. Exposed via `ttlMs`
 * so the orchestrating tool can enforce the same bound on its side.
 */
export const ONE_OFF_TASK_SANDBOX_TTL_MS = 15 * 60_000;

/** Per-run prompt file; `@file` on the pi command line avoids shell-escaping a multiline prompt. */
const PROMPT_PATH = `${TASK_DIR}/prompt.md`;

/**
 * Node runtime downloaded into the sandbox at bootstrap. The runner image
 * ships Node 18, but pi 0.84.1 requires >= 22.19, and the sandbox user is
 * non-root (no `npm install -g`, no /usr/local writes) — so bootstrap brings
 * its own Node and installs pi locally under TASK_DIR. Baking both into the
 * runner image is the production path (see the design doc).
 */
export const ONE_OFF_TASK_NODE_VERSION = '22.21.1';

/** `<extracted dir>` is symlinked to `current` so later paths are arch-independent. */
const NODE_BIN_PATH = `${TASK_DIR}/node/current/bin`;

const HARNESS_INSTALL_PREFIX = `${TASK_DIR}/harness`;

const PI_BIN_PATH = `${HARNESS_INSTALL_PREFIX}/node_modules/.bin/pi`;

/**
 * Own budget for the bootstrap install exec: the Node download is seconds,
 * but the npm install of pi's dependency tree can take minutes on the
 * sandbox image. Always additionally capped by the remaining sandbox TTL.
 */
const HARNESS_INSTALL_TIMEOUT_MS = 180_000;

/**
 * How much of pi's stderr to keep for unclean-stop diagnostics. The tail, not
 * the head: startup noise leads, the fatal error (missing LLM key, crash)
 * trails.
 */
const STDERR_TAIL_MAX_CHARS = 8_192;

function createTailBuffer(maxChars: number) {
	let buffer = '';
	return {
		push(chunk: string) {
			buffer = (buffer + chunk).slice(-maxChars);
		},
		get(): string {
			return buffer;
		},
	};
}

/**
 * Grace period between a terminal pi stream event and the exec settling. Pi
 * exits within seconds of settling, but the sandbox service's exec stream has
 * been observed (in production) to lose the final exit event on long
 * JSONL-heavy runs, leaving the client's follow-poll hanging forever. After
 * the grace period the exec is aborted and the outcome is recovered from the
 * report file.
 */
const HARNESS_SETTLE_GRACE_MS = 60_000;

/** Pi stream events that mean the agent loop is done and the process is about to exit. */
const TERMINAL_PI_EVENT_TYPES = new Set(['agent_settled', 'agent_end']);

/**
 * Deliberately narrow matching (verified against pi 0.84.1 `agent-session.js`):
 * the watchdog must never arm without a real terminal signal — a hang mid-run
 * is the TTL's job. The `report_result` tool finishing counts too, because
 * writing the report is the harness's last act.
 */
function isTerminalPiEvent(event: unknown): boolean {
	if (typeof event !== 'object' || event === null) return false;
	const type: unknown = Reflect.get(event, 'type');
	if (typeof type !== 'string') return false;
	if (TERMINAL_PI_EVENT_TYPES.has(type)) return true;
	const toolName: unknown = Reflect.get(event, 'toolName');
	return type === 'tool_execution_end' && toolName === 'report_result';
}

/**
 * Structural superset of the contract's `HarnessRunResult`: adds the stderr
 * tail for unclean-stop debugging. Callers typed against the contract simply
 * ignore the extra field. contracts.ts should eventually gain the optional
 * field (reported, not edited here).
 */
export interface OneOffTaskHarnessRunResult extends HarnessRunResult {
	/** Scrubbed tail of pi's stderr; present only on unclean stops. */
	stderrTail?: string;
}

export interface OneOffTaskSandboxServiceOptions {
	sandbox: SandboxInstance;
	filesystem: SandboxFilesystem;
	logger?: Logger;
	ttlMs?: number;
}

function shellQuote(value: string): string {
	return /^[A-Za-z0-9@_./:=+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

/** Asset keys are workspace-root-relative; absolute keys pass through untouched. */
function resolveSandboxPath(workspaceRoot: string, path: string): string {
	return posix.isAbsolute(path) ? path : posix.join(workspaceRoot, path);
}

/**
 * Incremental JSONL parser over exec stdout chunks. Chunk boundaries do not
 * align with line boundaries, and pi's stdout can carry non-JSON noise (npm
 * warnings, startup diagnostics) — garbage lines are skipped, not fatal.
 */
function createJsonlForwarder(onEvent: (event: unknown) => void, logger?: Logger) {
	let buffer = '';

	const emitLine = (line: string) => {
		const trimmed = line.trim();
		if (!trimmed) return;
		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			return;
		}
		try {
			onEvent(parsed);
		} catch (error) {
			// A consumer bug must not kill a harness run that is mid-task.
			logger?.warn('One-off task event handler threw; event dropped', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return {
		push(chunk: string) {
			buffer += chunk;
			let newlineIndex = buffer.indexOf('\n');
			while (newlineIndex !== -1) {
				emitLine(buffer.slice(0, newlineIndex));
				buffer = buffer.slice(newlineIndex + 1);
				newlineIndex = buffer.indexOf('\n');
			}
		},
		flush() {
			emitLine(buffer);
			buffer = '';
		},
	};
}

export class OneOffTaskSandboxService implements OneOffTaskSandbox {
	readonly ttlMs: number;

	private readonly sandbox: SandboxInstance;

	private readonly filesystem: SandboxFilesystem;

	private readonly logger?: Logger;

	private readonly execute: (
		command: string,
		args?: string[],
		options?: ExecuteCommandOptions,
	) => Promise<CommandResult>;

	/** Aborted on TTL expiry and on destroy — kills any in-flight exec. */
	private readonly lifetimeController = new AbortController();

	private ttlTimer?: NodeJS.Timeout;

	private ttlDeadline?: number;

	private ttlExpired = false;

	private destroyPromise?: Promise<void>;

	private workspaceRootPromise?: Promise<string>;

	private harnessInstalled = false;

	constructor(options: OneOffTaskSandboxServiceOptions) {
		this.sandbox = options.sandbox;
		this.filesystem = options.filesystem;
		this.logger = options.logger;
		this.ttlMs = options.ttlMs ?? ONE_OFF_TASK_SANDBOX_TTL_MS;

		const execute = options.sandbox.executeCommand?.bind(options.sandbox);
		if (!execute) {
			throw new UnexpectedError('One-off task sandbox requires command execution support');
		}
		this.execute = execute;
	}

	/** Wall-clock moment the sandbox self-destructs; undefined before bootstrap arms the TTL. */
	get expiresAt(): Date | undefined {
		return this.ttlDeadline === undefined ? undefined : new Date(this.ttlDeadline);
	}

	async bootstrap(manifest: SecretsManifest): Promise<void> {
		this.assertUsable();
		this.armTtl();

		const root = await this.getWorkspaceRoot();
		const abortSignal = this.lifetimeController.signal;

		// Dirs first: SESSION_DIR must exist before pi's first `--session-dir`
		// launch, and TASK_DIR before the manifest/prompt writes below.
		await this.filesystem.mkdir(posix.join(root, TASK_DIR), { recursive: true, abortSignal });
		await this.filesystem.mkdir(posix.join(root, SESSION_DIR), { recursive: true, abortSignal });

		const writeAssets = Object.entries(harnessAssetFiles).map(
			async ([path, content]) =>
				await this.filesystem.writeFile(resolveSandboxPath(root, path), content, {
					recursive: true,
					abortSignal,
				}),
		);
		const writeManifest = this.filesystem.writeFile(
			posix.join(root, SECRETS_MANIFEST_PATH),
			JSON.stringify(manifest, null, 2),
			{ recursive: true, abortSignal },
		);

		// The install dominates bootstrap latency, so it runs alongside the writes.
		await Promise.all([this.installHarness(abortSignal, root), ...writeAssets, writeManifest]);
	}

	async runHarness(options: {
		prompt: string;
		sessionId: string;
		env: Record<string, string>;
		abortSignal: AbortSignal;
		onEvent: (event: unknown) => void;
	}): Promise<OneOffTaskHarnessRunResult> {
		this.assertUsable();
		this.armTtl();

		const root = await this.getWorkspaceRoot();
		const promptPath = posix.join(root, PROMPT_PATH);
		const reportPath = posix.join(root, REPORT_PATH);
		const abortSignal = AbortSignal.any([options.abortSignal, this.lifetimeController.signal]);

		// A stale report from a previous launch must not read as this run's
		// outcome if the harness dies before writing a fresh one.
		try {
			await this.filesystem.deleteFile(reportPath, { force: true, abortSignal });
		} catch {
			// Missing file — nothing to clear.
		}

		await this.filesystem.writeFile(promptPath, options.prompt, { recursive: true, abortSignal });

		// Settle watchdog: once a terminal pi event is seen the process exits
		// within seconds, so an exec still pending after the grace period means
		// the service lost the exit event — abort it and recover from the report.
		const watchdog = new AbortController();
		let watchdogTimer: NodeJS.Timeout | undefined;
		let watchdogFired = false;
		const armWatchdog = () => {
			if (watchdogTimer) return;
			watchdogTimer = setTimeout(() => {
				watchdogFired = true;
				this.logger?.warn(
					'One-off task harness settled but exec stream never completed; recovering via report file',
				);
				watchdog.abort();
			}, HARNESS_SETTLE_GRACE_MS);
			watchdogTimer.unref?.();
		};

		const forwarder = createJsonlForwarder((event) => {
			if (isTerminalPiEvent(event)) armWatchdog();
			options.onEvent(event);
		}, this.logger);
		// Black box recorder for unclean stops: the report is the happy-path
		// signal, but a harness that dies before writing one (e.g. missing LLM
		// key) explains itself only on stderr.
		const stderrTail = createTailBuffer(STDERR_TAIL_MAX_CHARS);
		const command = this.buildHarnessCommand(root, options.sessionId, promptPath);

		let result: CommandResult | undefined;
		let execError: Error | undefined;
		try {
			result = await this.execute(command, [], {
				cwd: root,
				// Secret values live only in this exec's environment — the contract's
				// injection boundary. Never write them through the filesystem API.
				env: options.env,
				abortSignal: AbortSignal.any([abortSignal, watchdog.signal]),
				timeout: this.remainingTtlMs(),
				onStdout: (chunk) => forwarder.push(chunk),
				onStderr: (chunk) => stderrTail.push(chunk),
			});
		} catch (error) {
			execError = error instanceof Error ? error : new Error(String(error));
		} finally {
			if (watchdogTimer) clearTimeout(watchdogTimer);
		}
		forwarder.flush();

		// User cancel: destruction follows and the task is moot — recovering a
		// report here would misreport a cancelled task as completed.
		if (execError !== undefined && options.abortSignal.aborted) {
			throw execError;
		}

		// Report-first: the harness's own record outranks transport failures
		// (lost exec streams, watchdog aborts, TTL kills). Exec cleanup errors
		// after a successful recovery are swallowed — the execution is already
		// dead; the report is the outcome.
		const report = await this.readReport(reportPath);
		if (report !== undefined) {
			if (execError !== undefined) {
				this.logger?.debug(
					'One-off task exec failed after the harness reported; using the report',
					{
						error: execError.message,
					},
				);
			}
			return { report, exitCode: result?.exitCode ?? -1 };
		}

		// No report to recover with. A watchdog abort falls through to the
		// unclean-stop path (the harness settled and exited; a missing report is
		// the standard interrupted signal, not an exception).
		if (execError !== undefined && !watchdogFired) {
			if (this.lifetimeController.signal.aborted) {
				throw new OperationalError(
					this.ttlExpired
						? 'One-off task sandbox exceeded its maximum lifetime'
						: 'One-off task sandbox was destroyed while the harness was running',
					{ cause: execError },
				);
			}
			throw execError;
		}

		// The injected env values are the secrets — scrub them out before the
		// tail leaves this method (log line or return value).
		const secrets = Object.entries(options.env).map(([envVar, value]) => ({
			value,
			label: envVar,
		}));
		const scrubbedTail = scrub(stderrTail.get(), secrets);
		this.logger?.warn('One-off task harness stopped without a valid report', {
			exitCode: result?.exitCode ?? -1,
			stderrTail: scrubbedTail,
		});
		return {
			exitCode: result?.exitCode ?? -1,
			...(scrubbedTail.length > 0 ? { stderrTail: scrubbedTail } : {}),
		};
	}

	async destroy(): Promise<void> {
		if (!this.destroyPromise) {
			const destroying = this.executeDestroy();
			this.destroyPromise = destroying;
			// A failed destroy must stay retryable — the sandbox may still hold secrets.
			destroying.catch(() => {
				if (this.destroyPromise === destroying) this.destroyPromise = undefined;
			});
		}
		await this.destroyPromise;
	}

	private async executeDestroy(): Promise<void> {
		if (this.ttlTimer) {
			clearTimeout(this.ttlTimer);
			this.ttlTimer = undefined;
		}
		this.lifetimeController.abort();
		await (this.sandbox._destroy?.() ?? this.sandbox.destroy?.());
	}

	private assertUsable(): void {
		if (this.ttlExpired) {
			throw new OperationalError('One-off task sandbox exceeded its maximum lifetime');
		}
		if (this.destroyPromise ?? this.lifetimeController.signal.aborted) {
			throw new UnexpectedError('One-off task sandbox has been destroyed');
		}
	}

	private armTtl(): void {
		if (this.ttlDeadline !== undefined) return;
		this.ttlDeadline = Date.now() + this.ttlMs;
		this.ttlTimer = setTimeout(() => {
			this.ttlExpired = true;
			this.logger?.warn('One-off task sandbox TTL reached; destroying', { ttlMs: this.ttlMs });
			void this.destroy().catch((error: unknown) => {
				this.logger?.error('Failed to destroy one-off task sandbox after TTL', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, this.ttlMs);
		// A pending TTL must not keep the host process alive.
		this.ttlTimer.unref?.();
	}

	private remainingTtlMs(): number {
		if (this.ttlDeadline === undefined) return this.ttlMs;
		return Math.max(this.ttlDeadline - Date.now(), 1);
	}

	private async getWorkspaceRoot(): Promise<string> {
		// Cached: the root lookup runs a command in the sandbox; every path below
		// (bootstrap, relaunches) must agree on one root — pi keys sessions by cwd.
		// Lazy import keeps this module cheap to load (see repo lazy-load rule).
		this.workspaceRootPromise ??= import('@n8n/agents/sandbox').then(
			async ({ getWorkspaceRoot }) =>
				await getWorkspaceRoot({ sandbox: this.sandbox, filesystem: this.filesystem }),
		);
		return await this.workspaceRootPromise;
	}

	private async installHarness(abortSignal: AbortSignal, root: string): Promise<void> {
		// Bootstrap runs again on every relaunch to refresh the secrets manifest;
		// this sandbox is exclusive to this instance, so a completed install
		// makes the re-run (Node download + npm install) redundant.
		if (this.harnessInstalled) return;
		const result = await this.execute(this.buildInstallCommand(root), [], {
			abortSignal,
			timeout: Math.min(HARNESS_INSTALL_TIMEOUT_MS, this.remainingTtlMs()),
		});
		if (result.exitCode !== 0) {
			throw new OperationalError(
				`Failed to install the one-off task harness (exit ${result.exitCode}): ${result.stderr}`,
			);
		}
		this.harnessInstalled = true;
	}

	/**
	 * One `set -e` script: download a pinned Node (the image's Node 18 is too
	 * old for pi, and the non-root sandbox user cannot `npm install -g`), then
	 * install pi locally under TASK_DIR with the downloaded npm. The `current`
	 * symlink hides the arch-specific directory name from every later path.
	 * Future hardening: verify the tarball against nodejs.org SHASUMS256.txt.
	 */
	private buildInstallCommand(root: string): string {
		const nodeDir = shellQuote(posix.join(root, TASK_DIR, 'node'));
		const nodeBin = shellQuote(posix.join(root, NODE_BIN_PATH));
		const nodeExecutable = shellQuote(posix.join(root, NODE_BIN_PATH, 'node'));
		const currentLink = shellQuote(posix.join(root, TASK_DIR, 'node', 'current'));
		const harnessPrefix = shellQuote(posix.join(root, HARNESS_INSTALL_PREFIX));
		const nodeVersion = ONE_OFF_TASK_NODE_VERSION;
		return [
			'set -e',
			`if [ ! -x ${nodeExecutable} ]; then`,
			'  case "$(uname -m)" in',
			'    aarch64|arm64) NODE_ARCH=arm64 ;;',
			'    x86_64|amd64) NODE_ARCH=x64 ;;',
			'    *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;',
			'  esac',
			`  mkdir -p ${nodeDir}`,
			`  curl -fsSL "https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-\${NODE_ARCH}.tar.gz" | tar -xz -C ${nodeDir}`,
			`  ln -sfn "node-v${nodeVersion}-linux-\${NODE_ARCH}" ${currentLink}`,
			'fi',
			// Pi pinned exactly: session-resume semantics were verified against
			// this version. PATH prefix makes npm run under the downloaded Node.
			`PATH=${nodeBin}:"$PATH" npm install --prefix ${harnessPrefix} --ignore-scripts @earendil-works/pi-coding-agent@${ONE_OFF_TASK_PI_VERSION}`,
		].join('\n');
	}

	/**
	 * Pi invocation, verified against pi 0.84.1 source (`dist/cli/args.js`,
	 * `dist/main.js`, `dist/modes/print-mode.js`):
	 * - `--mode json` selects the one-shot print mode with a JSONL event stream
	 *   on stdout.
	 * - `--approve` trusts project-local resources (our own baked extensions)
	 *   without the interactive trust prompt.
	 * - `--session-dir` + `--session-id` give create-or-open session semantics;
	 *   the same id across relaunches resumes the task's session.
	 * - `@file` includes the prompt file's content as the initial message.
	 * - `< /dev/null` ends stdin immediately — pi reads piped stdin at startup
	 *   and must not block on a pipe that never closes.
	 *
	 * Pi runs from its local install under TASK_DIR; the PATH prefix makes its
	 * `#!/usr/bin/env node` shebang resolve to the downloaded Node 22 instead
	 * of the image's Node 18.
	 */
	private buildHarnessCommand(root: string, sessionId: string, promptPath: string): string {
		return [
			`PATH=${shellQuote(posix.join(root, NODE_BIN_PATH))}:"$PATH"`,
			shellQuote(posix.join(root, PI_BIN_PATH)),
			'--mode',
			'json',
			'--approve',
			'--session-dir',
			shellQuote(posix.join(root, SESSION_DIR)),
			'--session-id',
			shellQuote(sessionId),
			shellQuote(`@${promptPath}`),
			'<',
			'/dev/null',
		].join(' ');
	}

	private async readReport(reportPath: string): Promise<HarnessReport | undefined> {
		let raw: string;
		try {
			const content = await this.filesystem.readFile(reportPath, { encoding: 'utf-8' });
			raw = typeof content === 'string' ? content : content.toString('utf-8');
		} catch {
			return undefined;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			this.logger?.warn('One-off task report is not valid JSON');
			return undefined;
		}

		const validated = harnessReportSchema.safeParse(parsed);
		if (!validated.success) {
			this.logger?.warn('One-off task report failed schema validation', {
				issues: validated.error.issues.map((issue) => issue.message),
			});
			return undefined;
		}
		return validated.data;
	}
}

export interface CreateOneOffTaskSandboxOptions {
	/** n8n sandbox service URL — same source as the thread-scoped workspace config. */
	serviceUrl: string;
	apiKey?: string;
	ttlMs?: number;
	logger?: Logger;
}

/**
 * Create a fresh, never-reused sandbox on the n8n sandbox service provider.
 * No `id` is passed on purpose: the service generates a random one, so the
 * sandbox can never be reattached to — one-off task sandboxes are strictly
 * per-task (unlike the thread-scoped workspace's deterministic ids).
 */
export async function createOneOffTaskSandbox(
	options: CreateOneOffTaskSandboxOptions,
): Promise<OneOffTaskSandboxService> {
	const ttlMs = options.ttlMs ?? ONE_OFF_TASK_SANDBOX_TTL_MS;
	const { createSandbox, createFilesystem } = await import('@n8n/agents/sandbox');
	const sandbox = await createSandbox(
		{
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: options.serviceUrl,
			apiKey: options.apiKey,
			// Bounds the client's default per-operation timeout by the sandbox TTL.
			timeout: ttlMs,
		},
		{ logger: options.logger },
	);
	if (!sandbox) {
		throw new UnexpectedError('Sandbox creation returned no instance for an enabled provider');
	}
	return new OneOffTaskSandboxService({
		sandbox,
		filesystem: createFilesystem(sandbox),
		logger: options.logger,
		ttlMs,
	});
}
