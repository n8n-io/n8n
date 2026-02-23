import { type ChildProcess, execSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import picocolors from 'picocolors';

import { jsonParse } from '../../utils/json';

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

async function killProcess(proc: ChildProcess, graceful: boolean): Promise<void> {
	if (!proc.pid || proc.exitCode !== null) return;

	const pid = proc.pid;

	return await new Promise<void>((resolve) => {
		let timeoutId: NodeJS.Timeout | null = null;

		if (graceful) {
			timeoutId = setTimeout(() => {
				try {
					if (process.platform === 'win32') {
						execSync(`taskkill /PID ${pid} /T /F`, { timeout: CONFIG.KILL_TIMEOUT_MS });
					} else {
						process.kill(-pid, 'SIGKILL');
					}
				} catch {
					// Ignore errors during force kill
				}
				resolve();
			}, CONFIG.GRACEFUL_SHUTDOWN_TIMEOUT);
		}

		proc.once('exit', () => {
			if (timeoutId) clearTimeout(timeoutId);
			resolve();
		});

		try {
			if (process.platform === 'win32') {
				execSync(`taskkill /PID ${pid} /T /F`, { timeout: CONFIG.KILL_TIMEOUT_MS });
			} else {
				process.kill(-pid, graceful ? 'SIGTERM' : 'SIGKILL');
			}
		} catch {
			try {
				proc.kill(graceful ? 'SIGTERM' : 'SIGKILL');
			} catch {
				if (timeoutId) clearTimeout(timeoutId);
				resolve();
			}
		}

		if (!graceful) {
			if (timeoutId) clearTimeout(timeoutId);
			setTimeout(resolve, CONFIG.PROCESS_KILL_DELAY_MS);
		}
	});
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
		if (!cleanupPerformed && childProcesses.length > 0) {
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

		const commandString = `${cmdConfig.cmd} ${cmdConfig.args.join(' ')}`;

		const child = spawn(commandString, {
			shell: true,
			cwd: cmdConfig.cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: process.platform !== 'win32',
			env: {
				...process.env,
				...cmdConfig.env,
				FORCE_COLOR: '3',
				COLORTERM: 'truecolor',
				TERM: 'xterm-256color',
			},
		});

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

		child.stdout.on('data', handleData);
		child.stderr.on('data', handleData);

		child.on('close', (code) => {
			output.isRunning = false;
			output.exitCode = code;
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

export function createOpenN8nHandler(): KeyHandler {
	return {
		key: 'o',
		handler: () => {
			openUrl('http://localhost:5678');
		},
	};
}

export function buildHelpText(hasN8n: boolean, isN8nReady: boolean): string {
	const quitText = `${picocolors.dim('Press')} q ${picocolors.dim('to quit')}`;
	if (hasN8n && isN8nReady) {
		return `${quitText} ${picocolors.dim('|')} o ${picocolors.dim('to open n8n')}`;
	}
	return quitText;
}
