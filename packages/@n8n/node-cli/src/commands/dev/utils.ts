import { type ChildProcess, exec, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import picocolors from 'picocolors';

import { jsonParse } from '../../utils/json';

interface CommandOutput {
	name: string;
	lines: string[];
	isRunning: boolean;
	exitCode: number | null;
	getPlaceholder?: () => string;
	startTime: number;
}

const ANSI = {
	SAVE_CURSOR: '\x1b7',
	RESTORE_CURSOR: '\x1b8',
	CLEAR_TO_END: '\x1b[J',
};

const CONFIG = {
	MAX_LINES: Number(process.env.N8N_DEV_MAX_LINES) || 10,
	RENDER_INTERVAL_MS: 100,
	SEPARATOR_WIDTH: 80,
};

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
	if (output.exitCode === 130) {
		return { icon: '✗ ', colorFn: picocolors.red, text: 'canceled' };
	}
	const success = output.exitCode === 0;
	return {
		icon: success ? '✓ ' : '✗ ',
		colorFn: success ? picocolors.green : picocolors.red,
		text: `exit ${output.exitCode}`,
	};
}

function renderCommandHeader(output: CommandOutput): void {
	const status = getStatusDisplay(output);
	const hiddenLines = Math.max(0, output.lines.length - CONFIG.MAX_LINES);
	const hiddenIndicator = hiddenLines > 0 ? picocolors.dim(`(+${hiddenLines} more lines)`) : '';

	process.stdout.write(
		`╭─ ${status.colorFn(status.icon)}${picocolors.bold(output.name)} ` +
			`${status.colorFn(`(${status.text})`)} ${hiddenIndicator}\n│\n`,
	);
}

function getVisibleLength(str: string): number {
	// eslint-disable-next-line no-control-regex
	return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function truncateLine(line: string, maxWidth: number): string {
	const visibleLength = getVisibleLength(line);
	if (visibleLength <= maxWidth) return line;

	let result = '';
	let visibleCount = 0;
	let inAnsiCode = false;
	const maxBeforeEllipsis = maxWidth - 1;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '\x1b') inAnsiCode = true;

		if (inAnsiCode) {
			result += char;
			if (char === 'm') inAnsiCode = false;
		} else {
			if (visibleCount >= maxBeforeEllipsis) {
				result += picocolors.dim('…');
				break;
			}
			result += char;
			visibleCount++;
		}
	}

	return result;
}

function renderCommandOutput(output: CommandOutput): void {
	const terminalWidth = process.stdout.columns || CONFIG.SEPARATOR_WIDTH;
	const maxLineWidth = terminalWidth - 4;

	// If no output yet and placeholder is provided, show placeholder
	if (output.lines.length === 0 && output.getPlaceholder && output.isRunning) {
		const placeholder = output.getPlaceholder();
		if (placeholder) {
			process.stdout.write('│ ' + placeholder + '\n');
			// Fill remaining lines
			for (let i = 1; i < CONFIG.MAX_LINES; i++) {
				process.stdout.write('│\n');
			}
			process.stdout.write('╰─\n');
			return;
		}
	}

	const recentLines = output.lines.slice(-CONFIG.MAX_LINES);
	for (let i = 0; i < CONFIG.MAX_LINES; i++) {
		const line = recentLines[i] ?? '';
		const cleanedLine = stripScreenControlCodes(line);
		if (cleanedLine) {
			const truncated = truncateLine(cleanedLine, maxLineWidth);
			process.stdout.write('│ ' + truncated + '\n');
		} else {
			process.stdout.write('│\n');
		}
	}

	process.stdout.write('╰─\n');
}

function renderOutputs(outputs: CommandOutput[], isFirstRender: boolean, helpText?: string): void {
	if (isFirstRender) {
		process.stdout.write(ANSI.SAVE_CURSOR);
	} else {
		process.stdout.write(ANSI.RESTORE_CURSOR + ANSI.CLEAR_TO_END);
	}

	outputs.forEach((output, index) => {
		renderCommandHeader(output);
		renderCommandOutput(output);
		if (index < outputs.length - 1) process.stdout.write('\n');
	});

	const allRunning = outputs.every((o) => o.isRunning);
	if (allRunning && helpText) {
		process.stdout.write(`\n${helpText}\n`);
	}
}

