import { isRecord } from '@n8n/utils/is-record';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { type ChildProcess, execSync, spawn, type SpawnOptions } from 'node:child_process';
import { type FSWatcher, readdirSync, statSync, watch } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import picocolors from 'picocolors';

import { jsonParse } from '../../utils/json';
import { STATIC_ASSET_IGNORE } from '../build';

interface CommandOutput {
	name: string;
	lines: string[];
	isRunning: boolean;
	exitCode: number | null;
	getPlaceholder?: () => string;
}

const ANSI = {
	CLEAR_SCREEN: '\x1b[2J',
	CURSOR_HOME: '\x1b[H',
	ENTER_ALT_SCREEN: '\x1b[?1049h',
	EXIT_ALT_SCREEN: '\x1b[?1049l',
	HIDE_CURSOR: '\x1b[?25l',
	SHOW_CURSOR: '\x1b[?25h',
};

const CONFIG = {
	MIN_LINES_PER_PANEL: 3,
	MAX_LINES_PER_PANEL: 50,
	RENDER_INTERVAL_MS: 100,
	SEPARATOR_WIDTH: 80,
	GRACEFUL_SHUTDOWN_TIMEOUT: 5000,
	KILL_TIMEOUT_MS: 1000,
	PROCESS_KILL_DELAY_MS: 100,
	EXIT_KILL_TIMEOUT_MS: 500,
	GROUP_POLL_INTERVAL_MS: 50,
};

function calculatePanelHeight(numPanels: number, headerLines: number): number {
	const terminalRows = process.stdout.rows ?? 24;
	const panelOverheadPerPanel = 2;
	const blankLinesBetweenPanels = numPanels - 1;
	const helpTextLines = 2;

	const totalOverhead =
		headerLines + numPanels * panelOverheadPerPanel + blankLinesBetweenPanels + helpTextLines;
	const availableRows = Math.max(0, terminalRows - totalOverhead);
	const linesPerPanel = Math.floor(availableRows / numPanels);

	const minRequiredRows =
		headerLines +
		numPanels * (CONFIG.MIN_LINES_PER_PANEL + panelOverheadPerPanel) +
		blankLinesBetweenPanels +
		helpTextLines;
	if (terminalRows < minRequiredRows) {
		return Math.max(1, linesPerPanel);
	}

	return Math.max(CONFIG.MIN_LINES_PER_PANEL, Math.min(CONFIG.MAX_LINES_PER_PANEL, linesPerPanel));
}

