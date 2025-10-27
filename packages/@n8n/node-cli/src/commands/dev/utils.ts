import { type ChildProcess, spawn, exec } from 'node:child_process';
import fs from 'node:fs/promises';

import { jsonParse } from '../../utils/json';

interface CommandOutput {
	name: string;
	lines: string[];
	isRunning: boolean;
	exitCode: number | null;
}

const ANSI = {
	SAVE_CURSOR: '\x1b7',
	RESTORE_CURSOR: '\x1b8',
	CLEAR_TO_END: '\x1b[J',
	RESET: '\x1b[0m',
	BOLD: '\x1b[1m',
	DIM: '\x1b[90m',
	RED: '\x1b[31m',
	GREEN: '\x1b[32m',
	YELLOW: '\x1b[33m',
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
		return { icon: '', color: ANSI.GREEN, text: 'running' };
	}
	if (output.exitCode === 130) {
		return { icon: '✗ ', color: ANSI.RED, text: 'canceled' };
	}
	const success = output.exitCode === 0;
	return {
		icon: success ? '✓ ' : '✗ ',
		color: success ? ANSI.GREEN : ANSI.RED,
		text: `exit ${output.exitCode}`,
	};
}

function renderCommandHeader(output: CommandOutput): void {
	const status = getStatusDisplay(output);
	const hiddenLines = Math.max(0, output.lines.length - CONFIG.MAX_LINES);
	const hiddenIndicator =
		hiddenLines > 0 ? `${ANSI.DIM}(+${hiddenLines} more lines)${ANSI.RESET}` : '';

	process.stdout.write(
		`╭─ ${status.color}${status.icon}${ANSI.RESET}${ANSI.BOLD}${output.name}${ANSI.RESET} ` +
			`${status.color}(${status.text})${ANSI.RESET} ${hiddenIndicator}\n│\n`,
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
				result += ANSI.DIM + '…' + ANSI.RESET;
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

function renderOutputs(outputs: CommandOutput[], isFirstRender: boolean): void {
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
	if (allRunning) {
		process.stdout.write(
			`\n${ANSI.DIM}Press ${ANSI.RESET}q${ANSI.DIM} to quit | ${ANSI.RESET}o${ANSI.DIM} to open n8n${ANSI.RESET}\n`,
		);
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

export function commands() {
	const commandOutputs: CommandOutput[] = [];
	const childProcesses: ChildProcess[] = [];
	let renderInterval: NodeJS.Timeout | null = null;
	let isFirstRender = true;

	const cleanup = () => {
		if (renderInterval) {
			clearInterval(renderInterval);
			renderInterval = null;
		}

		childProcesses.forEach((proc) => {
			if (!proc.pid) return;

			try {
				if (process.platform !== 'win32') {
					process.kill(-proc.pid, 'SIGTERM');
				} else {
					proc.kill('SIGTERM');
				}
			} catch {
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

	const handleSignal = (): void => {
		cleanup();
		commandOutputs.forEach((output) => {
			if (output.isRunning) {
				output.isRunning = false;
				output.exitCode = 130;
			}
		});
		renderOutputs(commandOutputs, false);
		process.stdout.write(`\n${ANSI.RED}Terminated by user${ANSI.RESET}\n`);
		process.exit(130);
	};

	process.on('SIGINT', handleSignal);

	const startRenderLoop = (): void => {
		if (renderInterval !== null) return;

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			process.stdin.on('data', (key: string) => {
				if (key === 'q') {
					cleanup();
					commandOutputs.forEach((output) => {
						if (output.isRunning) {
							output.isRunning = false;
							output.exitCode = 0;
						}
					});
					renderOutputs(commandOutputs, false);
					process.stdout.write(`\n${ANSI.GREEN}Quit by user${ANSI.RESET}\n`);
					process.exit(0);
				}

				if (key === 'o') {
					const url = 'http://localhost:5678';
					const command =
						process.platform === 'darwin'
							? `open ${url}`
							: process.platform === 'win32'
								? `start ${url}`
								: `xdg-open ${url}`;

					exec(command, () => {});
				}

				if (key === '\u0003') {
					handleSignal();
				}
			});
		}

		renderOutputs(commandOutputs, isFirstRender);
		isFirstRender = false;

		renderInterval = setInterval(() => {
			renderOutputs(commandOutputs, isFirstRender);

			if (commandOutputs.every((o) => !o.isRunning)) {
				cleanup();
				renderOutputs(commandOutputs, isFirstRender);

				const maxExitCode = Math.max(...commandOutputs.map((o) => o.exitCode ?? 0));
				process.stdout.write(
					`\n\n${ANSI.BOLD}All commands completed.${ANSI.RESET} Exit code: ${maxExitCode}\n`,
				);
				process.exit(maxExitCode);
			}
		}, CONFIG.RENDER_INTERVAL_MS);
	};

	const runPersistentCommand = (
		cmd: string,
		args: string[],
		opts: {
			cwd?: string;
			env?: NodeJS.ProcessEnv;
			name?: string;
		} = {},
	): ChildProcess => {
		const output: CommandOutput = {
			name: opts.name ?? cmd,
			lines: [],
			isRunning: true,
			exitCode: null,
		};

		commandOutputs.push(output);

		const child = spawn(cmd, args, {
			shell: true,
			cwd: opts.cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: process.platform !== 'win32',
			env: {
				...process.env,
				...opts.env,
				FORCE_COLOR: '3',
				COLORTERM: 'truecolor',
				TERM: 'xterm-256color',
			},
		});

		childProcesses.push(child);

		const handleData = (data: Buffer) => processStreamData(data, output.lines);

		child.stdout.on('data', handleData);
		child.stderr.on('data', handleData);

		child.on('close', (code) => {
			output.isRunning = false;
			output.exitCode = code;
		});

		if (commandOutputs.length === 1) startRenderLoop();

		return child;
	};

	return {
		runPersistentCommand,
	};
}

export async function readPackageName(): Promise<string> {
	return await fs
		.readFile('package.json', 'utf-8')
		.then((packageJson) => jsonParse<{ name: string }>(packageJson)?.name ?? 'unknown');
}