function processStreamData(data: Buffer, outputLines: string[]): void {
	const text = data.toString();
	const segments = text.split('\r');

	segments.forEach((segment, segmentIndex) => {
		if (segmentIndex > 0 && outputLines.length > 0) {
			outputLines.pop();
		}

		const lines = segment.split('\n');
		lines.forEach((line, lineIndex) => {
			const isLastLine = lineIndex === lines.length - 1;
			if (line || !isLastLine) {
				outputLines.push(line);
			}
		});
	});
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export function clearScreen(): void {
	process.stdout.write('\n\x1b[2J\x1b[0;0H\n');
}

export function createSpinner(text: string): () => string {
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let index = 0;

	return () => {
		const frame = picocolors.cyan(frames[index]);
		index = (index + 1) % frames.length;
		return `${frame} ${text}`;
	};
}

export function openUrl(url: string): void {
	const command =
		process.platform === 'darwin'
			? `open ${url}`
			: process.platform === 'win32'
				? `start ${url}`
				: `xdg-open ${url}`;
	exec(command, () => {});
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
}

export function runCommands(config: CommandsConfig): void {
	const commandOutputs: CommandOutput[] = [];
	const childProcesses: ChildProcess[] = [];
	let renderInterval: NodeJS.Timeout | null = null;
	let isFirstRender = true;
	const customHelpText = config.helpText;

	const cleanup = () => {
		if (renderInterval) {
			clearInterval(renderInterval);
			renderInterval = null;
		}

		childProcesses.forEach((proc) => {
			if (!proc.pid) return;

			try {
				if (process.platform === 'win32') {
					// On Windows, use taskkill to terminate the entire process tree
					exec(`taskkill /PID ${proc.pid} /T /F`, () => {});
				} else {
					// On Unix, kill the process group
					process.kill(-proc.pid, 'SIGTERM');
				}
			} catch {
				// Fallback: try to kill just the process
				try {
					proc.kill('SIGTERM');
				} catch {
					// Process might already be dead
				}
			}
		});

		if (process.stdin.isTTY && process.stdin.setRawMode) {
			process.stdin.setRawMode(false);
		}
	};

	const getHelpText = (): string | undefined => {
		return customHelpText?.();
	};

	const handleSignal = (): void => {
		cleanup();
		commandOutputs.forEach((output) => {
			if (output.isRunning) {
				output.isRunning = false;
				output.exitCode = 130;
			}
		});
		renderOutputs(commandOutputs, false, getHelpText());
		process.stdout.write(`\n${picocolors.red('Terminated by user')}\n`);
		process.exit(130);
	};

	process.on('SIGINT', handleSignal);
	process.on('SIGTERM', handleSignal);

	const startRenderLoop = (): void => {
		if (renderInterval !== null) return;

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			process.stdin.on('data', (key: string) => {
				// Handle Ctrl+C
				if (key === '\u0003') {
					handleSignal();
					return;
				}

				// Find and execute custom key handler
				const handler = config.keyHandlers?.find((h) => h.key === key);
				if (handler) {
					handler.handler(cleanup);
				}
			});
		}

		renderOutputs(commandOutputs, isFirstRender, getHelpText());
		isFirstRender = false;

		renderInterval = setInterval(() => {
			renderOutputs(commandOutputs, isFirstRender, getHelpText());

			if (commandOutputs.every((o) => !o.isRunning)) {
				cleanup();
				renderOutputs(commandOutputs, isFirstRender, getHelpText());

				const maxExitCode = Math.max(...commandOutputs.map((o) => o.exitCode ?? 0));
				process.stdout.write(
					`\n\n${picocolors.bold('All commands completed.')} Exit code: ${maxExitCode}\n`,
				);
				process.exit(maxExitCode);
			}
		}, CONFIG.RENDER_INTERVAL_MS);
	};

	// Spawn all commands
	config.commands.forEach((cmdConfig) => {
		const output: CommandOutput = {
			name: cmdConfig.name,
			lines: [],
			isRunning: true,
			exitCode: null,
			getPlaceholder: cmdConfig.getPlaceholder,
			startTime: Date.now(),
		};

		commandOutputs.push(output);

		const child = spawn(cmdConfig.cmd, cmdConfig.args, {
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
			// Call onOutput callback for each line
			if (cmdConfig.onOutput) {
				const text = data.toString();
				const lines = text.split('\n');
				lines.forEach((line) => {
					if (line.trim()) {
						cmdConfig.onOutput!(line);
					}
				});
			}
		};

		child.stdout.on('data', handleData);
		child.stderr.on('data', handleData);

		child.on('close', (code) => {
			output.isRunning = false;
			output.exitCode = code;
		});
	});

	// Start the render loop
	if (commandOutputs.length > 0) {
		startRenderLoop();
	}
}

export async function readPackageName(): Promise<string> {
	return await fs
		.readFile('package.json', 'utf-8')
		.then((packageJson) => jsonParse<{ name: string }>(packageJson)?.name ?? 'unknown');
}

export function createQuitHandler(): KeyHandler {
	return {
		key: 'q',
		handler: (cleanup) => {
			cleanup();
			process.stdout.write(`\n${picocolors.green('Quit by user')}\n`);
			process.exit(0);
		},
	};
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