/* eslint-disable no-control-regex */
function stripScreenControlCodes(str: string): string {
	return str
		.replace(/\x1b\[2J/g, '')
		.replace(/\x1b\[H/g, '')
		.replace(/\x1b\[(\d+)?J/g, '')
		.replace(/\x1b\[(\d+)?K/g, '')
		.replace(/\x1b\[(\d+)?[ABCDEFG]/g, '');
}
/* eslint-enable no-control-regex */

function getStatusDisplay(output: CommandOutput) {
	if (output.isRunning) {
		return { icon: '', colorFn: picocolors.green, text: 'running' };
	}

	const exitCode = output.exitCode ?? 1;
	if (exitCode === 130) {
		return { icon: '✗ ', colorFn: picocolors.red, text: 'canceled' };
	}

	const success = exitCode === 0;
	return {
		icon: success ? '✓ ' : '✗ ',
		colorFn: success ? picocolors.green : picocolors.red,
		text: `exit ${exitCode}`,
	};
}

function getVisibleLength(str: string): number {
	// eslint-disable-next-line no-control-regex
	return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function truncateLine(line: string, maxWidth: number): string {
	if (getVisibleLength(line) <= maxWidth) return line;

	let result = '';
	let visible = 0;
	let inAnsi = false;

	for (const char of line) {
		if (char === '\x1b') inAnsi = true;

		if (inAnsi) {
			result += char;
			if (char === 'm') inAnsi = false;
			continue;
		}

		if (visible >= maxWidth - 1) {
			result += picocolors.dim('…');
			break;
		}

		result += char;
		visible++;
	}

	return result;
}

function processStreamData(data: Buffer, outputLines: string[]): void {
	const text = data.toString().replace(/\r\n/g, '\n');
	const segments = text.split('\r');

	for (let i = 0; i < segments.length; i++) {
		if (i > 0 && outputLines.length > 0) {
			outputLines.pop();
		}

		const lines = segments[i].split('\n');
		for (let j = 0; j < lines.length; j++) {
			const isLastLine = j === lines.length - 1;
			if (lines[j] || !isLastLine) {
				outputLines.push(lines[j]);
			}
		}
	}
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createSpinner(text: string | (() => string)): () => string {
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let index = 0;

	return () => {
		const frame = picocolors.cyan(frames[index]);
		index = (index + 1) % frames.length;
		const message = typeof text === 'function' ? text() : text;
		return `${frame} ${message}`;
	};
}

function getOpenCommand(url: string): string {
	const escapedUrl = url.replace(/"/g, '\\"');
	switch (process.platform) {
		case 'darwin':
			return `open "${escapedUrl}"`;
		case 'win32':
			return `start "" "${escapedUrl}"`;
		default:
			return `xdg-open "${escapedUrl}"`;
	}
}

export function openUrl(url: string): void {
	try {
		execSync(getOpenCommand(url));
	} catch {
		// Ignore errors when opening URLs
	}
}

/**
 * Quote one argument of a `cmd.exe /d /s /c` command line. Every argument is
 * quoted rather than only those holding whitespace, because cmd.exe treats
 * `&`, `|`, `<`, `>`, `(`, `)` and `^` as metacharacters wherever they appear
 * outside quotes. `%VAR%` is still expanded; a command line cannot prevent it.
 */
function quoteForCmd(arg: string): string {
	// A backslash is only special before a quote, so double just those runs,
	// including the run that would otherwise escape our own closing quote.
	const escaped = arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1');
	return `"${escaped}"`;
}

export interface CommandConfig {
	cmd: string;
	args: string[];
	name: string;
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	onOutput?: (line: string) => void;
	getPlaceholder?: () => string;
}

export interface KeyHandler {
	key: string;
	description?: string;
	handler: (cleanup: () => void) => void;
}

export interface CommandsConfig {
	commands: CommandConfig[];
	keyHandlers?: KeyHandler[];
	helpText?: () => string;
	headerText?: string;
}

interface RenderState {
	lastOutput: string;
}

function renderPanel(output: CommandOutput, terminalWidth: number, panelHeight: number): string {
	const status = getStatusDisplay(output);
	const maxWidth = terminalWidth - 4;
	const header = `╭─ ${status.colorFn(status.icon)}${picocolors.bold(output.name)} ${status.colorFn(`(${status.text})`)}\n`;

	const recentLines = output.lines.slice(-panelHeight);
	let content = '';

	if (recentLines.length === 0 && output.getPlaceholder && output.isRunning) {
		content = `│ ${output.getPlaceholder()}\n`;
		for (let i = 1; i < panelHeight; i++) {
			content += '│\n';
		}
	} else {
		for (let i = 0; i < panelHeight; i++) {
			const cleanedLine = stripScreenControlCodes(recentLines[i] ?? '');
			content += cleanedLine ? `│ ${truncateLine(cleanedLine, maxWidth)}\n` : '│\n';
		}
	}

	return header + content + '╰─\n';
}

function renderUI(outputs: CommandOutput[], helpText?: string, headerText?: string): string {
	const terminalWidth = process.stdout.columns ?? CONFIG.SEPARATOR_WIDTH;

	let result = '';

	if (headerText) {
		result += `${headerText}\n\n`;
	}

	const headerLines = headerText ? headerText.split('\n').length + 1 : 0;
	const panelHeight = calculatePanelHeight(outputs.length, headerLines);

	outputs.forEach((output, index) => {
		result += renderPanel(output, terminalWidth, panelHeight);
		if (index < outputs.length - 1) {
			result += '\n';
		}
	});

	const allRunning = outputs.every((o) => o.isRunning);
	if (allRunning && helpText) {
		result += `\n${helpText}\n`;
	}

	return result;
}

function doRender(
	state: RenderState,
	outputs: CommandOutput[],
	helpText?: string,
	headerText?: string,
): void {
	const newOutput = renderUI(outputs, helpText, headerText);

	if (newOutput === state.lastOutput) return;

	process.stdout.write(ANSI.CLEAR_SCREEN + ANSI.CURSOR_HOME + newOutput);
	state.lastOutput = newOutput;
}

function setupKeyboardInput(
	handleSignal: () => void,
	cleanup: () => void,
	keyHandlers?: KeyHandler[],
): void {
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding('utf8');

	process.stdin.on('data', (key: string) => {
		if (key === '\u0003' || key === 'q') {
			handleSignal();
			return;
		}

		const handler = keyHandlers?.find((h) => h.key === key && h.key !== 'q');
		if (handler) {
			handler.handler(cleanup);
		}
	});
}

async function handleCommandCompletion(
	commandOutputs: CommandOutput[],
	cleanup: (graceful: boolean) => Promise<void>,
): Promise<void> {
	const exitedCommand = commandOutputs.find((o) => !o.isRunning);
	if (!exitedCommand) return;

	await cleanup(true);

	const exitCode = exitedCommand.exitCode ?? 1;
	const message =
		exitCode === 0
			? picocolors.green('Command completed successfully.')
			: picocolors.red(`Command "${exitedCommand.name}" exited with code ${exitCode}.`);

	process.stdout.write(`\n${picocolors.bold(message)}\n`);
	process.exit(exitCode);
}

function restoreTerminal(): void {
	if (process.stdout.isTTY) {
		process.stdout.write(ANSI.SHOW_CURSOR);
		process.stdout.write(ANSI.EXIT_ALT_SCREEN);
	}
}

function printAllCommandOutputs(outputs: CommandOutput[], headerText?: string): void {
	if (headerText) {
		process.stdout.write(`\n${headerText}\n\n`);
	}

	outputs.forEach((output, index) => {
		process.stdout.write(`${picocolors.bold(output.name)}\n`);

		for (const line of output.lines) {
			const cleanedLine = stripScreenControlCodes(line);
			if (cleanedLine.trim()) {
				process.stdout.write(`${cleanedLine}\n`);
			}
		}

		if (index < outputs.length - 1) {
			process.stdout.write('\n');
		}
	});

	process.stdout.write(
		`\n${picocolors.dim('Shutting down gracefully... Press Ctrl+C again to force quit.')}\n`,
	);
}

function isProcessGroupAlive(pgid: number): boolean {
	if (process.platform === 'win32') return false;
	try {
		process.kill(-pgid, 0);
		return true;
	} catch {
		return false;
	}
}

function sendKillSignal(proc: ChildProcess, pid: number, signal: 'SIGTERM' | 'SIGKILL'): void {
	try {
		if (process.platform === 'win32') {
			execSync(`taskkill /PID ${pid} /T /F`, { timeout: CONFIG.KILL_TIMEOUT_MS });
		} else {
			process.kill(-pid, signal);
		}
	} catch {
		try {
			proc.kill(signal);
		} catch {
			// Process already gone
		}
	}
}

async function killProcess(proc: ChildProcess, graceful: boolean): Promise<void> {
	if (!proc.pid || proc.exitCode !== null || proc.signalCode !== null) return;

	const pid = proc.pid;
	const isWindows = process.platform === 'win32';
	const hasExited = (): boolean => proc.exitCode !== null || proc.signalCode !== null;

	sendKillSignal(proc, pid, graceful ? 'SIGTERM' : 'SIGKILL');

	if (!graceful) {
		await sleep(CONFIG.PROCESS_KILL_DELAY_MS);
		return;
	}

	// Wait for the whole process group to drain rather than only the direct
	// child. The direct child is now the command itself (`docker run`, or the
	// package manager wrapping `tsc`), and it can still report exit before the
	// container or the n8n server below it releases the listening port. Exiting
	// before the descendants finish would leak the port until the user manually
	// killed the process.
	const deadline = Date.now() + CONFIG.GRACEFUL_SHUTDOWN_TIMEOUT;
	while (Date.now() < deadline) {
		const groupDrained = isWindows || !isProcessGroupAlive(pid);
		if (hasExited() && groupDrained) return;
		await sleep(CONFIG.GROUP_POLL_INTERVAL_MS);
	}

	// Graceful window elapsed — force-kill anything still alive in the group.
	sendKillSignal(proc, pid, 'SIGKILL');
	await sleep(CONFIG.PROCESS_KILL_DELAY_MS);
}

export function runCommands(config: CommandsConfig): void {
	const commandOutputs: CommandOutput[] = [];
	const childProcesses: ChildProcess[] = [];
	let renderInterval: NodeJS.Timeout | null = null;
	let isShuttingDown = false;
	let cleanupPerformed = false;

	const cleanup = async (graceful: boolean = true): Promise<void> => {
		if (cleanupPerformed) return;
		cleanupPerformed = true;

		if (renderInterval) {
			clearInterval(renderInterval);
			renderInterval = null;
		}

		restoreTerminal();

		if (graceful) {
			printAllCommandOutputs(commandOutputs, config.headerText);
		}

		await Promise.all(childProcesses.map(async (proc) => await killProcess(proc, graceful)));

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
	};

	const handleSignal = (): void => {
		if (!isShuttingDown) {
			isShuttingDown = true;
			commandOutputs.forEach((output) => {
				if (output.isRunning) {
					output.isRunning = false;
					output.exitCode = 130;
				}
			});

			void cleanup(true).then(() => {
				process.exit(130);
			});
			return;
		}

		if (cleanupPerformed) {
			process.stdout.write(picocolors.yellow('\nForce quitting...\n'));
			process.exit(130);
		} else {
			void cleanup(false).then(() => {
				process.exit(130);
			});
		}
	};

	process.on('SIGINT', handleSignal);
	process.on('SIGTERM', handleSignal);

	process.on('exit', () => {
		// Always fire a final SIGKILL to each spawned process group. If the
		// graceful cleanup already drained the group this is a no-op; if it
		// didn't (e.g. unexpected exit, race), this prevents the n8n server
		// or other descendants from outliving the CLI and holding their port.
		for (const proc of childProcesses) {
			if (!proc.pid) continue;
			try {
				if (process.platform === 'win32') {
					execSync(`taskkill /PID ${proc.pid} /T /F`, { timeout: CONFIG.EXIT_KILL_TIMEOUT_MS });
				} else {
					process.kill(-proc.pid, 'SIGKILL');
				}
			} catch {
				// Ignore errors during exit cleanup
			}
		}
	});

	process.on('uncaughtException', (error) => {
		console.error(picocolors.red('\nUncaught exception:'), error);
		void cleanup(false).then(() => {
			process.exit(1);
		});
	});

	process.on('unhandledRejection', (reason) => {
		console.error(picocolors.red('\nUnhandled rejection:'), reason);
		void cleanup(false).then(() => {
			process.exit(1);
		});
	});

	const startRenderLoop = (): void => {
		if (renderInterval !== null) return;

		if (process.stdout.isTTY) {
			process.stdout.write(ANSI.ENTER_ALT_SCREEN);
			process.stdout.write(ANSI.HIDE_CURSOR);
		}

		const state: RenderState = {
			lastOutput: '',
		};

		if (process.stdin.isTTY) {
			setupKeyboardInput(handleSignal, cleanup, config.keyHandlers);
		}

		doRender(state, commandOutputs, config.helpText?.(), config.headerText);

		renderInterval = setInterval(() => {
			doRender(state, commandOutputs, config.helpText?.(), config.headerText);
			void handleCommandCompletion(commandOutputs, cleanup);
		}, CONFIG.RENDER_INTERVAL_MS);
	};

	config.commands.forEach((cmdConfig) => {
		const output: CommandOutput = {
			name: cmdConfig.name,
			lines: [],
			isRunning: true,
			exitCode: null,
			getPlaceholder: cmdConfig.getPlaceholder,
		};

		commandOutputs.push(output);

		const isWindows = process.platform === 'win32';
		const spawnOptions = {
			cwd: cmdConfig.cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			// Own process group, so quitting can signal the whole tree at once.
			detached: !isWindows,
			env: {
				...process.env,
				...cmdConfig.env,
				FORCE_COLOR: '3',
				COLORTERM: 'truecolor',
				TERM: 'xterm-256color',
			},
		} satisfies SpawnOptions;

		// Pass the arguments as an array so no shell ever parses them: a project
		// path holding `$`, a backtick, `;` or `&` has to reach the child intact.
		// Windows package managers are `.cmd` shims, which cannot run without a
		// terminal, so there we invoke cmd.exe ourselves. `shell: true` is not an
		// option: it concatenates the arguments without escaping them (DEP0190).
		const child = isWindows
			? spawn(
					process.env.ComSpec ?? 'cmd.exe',
					['/d', '/s', '/c', `"${[cmdConfig.cmd, ...cmdConfig.args].map(quoteForCmd).join(' ')}"`],
					{ ...spawnOptions, windowsVerbatimArguments: true },
				)
			: spawn(cmdConfig.cmd, cmdConfig.args, spawnOptions);

		childProcesses.push(child);

		const handleData = (data: Buffer) => {
			processStreamData(data, output.lines);
			if (cmdConfig.onOutput) {
				const lines = data.toString().split('\n');
				for (const line of lines) {
					if (line.trim()) {
						cmdConfig.onOutput(line);
					}
				}
			}
		};

		child.stdout?.on('data', handleData);
		child.stderr?.on('data', handleData);

		// Without a shell in front, a missing binary arrives as an 'error' event
		// instead of exit code 127, and an unhandled one would take down the CLI.
		child.on('error', (error) => {
			output.lines.push(picocolors.red(`Failed to start ${cmdConfig.cmd}: ${error.message}`));
			output.isRunning = false;
			output.exitCode ??= 127;
		});

		child.on('close', (code) => {
			output.isRunning = false;
			output.exitCode ??= code;
		});
	});

	if (commandOutputs.length > 0) {
		startRenderLoop();
	}
}

export async function readPackageName(): Promise<string> {
	return await fs
		.readFile('package.json', 'utf-8')
		.then((packageJson) => jsonParse<{ name: string }>(packageJson)?.name ?? 'unknown');
}

export function createOpenN8nHandler(url: string): KeyHandler {
	return {
		key: 'o',
		handler: () => {
			openUrl(url);
		},
	};
}

const HEALTH_POLL_INTERVAL_MS = 1000;

/**
 * Resolves once n8n reports itself ready, or after `timeoutMs`. Readiness, not
 * `/healthz`: the latter answers before the controllers are registered, so a
 * reload sent on that signal 404s.
 */
export async function waitForN8n(baseUrl: string, timeoutMs = 300_000): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;

	for (;;) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) return false;

		try {
			// Bound every attempt by the time left. A port that accepts but never
			// answers would otherwise park this await forever, so the loop would
			// never re-check the deadline and `timeoutMs` would mean nothing.
			const response = await fetch(`${baseUrl}/healthz/readiness`, {
				signal: AbortSignal.timeout(remaining),
			});
			if (response.ok) return true;
		} catch {
			// Not up yet
		}

		// Clamp the backoff too, so a failure near the deadline cannot overshoot.
		const left = deadline - Date.now();
		if (left <= 0) return false;
		await sleep(Math.min(HEALTH_POLL_INTERVAL_MS, left));
	}
}

/**
 * Reloading is a local call into an already-running n8n, so a few seconds is
 * generous. This is called fire-and-forget on every compile, so an unbounded
 * request would leave a pending promise and an open socket behind each time.
 */
const RELOAD_TIMEOUT_MS = 5000;

function reloadFailure(response: Response, body: string): string {
	// Without the route n8n serves the SPA catch-all, so the body is HTML.
	if (response.status === 404) {
		return 'this n8n has no reload endpoint - use a newer image, or set N8N_DEV_RELOAD=true on --external-n8n';
	}

	const parsed = jsonParse<unknown>(body);
	if (isRecord(parsed) && typeof parsed.message === 'string' && parsed.message.length > 0) {
		return parsed.message;
	}

	return `n8n answered ${response.status}`;
}

/**
 * Tell a running n8n to re-read the node from disk. Push rather than watch: the
 * container cannot watch a bind mount, and "compile succeeded, now reload"
 * cannot race a half-written `dist` the way a debounced watcher can.
 */
export async function triggerReload(baseUrl: string): Promise<Result<void, string>> {
	try {
		const response = await fetch(`${baseUrl}/rest/dev/reload`, {
			method: 'POST',
			signal: AbortSignal.timeout(RELOAD_TIMEOUT_MS),
		});
		if (response.ok) return createResultOk(undefined);

		return createResultError(reloadFailure(response, await response.text().catch(() => '')));
	} catch {
		return createResultError(`n8n not reachable at ${baseUrl}`);
	}
}

const STATIC_ASSET_PATTERN = /\.(png|svg)$|__schema__[\\/].*\.json$/;

/**
 * Every top-level directory `copyStaticFiles` can read from. Dotted directories
 * and the ignore list are skipped because `recursive` costs one inotify watch
 * per subdirectory on Linux, which a tree like `.git` can exhaust as ENOSPC.
 */
function watchableAssetDirs(): string[] {
	try {
		return readdirSync(process.cwd(), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.filter((name) => !name.startsWith('.') && !STATIC_ASSET_IGNORE.includes(name));
	} catch {
		return [];
	}
}

/**
 * Watch static assets on the host. `copyStaticFiles()` only runs at startup, so
 * without this an icon or schema edit never reaches `dist`.
 */
export function watchStaticFiles(onChange: () => void): () => void {
	const watchers: FSWatcher[] = [];
	const watched = new Set<string>();

	const watchAssetDir = (dir: string): boolean => {
		if (watched.has(dir)) return true;

		const target = path.join(process.cwd(), dir);
		try {
			if (!statSync(target).isDirectory()) return false;
		} catch {
			return false;
		}

		// `filename` is relative to `target`, which the pattern already allows for.
		const watcher = watch(target, { recursive: true }, (_event, filename) => {
			if (!filename) return;
			if (!STATIC_ASSET_PATTERN.test(filename)) return;
			onChange();
		});
		watcher.unref();
		watchers.push(watcher);
		watched.add(dir);
		return true;
	};

	for (const dir of watchableAssetDirs()) watchAssetDir(dir);

	// Covers both directories created after startup and assets in the root
	// itself, for a single descriptor.
	const rootWatcher = watch(process.cwd(), (_event, filename) => {
		if (!filename) return;

		if (STATIC_ASSET_PATTERN.test(filename)) {
			onChange();
			return;
		}

		if (filename.startsWith('.') || STATIC_ASSET_IGNORE.includes(filename)) return;
		if (!watchAssetDir(filename)) return;
		// The directory can already hold assets when the watcher attaches.
		onChange();
	});
	rootWatcher.unref();
	watchers.push(rootWatcher);

	return () => {
		for (const watcher of watchers) watcher.close();
	};
}

export interface ReloadStatus {
	at: Date;
	result: Result<void, string>;
}

function formatReloadStatus({ at, result }: ReloadStatus): string {
	// 24-hour HH:MM, so the line width does not change by locale.
	const time = at.toTimeString().slice(0, 5);
	return result.ok
		? picocolors.green(`✓ reloaded ${time}`)
		: picocolors.red(`✗ reload failed: ${result.error}`);
}

export function buildHelpText(
	hasN8n: boolean,
	isN8nReady: boolean,
	lastReload?: ReloadStatus,
): string {
	const segments = [`${picocolors.dim('Press')} q ${picocolors.dim('to quit')}`];
	if (hasN8n && isN8nReady) segments.push(`o ${picocolors.dim('to open n8n')}`);
	if (lastReload) segments.push(formatReloadStatus(lastReload));

	// `calculatePanelHeight` budgets one help line, so wrapping a long failure
	// reason would push a panel row off-screen.
	const terminalWidth = process.stdout.columns ?? CONFIG.SEPARATOR_WIDTH;
	return truncateLine(segments.join(` ${picocolors.dim('|')} `), terminalWidth - 1);
}
