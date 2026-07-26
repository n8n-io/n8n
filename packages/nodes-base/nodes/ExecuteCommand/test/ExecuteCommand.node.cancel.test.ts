import { spawn } from 'child_process';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import { ManualExecutionCancelledError } from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { ExecuteCommand } from '../ExecuteCommand.node';

vi.mock('child_process', () => ({ spawn: vi.fn() }));

const SIGKILL_GRACE_MS = 5000;
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;
const CHILD_PID = 4242;

class FakeStream extends EventEmitter {
	setEncoding = vi.fn();
}

class FakeChild extends EventEmitter {
	stdout = new FakeStream();
	stderr = new FakeStream();
	pid = CHILD_PID;
	kill = vi.fn();
}

describe('ExecuteCommand cancellation', () => {
	const mockedSpawn = vi.mocked(spawn);
	let node: ExecuteCommand;
	let child: FakeChild;
	let killSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);
		node = new ExecuteCommand();
		child = new FakeChild();
		mockedSpawn.mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);
	});

	afterEach(() => {
		vi.useRealTimers();
		killSpy.mockRestore();
	});

	const createContext = (
		options: { signal?: AbortSignal; continueOnFail?: boolean } = {},
	): MockProxy<IExecuteFunctions> => {
		const context = mock<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation(((name: string) =>
			name === 'executeOnce' ? true : 'test-command') as never);
		context.getExecutionCancelSignal.mockReturnValue(options.signal);
		context.continueOnFail.mockReturnValue(options.continueOnFail ?? false);
		context.getNode.mockReturnValue(mock<INode>());
		return context;
	};

	it('signals the whole process group with SIGTERM then escalates to SIGKILL on cancellation', async () => {
		const controller = new AbortController();
		const promise = node.execute.call(createContext({ signal: controller.signal }));
		await Promise.resolve();

		controller.abort();
		expect(killSpy).toHaveBeenCalledTimes(1);
		expect(killSpy).toHaveBeenCalledWith(-CHILD_PID, 'SIGTERM');

		vi.advanceTimersByTime(SIGKILL_GRACE_MS);
		expect(killSpy).toHaveBeenCalledTimes(2);
		expect(killSpy).toHaveBeenLastCalledWith(-CHILD_PID, 'SIGKILL');

		await expect(promise).rejects.toBeInstanceOf(ManualExecutionCancelledError);
	});

	it('kills the whole process tree with taskkill on Windows', async () => {
		const originalPlatform = process.platform;
		Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
		try {
			const controller = new AbortController();
			const promise = node.execute.call(createContext({ signal: controller.signal }));
			await Promise.resolve();

			controller.abort();
			expect(mockedSpawn).toHaveBeenCalledWith('taskkill', ['/pid', String(CHILD_PID), '/T', '/F']);
			expect(killSpy).not.toHaveBeenCalled();

			await expect(promise).rejects.toBeInstanceOf(ManualExecutionCancelledError);
		} finally {
			Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
		}
	});

	it('falls back to killing the child directly when the group signal fails', async () => {
		killSpy.mockImplementation(() => {
			throw new Error('ESRCH');
		});
		const controller = new AbortController();
		const promise = node.execute.call(createContext({ signal: controller.signal }));
		await Promise.resolve();

		controller.abort();
		expect(child.kill).toHaveBeenCalledWith('SIGTERM');

		await expect(promise).rejects.toBeInstanceOf(ManualExecutionCancelledError);
	});

	it('does not swallow the cancellation when Continue On Fail is enabled', async () => {
		const controller = new AbortController();
		const promise = node.execute.call(
			createContext({ signal: controller.signal, continueOnFail: true }),
		);
		await Promise.resolve();

		controller.abort();

		await expect(promise).rejects.toBeInstanceOf(ManualExecutionCancelledError);
	});

	it('rejects without spawning a child when already cancelled', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			node.execute.call(createContext({ signal: controller.signal })),
		).rejects.toBeInstanceOf(ManualExecutionCancelledError);
		expect(mockedSpawn).not.toHaveBeenCalled();
	});

	it('caps captured stdout and stderr to a maximum size and keeps the tail', async () => {
		const promise = node.execute.call(createContext({ signal: new AbortController().signal }));
		await Promise.resolve();

		const chunk = 'x'.repeat(6 * 1024 * 1024);
		child.stdout.emit('data', chunk);
		child.stdout.emit('data', chunk);
		child.stdout.emit('data', 'y');
		child.stderr.emit('data', chunk);
		child.stderr.emit('data', chunk);
		child.stderr.emit('data', 'y');
		child.emit('close', 0);

		const result = (await promise) as Array<Array<{ json: { stdout: string; stderr: string } }>>;
		expect(result[0][0].json.stdout.length).toBe(MAX_OUTPUT_SIZE);
		expect(result[0][0].json.stdout.slice(-1)).toBe('y');
		expect(result[0][0].json.stderr.length).toBe(MAX_OUTPUT_SIZE);
		expect(result[0][0].json.stderr.slice(-1)).toBe('y');
	});

	it('resolves normally and never kills the process or leaves a timer pending', async () => {
		const controller = new AbortController();
		const promise = node.execute.call(createContext({ signal: controller.signal }));
		await Promise.resolve();

		child.stdout.emit('data', 'hello\n');
		child.emit('close', 0);

		await expect(promise).resolves.toEqual([
			[{ json: { exitCode: 0, stdout: 'hello', stderr: '' }, pairedItem: { item: 0 } }],
		]);
		expect(killSpy).not.toHaveBeenCalled();
		expect(child.kill).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
});
