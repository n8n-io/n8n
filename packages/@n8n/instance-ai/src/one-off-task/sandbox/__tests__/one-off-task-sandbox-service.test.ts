import type {
	CommandResult,
	ExecuteCommandOptions,
	SandboxFilesystem,
	SandboxInstance,
} from '@n8n/agents/sandbox';
import { OperationalError, UnexpectedError, jsonParse } from 'n8n-workflow';
import type { Mock } from 'vitest';

import type { Logger } from '../../../logger';
import { ONE_OFF_TASK_PI_VERSION, type HarnessReport, type SecretsManifest } from '../../contracts';
import {
	ONE_OFF_TASK_NODE_VERSION,
	ONE_OFF_TASK_SANDBOX_TTL_MS,
	OneOffTaskSandboxService,
} from '../one-off-task-sandbox-service';

vi.mock('../../harness-assets', () => ({
	harnessAssetFiles: {
		'AGENTS.md': 'conventions content',
		'.pi/extensions/redact.ts': 'extension code',
		'../.pi/agent/SYSTEM.md': 'system prompt',
		'/opt/absolute-asset.md': 'absolute content',
	},
}));

const WORKSPACE_ROOT = '/home/user/workspace';
const REPORT_FILE = `${WORKSPACE_ROOT}/.n8n-task/report.json`;
const PROMPT_FILE = `${WORKSPACE_ROOT}/.n8n-task/prompt.md`;
const NODE_BIN_DIR = `${WORKSPACE_ROOT}/.n8n-task/node/current/bin`;
const PI_BIN = `${WORKSPACE_ROOT}/.n8n-task/harness/node_modules/.bin/pi`;

function isPiCommand(command: string): boolean {
	return command.includes('/node_modules/.bin/pi ');
}

const okResult: CommandResult = {
	success: true,
	exitCode: 0,
	stdout: '',
	stderr: '',
	executionTimeMs: 5,
};

const validReport: HarnessReport = {
	status: 'completed',
	summary: 'Created the sheet',
	actions: [{ description: 'POST sheets.googleapis.com/v4/spreadsheets' }],
	verification: [{ check: 'columns', result: '4 columns present', passed: true }],
	artifacts: [{ label: 'Sheet', url: 'https://example.com/sheet' }],
};

const manifest: SecretsManifest = {
	version: 1,
	secrets: [{ envVar: 'N8N_TASK_GOOGLE_TOKEN', label: 'GOOGLE_TOKEN' }],
};

type ExecImpl = (
	command: string,
	args?: string[],
	options?: ExecuteCommandOptions,
) => Promise<CommandResult>;

function createSandboxMock(piExec?: ExecImpl): SandboxInstance & {
	executeCommand: Mock;
	_destroy: Mock;
} {
	const executeCommand = vi.fn(
		async (command: string, args?: string[], options?: ExecuteCommandOptions) => {
			if (command === 'echo $HOME') {
				return { ...okResult, stdout: '/home/user\n' };
			}
			if (isPiCommand(command) && piExec) {
				return await piExec(command, args, options);
			}
			return okResult;
		},
	);
	return {
		id: 'sandbox-1',
		name: 'test-sandbox',
		provider: 'n8n-sandbox',
		status: 'pending',
		executeCommand,
		_destroy: vi.fn(async () => await Promise.resolve()),
	};
}

function createFilesystemMock(overrides: Partial<SandboxFilesystem> = {}): SandboxFilesystem {
	return {
		id: 'fs-1',
		name: 'test-fs',
		provider: 'n8n-sandbox',
		status: 'ready',
		readFile: vi.fn(async () => await Promise.resolve(JSON.stringify(validReport))),
		writeFile: vi.fn(async () => await Promise.resolve()),
		appendFile: vi.fn(async () => await Promise.resolve()),
		deleteFile: vi.fn(async () => await Promise.resolve()),
		copyFile: vi.fn(async () => await Promise.resolve()),
		moveFile: vi.fn(async () => await Promise.resolve()),
		mkdir: vi.fn(async () => await Promise.resolve()),
		rmdir: vi.fn(async () => await Promise.resolve()),
		readdir: vi.fn(async () => await Promise.resolve([])),
		exists: vi.fn(async () => await Promise.resolve(true)),
		stat: vi.fn(async () => await Promise.reject(new Error('not implemented'))),
		...overrides,
	};
}

