import { spawn } from 'child_process';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { ExecuteCommand } from '../ExecuteCommand.node';

vi.mock('child_process', () => ({ spawn: vi.fn() }));

class FakeStream extends EventEmitter {
	setEncoding = vi.fn();
}

class FakeChild extends EventEmitter {
	stdout = new FakeStream();
	stderr = new FakeStream();
	pid = 4242;
	kill = vi.fn();
}

describe('ExecuteCommand stdout on Windows', () => {
	const mockedSpawn = vi.mocked(spawn);
	let node: ExecuteCommand;
	let child: FakeChild;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new ExecuteCommand();
		child = new FakeChild();
		mockedSpawn.mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);
	});

	const createContext = (): MockProxy<IExecuteFunctions> => {
		const context = mock<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation(((name: string) =>
			name === 'executeOnce' ? true : 'curl https://google.com') as never);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.continueOnFail.mockReturnValue(false);
		context.getNode.mockReturnValue(mock<INode>());
		return context;
	};

	it('does not detach the child on Windows so external programs still write to stdout', async () => {
		const originalPlatform = process.platform;
		Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
		try {
			const promise = node.execute.call(createContext());
			await Promise.resolve();

			child.stdout.emit('data', 'external program output\n');
			child.emit('close', 0);
			await promise;

			// On Windows, `detached: true` gives the child its own console window, so
			// external programs (e.g. curl) write to that detached console instead of the
			// inherited stdout pipe and the node returns an empty stdout. The child must
			// not be detached on Windows.
			const spawnOptions = mockedSpawn.mock.calls[0][1] as { detached?: boolean };
			expect(spawnOptions.detached).not.toBe(true);
		} finally {
			Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
		}
	});
});
