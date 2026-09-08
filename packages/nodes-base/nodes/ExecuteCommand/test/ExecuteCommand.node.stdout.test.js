import { spawn } from 'child_process';
import { EventEmitter } from 'events';
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
    let node;
    let child;
    beforeEach(() => {
        vi.clearAllMocks();
        node = new ExecuteCommand();
        child = new FakeChild();
        mockedSpawn.mockReturnValue(child);
    });
    const createContext = () => {
        const context = mock();
        context.getInputData.mockReturnValue([{ json: {} }]);
        context.getNodeParameter.mockImplementation(((name) => name === 'executeOnce' ? true : 'curl https://google.com'));
        context.getExecutionCancelSignal.mockReturnValue(undefined);
        context.continueOnFail.mockReturnValue(false);
        context.getNode.mockReturnValue(mock());
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
            const spawnOptions = mockedSpawn.mock.calls[0][1];
            expect(spawnOptions.detached).not.toBe(true);
        }
        finally {
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        }
    });
});
//# sourceMappingURL=ExecuteCommand.node.stdout.test.js.map