function createService(options?: {
	piExec?: ExecImpl;
	filesystem?: SandboxFilesystem;
	ttlMs?: number;
	logger?: Logger;
}) {
	const sandbox = createSandboxMock(options?.piExec);
	const filesystem = options?.filesystem ?? createFilesystemMock();
	const service = new OneOffTaskSandboxService({
		sandbox,
		filesystem,
		ttlMs: options?.ttlMs,
		logger: options?.logger,
	});
	return { service, sandbox, filesystem };
}

function createLoggerMock() {
	return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

type ExecCall = [string, string[]?, ExecuteCommandOptions?];
type WriteCall = [string, string];

function execCalls(sandbox: { executeCommand: Mock }): ExecCall[] {
	return sandbox.executeCommand.mock.calls as ExecCall[];
}

function writeCalls(filesystem: SandboxFilesystem): WriteCall[] {
	return (filesystem.writeFile as Mock).mock.calls as WriteCall[];
}

function runHarnessOptions(
	overrides: Partial<Parameters<OneOffTaskSandboxService['runHarness']>[0]> = {},
) {
	return {
		prompt: 'Create a Google Sheet with 4 columns',
		sessionId: '9b2f4de2-9df5-4f6f-8c9f-0f9df5a1c001',
		env: {},
		abortSignal: new AbortController().signal,
		onEvent: vi.fn(),
		...overrides,
	};
}

describe('OneOffTaskSandboxService', () => {
	describe('bootstrap', () => {
		it('downloads a pinned Node and installs the pinned pi locally (non-root, no -g)', async () => {
			const { service, sandbox } = createService();
			await service.bootstrap(manifest);

			const installCall = execCalls(sandbox).find(([command]) => command.includes('npm install'));
			const command = installCall?.[0] ?? '';
			expect(command).toMatch(/^set -e\n/);
			expect(command).toContain(
				`https://nodejs.org/dist/v${ONE_OFF_TASK_NODE_VERSION}/node-v${ONE_OFF_TASK_NODE_VERSION}-linux-`,
			);
			expect(command).toContain(
				`PATH=${NODE_BIN_DIR}:"$PATH" npm install --prefix ${WORKSPACE_ROOT}/.n8n-task/harness ` +
					`--ignore-scripts @earendil-works/pi-coding-agent@${ONE_OFF_TASK_PI_VERSION}`,
			);
			expect(command).not.toContain('npm install -g');
			expect(ONE_OFF_TASK_PI_VERSION).toBe('0.84.1');
			expect(ONE_OFF_TASK_NODE_VERSION).toBe('22.21.1');
		});

		it('gives the install exec its own budget, capped by the remaining TTL', async () => {
			const { service, sandbox } = createService();
			await service.bootstrap(manifest);

			const installCall = execCalls(sandbox).find(([command]) => command.includes('npm install'));
			// Fresh TTL (15 min) exceeds the install budget, so the budget wins.
			expect(installCall?.[2]?.timeout).toBe(180_000);
		});

		it('creates the task and session directories', async () => {
			const { service, filesystem } = createService();
			await service.bootstrap(manifest);

			expect(filesystem.mkdir).toHaveBeenCalledWith(
				`${WORKSPACE_ROOT}/.n8n-task`,
				expect.objectContaining({ recursive: true }),
			);
			expect(filesystem.mkdir).toHaveBeenCalledWith(
				`${WORKSPACE_ROOT}/.n8n-task/sessions`,
				expect.objectContaining({ recursive: true }),
			);
		});

		it('writes the secrets manifest as JSON at the contract path', async () => {
			const { service, filesystem } = createService();
			await service.bootstrap(manifest);

			const manifestCall = writeCalls(filesystem).find(
				([path]) => path === `${WORKSPACE_ROOT}/.n8n-task/secrets-manifest.json`,
			);
			expect(manifestCall).toBeDefined();
			expect(jsonParse(manifestCall?.[1] ?? '')).toEqual(manifest);
		});

		it('writes every harness asset file, resolving relative keys against the workspace root', async () => {
			const { service, filesystem } = createService();
			await service.bootstrap(manifest);

			const writtenPaths = writeCalls(filesystem).map(([path]) => path);
			expect(writtenPaths).toEqual(
				expect.arrayContaining([
					`${WORKSPACE_ROOT}/AGENTS.md`,
					`${WORKSPACE_ROOT}/.pi/extensions/redact.ts`,
					'/home/user/.pi/agent/SYSTEM.md',
					'/opt/absolute-asset.md',
				]),
			);
			const agentsCall = writeCalls(filesystem).find(
				([path]) => path === `${WORKSPACE_ROOT}/AGENTS.md`,
			);
			expect(agentsCall?.[1]).toBe('conventions content');
		});

		it('is idempotent — a second bootstrap overwrites the manifest and skips the reinstall', async () => {
			const { service, sandbox, filesystem } = createService();
			const relaunchManifest: SecretsManifest = {
				version: 1,
				secrets: [
					...manifest.secrets,
					{ envVar: 'N8N_TASK_SLACK_ACCESS_TOKEN', label: 'SLACK_ACCESS_TOKEN' },
				],
			};

			await service.bootstrap(manifest);
			await service.bootstrap(relaunchManifest);

			const manifestWrites = writeCalls(filesystem).filter(
				([path]) => path === `${WORKSPACE_ROOT}/.n8n-task/secrets-manifest.json`,
			);
			expect(manifestWrites).toHaveLength(2);
			expect(jsonParse(manifestWrites[1][1])).toEqual(relaunchManifest);

			// One combined install exec total: neither the Node download nor the
			// pi install re-runs on a relaunch bootstrap.
			const installs = execCalls(sandbox).filter(([command]) => command.includes('npm install'));
			expect(installs).toHaveLength(1);
			const downloads = execCalls(sandbox).filter(([command]) =>
				command.includes('nodejs.org/dist'),
			);
			expect(downloads).toHaveLength(1);
		});

		it('fails when the harness install exits non-zero', async () => {
			const { service, sandbox } = createService();
			sandbox.executeCommand.mockImplementation(async (command: string) => {
				if (command === 'echo $HOME') {
					return await Promise.resolve({ ...okResult, stdout: '/home/user\n' });
				}
				if (command.includes('npm install')) {
					return { ...okResult, success: false, exitCode: 1, stderr: 'npm broke' };
				}
				return okResult;
			});

			await expect(service.bootstrap(manifest)).rejects.toThrow(OperationalError);
		});
	});

	describe('runHarness', () => {
		it('invokes pi in JSON one-shot mode with the pinned session flags and an @file prompt', async () => {
			const { service, sandbox, filesystem } = createService();
			await service.bootstrap(manifest);
			const options = runHarnessOptions();
			await service.runHarness(options);

			const piCall = execCalls(sandbox).find(([command]) => isPiCommand(command));
			expect(piCall?.[0]).toBe(
				`PATH=${NODE_BIN_DIR}:"$PATH" ${PI_BIN} --mode json --approve ` +
					`--session-dir ${WORKSPACE_ROOT}/.n8n-task/sessions ` +
					`--session-id ${options.sessionId} ` +
					`@${PROMPT_FILE} < /dev/null`,
			);
			expect(piCall?.[2]).toEqual(expect.objectContaining({ cwd: WORKSPACE_ROOT }));

			const promptWrite = writeCalls(filesystem).find(([path]) => path === PROMPT_FILE);
			expect(promptWrite?.[1]).toBe(options.prompt);
		});

		it('reuses the same --session-id across relaunches', async () => {
			const { service, sandbox } = createService();
			await service.bootstrap(manifest);
			const sessionId = '9b2f4de2-9df5-4f6f-8c9f-0f9df5a1c001';
			await service.runHarness(runHarnessOptions({ sessionId }));
			await service.runHarness(runHarnessOptions({ sessionId }));

			const piCommands = execCalls(sandbox)
				.map(([command]) => command)
				.filter((command) => isPiCommand(command));
			expect(piCommands).toHaveLength(2);
			for (const command of piCommands) {
				expect(command).toContain(`--session-id ${sessionId}`);
			}
		});

		it('passes env only to the harness exec, never to bootstrap commands or files', async () => {
			const { service, sandbox, filesystem } = createService();
			await service.bootstrap(manifest);
			const env = { N8N_TASK_GOOGLE_TOKEN: 'secret-value' };
			await service.runHarness(runHarnessOptions({ env }));

			for (const [command, , options] of execCalls(sandbox)) {
				if (isPiCommand(command)) {
					expect(options?.env).toEqual(env);
				} else {
					expect(options?.env).toBeUndefined();
				}
			}

			for (const [, content] of writeCalls(filesystem)) {
				expect(String(content)).not.toContain('secret-value');
			}
		});

		it('threads the caller abort signal into the exec', async () => {
			const abortController = new AbortController();
			let execSignal: AbortSignal | undefined;
			const { service } = createService({
				piExec: async (_command, _args, options) => {
					execSignal = options?.abortSignal;
					return await new Promise<CommandResult>((_resolve, reject) => {
						options?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
					});
				},
			});
			await service.bootstrap(manifest);

			const run = service.runHarness(runHarnessOptions({ abortSignal: abortController.signal }));
			// Let the exec start before aborting.
			await vi.waitFor(() => expect(execSignal).toBeDefined());
			expect(execSignal?.aborted).toBe(false);
			abortController.abort();

			await expect(run).rejects.toThrow('aborted');
			expect(execSignal?.aborted).toBe(true);
		});

		it('forwards parsed JSONL events and tolerates garbage lines and split chunks', async () => {
			const { service } = createService({
				piExec: async (_command, _args, options) => {
					options?.onStdout?.('{"type":"session_header"}\n{"type":"message_up');
					options?.onStdout?.('date","delta":"hi"}\n');
					options?.onStdout?.('npm WARN not json at all\n');
					options?.onStdout?.('{"type":"tool_execution_end"}');
					return await Promise.resolve(okResult);
				},
			});
			await service.bootstrap(manifest);
			const onEvent = vi.fn();
			await service.runHarness(runHarnessOptions({ onEvent }));

			expect((onEvent.mock.calls as Array<[unknown]>).map(([event]) => event)).toEqual([
				{ type: 'session_header' },
				{ type: 'message_update', delta: 'hi' },
				{ type: 'tool_execution_end' },
			]);
		});

		it('keeps forwarding events when the onEvent handler throws', async () => {
			const { service } = createService({
				piExec: async (_command, _args, options) => {
					options?.onStdout?.('{"type":"first"}\n{"type":"second"}\n');
					return await Promise.resolve(okResult);
				},
			});
			await service.bootstrap(manifest);
			const onEvent = vi.fn((event: unknown) => {
				if ((event as { type: string }).type === 'first') throw new Error('consumer bug');
			});

			await expect(service.runHarness(runHarnessOptions({ onEvent }))).resolves.toBeDefined();
			expect(onEvent).toHaveBeenCalledTimes(2);
		});

		it('returns the validated report and the exec exit code', async () => {
			const { service } = createService({
				piExec: async () => await Promise.resolve({ ...okResult, exitCode: 0 }),
			});
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.report).toEqual(validReport);
			expect(result.exitCode).toBe(0);
		});

		it('returns report: undefined when the report file is missing (unclean stop)', async () => {
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.reject(new Error('404 not found'))),
			});
			const { service } = createService({
				filesystem,
				piExec: async () => await Promise.resolve({ ...okResult, exitCode: 137 }),
			});
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.report).toBeUndefined();
			expect(result.exitCode).toBe(137);
		});

		it('returns report: undefined when the report is not valid JSON', async () => {
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.resolve('not json at all')),
			});
			const { service } = createService({ filesystem });
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.report).toBeUndefined();
		});

		it('returns report: undefined when the report fails schema validation', async () => {
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.resolve(JSON.stringify({ status: 'completed' }))),
			});
			const { service } = createService({ filesystem });
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.report).toBeUndefined();
		});

		it('returns the bounded stderr tail (last 8KB) on an unclean stop', async () => {
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.reject(new Error('404 not found'))),
			});
			const { service } = createService({
				filesystem,
				piExec: async (_command, _args, options) => {
					options?.onStderr?.('x'.repeat(9_000));
					options?.onStderr?.('\nFATAL: no LLM key configured');
					return await Promise.resolve({ ...okResult, exitCode: 1 });
				},
			});
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.stderrTail).toBeDefined();
			// Bounded to the tail: the head is dropped, the fatal error survives.
			expect(result.stderrTail?.length).toBe(8_192);
			expect(result.stderrTail?.endsWith('FATAL: no LLM key configured')).toBe(true);
		});

		it('scrubs injected env values from the stderr tail and the warning log', async () => {
			const logger = createLoggerMock();
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.reject(new Error('404 not found'))),
			});
			const { service } = createService({
				filesystem,
				logger,
				piExec: async (_command, _args, options) => {
					options?.onStderr?.('auth failed for token super-secret-value, giving up\n');
					return await Promise.resolve({ ...okResult, exitCode: 1 });
				},
			});
			await service.bootstrap(manifest);

			const result = await service.runHarness(
				runHarnessOptions({ env: { N8N_TASK_GOOGLE_TOKEN: 'super-secret-value' } }),
			);
			expect(result.stderrTail).toContain('[REDACTED:N8N_TASK_GOOGLE_TOKEN]');
			expect(result.stderrTail).not.toContain('super-secret-value');

			const warnCalls = logger.warn.mock.calls as Array<[string, Record<string, unknown>?]>;
			const warnCall = warnCalls.find(([message]) => message.includes('without a valid report'));
			expect(warnCall).toBeDefined();
			expect(JSON.stringify(warnCall)).not.toContain('super-secret-value');
			expect(JSON.stringify(warnCall)).toContain('[REDACTED:N8N_TASK_GOOGLE_TOKEN]');
		});

		it('omits the stderr tail on a clean completion', async () => {
			const { service } = createService({
				piExec: async (_command, _args, options) => {
					options?.onStderr?.('harmless startup warning\n');
					return await Promise.resolve(okResult);
				},
			});
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.report).toEqual(validReport);
			expect(result.stderrTail).toBeUndefined();
		});

		it('deletes a stale report before launching the harness', async () => {
			const order: string[] = [];
			const filesystem = createFilesystemMock({
				deleteFile: vi.fn(async (path: string) => {
					if (path === REPORT_FILE) order.push('delete-report');
					await Promise.resolve();
				}),
			});
			const { service } = createService({
				filesystem,
				piExec: async () => {
					order.push('exec');
					return await Promise.resolve(okResult);
				},
			});
			await service.bootstrap(manifest);
			await service.runHarness(runHarnessOptions());

			expect(order).toEqual(['delete-report', 'exec']);
		});
	});

	describe('exec stream recovery', () => {
		const settledEvent = '{"type":"agent_settled"}\n';

		function hangingPiExec(stdout: string): ExecImpl {
			return async (_command, _args, options) => {
				options?.onStdout?.(stdout);
				return await new Promise<CommandResult>((_resolve, reject) => {
					const fail = () => reject(new Error('killed'));
					// The real client rejects promptly when the signal is already aborted.
					if (options?.abortSignal?.aborted) {
						fail();
						return;
					}
					options?.abortSignal?.addEventListener('abort', fail);
				});
			};
		}

		describe('settle watchdog (fake timers)', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('recovers the report when the exec stream hangs after a terminal event', async () => {
				const logger = createLoggerMock();
				const { service } = createService({ logger, piExec: hangingPiExec(settledEvent) });
				await service.bootstrap(manifest);

				const run = service.runHarness(runHarnessOptions());
				// Let the exec start and emit the terminal event, then wait out the grace period.
				await vi.advanceTimersByTimeAsync(0);
				await vi.advanceTimersByTimeAsync(60_000);

				const result = await run;
				expect(result.report).toEqual(validReport);
				expect(result.exitCode).toBe(-1);
				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining('recovering via report file'),
				);
			});

			it('treats the report_result tool finishing as a terminal signal', async () => {
				const { service } = createService({
					piExec: hangingPiExec('{"type":"tool_execution_end","toolName":"report_result"}\n'),
				});
				await service.bootstrap(manifest);

				const run = service.runHarness(runHarnessOptions());
				await vi.advanceTimersByTimeAsync(0);
				await vi.advanceTimersByTimeAsync(60_000);

				const result = await run;
				expect(result.report).toEqual(validReport);
			});

			it('never fires without a terminal signal — a mid-run hang stays with the TTL', async () => {
				const logger = createLoggerMock();
				let finishExec!: (result: CommandResult) => void;
				let execSignal: AbortSignal | undefined;
				const { service } = createService({
					logger,
					piExec: async (_command, _args, options) => {
						execSignal = options?.abortSignal;
						options?.onStdout?.('{"type":"message_update"}\n');
						return await new Promise<CommandResult>((resolve) => {
							finishExec = resolve;
						});
					},
				});
				await service.bootstrap(manifest);

				const run = service.runHarness(runHarnessOptions());
				await vi.advanceTimersByTimeAsync(0);
				await vi.advanceTimersByTimeAsync(120_000);

				expect(execSignal?.aborted).toBe(false);
				finishExec({ ...okResult, exitCode: 0 });
				const result = await run;
				expect(result.report).toEqual(validReport);
				expect(result.exitCode).toBe(0);
				expect(logger.warn).not.toHaveBeenCalledWith(
					expect.stringContaining('recovering via report file'),
				);
			});

			it('falls back to the unclean-stop result when the watchdog fires and no report exists', async () => {
				const filesystem = createFilesystemMock({
					readFile: vi.fn(async () => await Promise.reject(new Error('404 not found'))),
				});
				const { service } = createService({ filesystem, piExec: hangingPiExec(settledEvent) });
				await service.bootstrap(manifest);

				const run = service.runHarness(runHarnessOptions());
				await vi.advanceTimersByTimeAsync(0);
				await vi.advanceTimersByTimeAsync(60_000);

				const result = await run;
				expect(result.report).toBeUndefined();
				expect(result.exitCode).toBe(-1);
			});
		});

		it('prefers a valid report on disk over an exec transport error', async () => {
			const { service } = createService({
				piExec: async () => await Promise.reject(new Error('exec stream lost')),
			});
			await service.bootstrap(manifest);

			const result = await service.runHarness(runHarnessOptions());
			expect(result.report).toEqual(validReport);
			expect(result.exitCode).toBe(-1);
		});

		it('rethrows an exec error when no report exists', async () => {
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.reject(new Error('404 not found'))),
			});
			const { service } = createService({
				filesystem,
				piExec: async () => await Promise.reject(new Error('exec stream lost')),
			});
			await service.bootstrap(manifest);

			await expect(service.runHarness(runHarnessOptions())).rejects.toThrow('exec stream lost');
		});

		it('does not report-recover when the caller aborted', async () => {
			const abortController = new AbortController();
			// A valid report sits on disk, but a user cancel must not turn into a completion.
			const { service } = createService({ piExec: hangingPiExec('') });
			await service.bootstrap(manifest);

			const run = service.runHarness(runHarnessOptions({ abortSignal: abortController.signal }));
			abortController.abort();

			await expect(run).rejects.toThrow('killed');
		});
	});

	describe('destroy', () => {
		it('is idempotent — repeated calls destroy the provider sandbox once', async () => {
			const { service, sandbox } = createService();
			await service.bootstrap(manifest);

			await service.destroy();
			await service.destroy();
			expect(sandbox._destroy).toHaveBeenCalledTimes(1);
		});

		it('is safe before any remote resource exists (failed/skipped creation)', async () => {
			const { service, sandbox } = createService();
			await expect(service.destroy()).resolves.toBeUndefined();
			expect(sandbox._destroy).toHaveBeenCalledTimes(1);
		});

		it('stays retryable after a failed destroy', async () => {
			const { service, sandbox } = createService();
			sandbox._destroy.mockRejectedValueOnce(new Error('service unavailable'));

			await expect(service.destroy()).rejects.toThrow('service unavailable');
			await expect(service.destroy()).resolves.toBeUndefined();
			expect(sandbox._destroy).toHaveBeenCalledTimes(2);
		});

		it('aborts an in-flight harness exec', async () => {
			// Reads fail after destroy, so no report is recoverable.
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.reject(new Error('sandbox gone'))),
			});
			const { service } = createService({
				filesystem,
				piExec: async (_command, _args, options) =>
					await new Promise<CommandResult>((_resolve, reject) => {
						options?.abortSignal?.addEventListener('abort', () => reject(new Error('killed')));
					}),
			});
			await service.bootstrap(manifest);

			const run = service.runHarness(runHarnessOptions());
			await new Promise((resolve) => setImmediate(resolve));
			await service.destroy();

			await expect(run).rejects.toThrow(OperationalError);
		});

		it('rejects harness launches after destroy', async () => {
			const { service } = createService();
			await service.bootstrap(manifest);
			await service.destroy();

			await expect(service.runHarness(runHarnessOptions())).rejects.toThrow(UnexpectedError);
		});
	});

	describe('hard lifetime (TTL)', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('defaults to a 15 minute wall-clock lifetime and exposes it', () => {
			const { service } = createService();
			expect(service.ttlMs).toBe(ONE_OFF_TASK_SANDBOX_TTL_MS);
			expect(ONE_OFF_TASK_SANDBOX_TTL_MS).toBe(15 * 60_000);
		});

		it('exposes the deadline once armed', async () => {
			const { service } = createService({ ttlMs: 60_000 });
			expect(service.expiresAt).toBeUndefined();
			await service.bootstrap(manifest);
			expect(service.expiresAt?.getTime()).toBe(Date.now() + 60_000);
		});

		it('aborts a running exec and destroys the sandbox when the TTL fires', async () => {
			// Reads fail after the TTL destroy, so no report is recoverable.
			const filesystem = createFilesystemMock({
				readFile: vi.fn(async () => await Promise.reject(new Error('sandbox gone'))),
			});
			const { service, sandbox } = createService({
				ttlMs: 60_000,
				filesystem,
				piExec: async (_command, _args, options) =>
					await new Promise<CommandResult>((_resolve, reject) => {
						options?.abortSignal?.addEventListener('abort', () => reject(new Error('killed')));
					}),
			});
			await service.bootstrap(manifest);

			const run = service.runHarness(runHarnessOptions());
			const assertion = expect(run).rejects.toThrow('exceeded its maximum lifetime');
			await vi.advanceTimersByTimeAsync(60_000);

			await assertion;
			expect(sandbox._destroy).toHaveBeenCalledTimes(1);
		});

		it('rejects new harness launches after the TTL expired', async () => {
			const { service } = createService({ ttlMs: 60_000 });
			await service.bootstrap(manifest);
			await vi.advanceTimersByTimeAsync(60_000);

			await expect(service.runHarness(runHarnessOptions())).rejects.toThrow(
				'exceeded its maximum lifetime',
			);
		});
	});
});
