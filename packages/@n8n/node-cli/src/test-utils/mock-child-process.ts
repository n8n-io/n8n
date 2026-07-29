import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

export interface MockChildProcess extends EventEmitter {
	stdout: EventEmitter | null;
	stderr: EventEmitter | null;
}

export interface MockSpawnOptions {
	exitCode?: number;
	signal?: NodeJS.Signals;
	stdout?: string;
	stderr?: string;
	error?: string;
}

export interface CommandMockConfig {
	command: string;
	args: string[];
	options?: MockSpawnOptions;
}

function createMockProcess(): ChildProcess {
	const emitter = new EventEmitter();
	const mockProcess: MockChildProcess = Object.assign(emitter, {
		stdout: new EventEmitter(),
		stderr: new EventEmitter(),
	});
	return mockProcess as unknown as ChildProcess;
}

function emitProcessEvents(mockProcess: MockChildProcess, options: MockSpawnOptions): void {
	const {
		exitCode = options.signal ? null : 0,
		signal = null,
		stdout = '',
		stderr = '',
		error,
	} = options;

	setImmediate(() => {
		if (error) {
			mockProcess.emit('error', new Error(error));
			setImmediate(() => {
				mockProcess.emit('close', exitCode !== 0 ? exitCode : 1, signal);
			});
			return;
		}

		if (stdout && mockProcess.stdout) {
			mockProcess.stdout.emit('data', Buffer.from(stdout));
		}
		if (stderr && mockProcess.stderr) {
			mockProcess.stderr.emit('data', Buffer.from(stderr));
		}

		mockProcess.emit('close', exitCode, signal);
	});
}

export function mockSpawn(command: string, args: string[], options?: MockSpawnOptions): void;
export function mockSpawn(commands: CommandMockConfig[]): void;
export function mockSpawn(
	commandOrCommands: string | CommandMockConfig[],
	args?: string[],
	options?: MockSpawnOptions,
): void {
	if (Array.isArray(commandOrCommands)) {
		const commands = commandOrCommands;
		let callIndex = 0;

		vi.mocked(spawn).mockImplementation((cmd, cmdArgs): ChildProcess => {
			if (callIndex >= commands.length) {
				throw new Error(`Unexpected spawn call: ${cmd} ${cmdArgs?.join(' ')}`);
			}

			const expectedConfig = commands[callIndex];
			expect(cmd).toBe(expectedConfig.command);
			expect(cmdArgs).toEqual(expectedConfig.args);

			const mockProcess = createMockProcess();
			const options = expectedConfig.options ?? {};

			emitProcessEvents(mockProcess, options);

			callIndex++;
			return mockProcess;
		});
	} else {
		const command = commandOrCommands;
		if (!args) throw new Error('args required for single command mock');

		vi.mocked(spawn).mockImplementation((cmd, cmdArgs): ChildProcess => {
			expect(cmd).toBe(command);
			expect(cmdArgs).toEqual(args);

			const mockProcess = createMockProcess();
			const mockOptions = options ?? {};

			emitProcessEvents(mockProcess, mockOptions);

			return mockProcess;
		});
	}
}

export interface ExecSyncMockConfig {
	command: string;
	result: string;
}

export function mockExecSync(configs: ExecSyncMockConfig[]): void {
	const configMap = new Map(configs.map((c) => [c.command, c.result]));

	vi.mocked(execSync).mockImplementation((command) => {
		const result = configMap.get(String(command));
		if (result === undefined) {
			throw new Error(`Unexpected execSync call: ${command}`);
		}
		return Buffer.from(result);
	});
}
