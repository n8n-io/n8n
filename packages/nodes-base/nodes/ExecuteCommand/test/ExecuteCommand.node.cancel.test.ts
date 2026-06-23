import { exec } from 'child_process';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { ManualExecutionCancelledError } from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { ExecuteCommand } from '../ExecuteCommand.node';

vi.mock('child_process', () => ({ exec: vi.fn() }));

const SIGKILL_GRACE_MS = 5000;

class FakeChild extends EventEmitter {
	kill = vi.fn();
}

describe('ExecuteCommand cancellation', () => {
	const mockedExec = vi.mocked(exec);
	let node: ExecuteCommand;
	let child: FakeChild;
	let execCallback: ((error: Error | null, stdout: string, stderr: string) => void) | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		node = new ExecuteCommand();
		child = new FakeChild();
		execCallback = undefined;
		mockedExec.mockImplementation(((
			_command: string,
			_options: unknown,
			onComplete: typeof execCallback,
		) => {
			execCallback = onComplete;
			return child as unknown as ChildProcess;
		}) as unknown as typeof exec);
	});

	afterEach(() => {
		vi.useRealTimers();
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

	it('terminates the child with SIGTERM then escalates to SIGKILL on cancellation', async () => {
		const controller = new AbortController();
		const promise = node.execute.call(createContext({ signal: controller.signal }));
		await Promise.resolve();

		controller.abort();
		expect(child.kill).toHaveBeenCalledTimes(1);
		expect(child.kill).toHaveBeenCalledWith('SIGTERM');

		vi.advanceTimersByTime(SIGKILL_GRACE_MS);
		expect(child.kill).toHaveBeenCalledTimes(2);
		expect(child.kill).toHaveBeenLastCalledWith('SIGKILL');

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
		expect(mockedExec).not.toHaveBeenCalled();
	});

	it('resolves normally and never kills the child or leaves a timer pending', async () => {
		const controller = new AbortController();
		const promise = node.execute.call(createContext({ signal: controller.signal }));
		await Promise.resolve();

		child.emit('exit', 0);
		execCallback?.(null, 'hello\n', '');
		child.emit('close');

		await expect(promise).resolves.toEqual([
			[{ json: { exitCode: 0, stdout: 'hello', stderr: '' }, pairedItem: { item: 0 } }],
		]);
		expect(child.kill).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
});
