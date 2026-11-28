import { SandboxServiceError, type CodeTaskDoneEvent } from '@n8n/sandbox-client';
import type { InstanceSettings } from 'n8n-core';
import { setTimeout as sleep } from 'node:timers/promises';
import { mock } from 'vitest-mock-extended';

import type { CodeSandboxClient } from '../code-sandbox-client';
import { CodeSandboxesFullError, ScopeClient, type SandboxOptions } from '../scope-client';
import type { ScopeKey } from '../scope-key';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('ScopeClient', () => {
	const scopeKey: ScopeKey = { value: 'e:42', singleUse: false };
	const options: SandboxOptions = {
		runtime: 'n8n-js',
		runtimeVersion: '2.42.0',
		maxConcurrency: 2,
		memoryMb: 512,
	};
	const task = { taskId: 't1', taskInput: Buffer.from('{}') };
	const done: CodeTaskDoneEvent = { type: 'done', taskId: 't1', result: [], outputs: [] };
	const full = new SandboxServiceError('sandbox is full', 429);

	let client: ReturnType<typeof mock<CodeSandboxClient>>;
	let scopeClient: ScopeClient;

	beforeEach(() => {
		client = mock<CodeSandboxClient>();
		client.getOrCreateSandbox.mockImplementation(async ({ name }) => ({
			id: `sbx-${name}`,
			name,
			created: true,
			state: 'ready',
		}));
		scopeClient = new ScopeClient(client, mock<InstanceSettings>({ instanceId: 'instance-1' }));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.mocked(sleep).mockReset();
	});

	it('gives the same sandbox names in all processes of an instance', async () => {
		const otherProcess = mock<CodeSandboxClient>();
		otherProcess.getOrCreateSandbox.mockResolvedValue({
			id: 'sbx',
			name: 'n',
			created: false,
			state: 'ready',
		});
		otherProcess.runTask.mockResolvedValue(done);
		client.runTask.mockResolvedValue(done);

		await scopeClient.runTask(scopeKey, options, task);
		await new ScopeClient(
			otherProcess,
			mock<InstanceSettings>({ instanceId: 'instance-1' }),
		).runTask(scopeKey, options, task);

		expect(otherProcess.getOrCreateSandbox.mock.calls[0][0].name).toBe(
			client.getOrCreateSandbox.mock.calls[0][0].name,
		);
	});

	it('tries the next shard when a sandbox is full, and starts there for the next task', async () => {
		client.runTask.mockRejectedValueOnce(full).mockResolvedValue(done);

		await expect(scopeClient.runTask(scopeKey, options, task)).resolves.toBe(done);
		await scopeClient.runTask(scopeKey, options, task);

		const [first, second, third] = client.runTask.mock.calls.map(([sandboxId]) => sandboxId);
		expect(second).not.toBe(first);
		expect(third).toBe(second);
		expect(client.getOrCreateSandbox).toHaveBeenCalledTimes(2);
	});

	it('starts a task that arrives during a long run on the shard that took the long run', async () => {
		const longRun = deferred<CodeTaskDoneEvent>();
		client.runTask
			.mockRejectedValueOnce(full)
			.mockRejectedValueOnce(full)
			.mockReturnValueOnce(longRun.promise)
			.mockResolvedValue(done);

		const first = scopeClient.runTask(scopeKey, options, task);
		await vi.waitFor(() => expect(client.runTask).toHaveBeenCalledTimes(3));
		await scopeClient.runTask(scopeKey, options, task);
		longRun.resolve(done);
		await first;

		const [, , longRunShard, nextShard] = client.runTask.mock.calls.map(([sandboxId]) => sandboxId);
		expect(nextShard).toBe(longRunShard);
		expect(client.runTask).toHaveBeenCalledTimes(4);
	});

	it('waits longer after each pass over full sandboxes, up to one second', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		client.runTask.mockRejectedValue(full);
		vi.mocked(sleep).mockImplementation(async () => {
			if (vi.mocked(sleep).mock.calls.length === 5) vi.setSystemTime(Date.now() + 31_000);
		});

		await expect(scopeClient.runTask(scopeKey, options, task)).rejects.toBeInstanceOf(
			CodeSandboxesFullError,
		);
		expect(vi.mocked(sleep).mock.calls.map(([ms]) => ms)).toEqual([200, 400, 800, 1000, 1000]);
	});

	it.each([404, 410])('creates the sandbox again when it returns %i', async (status) => {
		client.runTask
			.mockRejectedValueOnce(new SandboxServiceError('gone', status))
			.mockResolvedValueOnce(done);

		await expect(scopeClient.runTask(scopeKey, options, task)).resolves.toBe(done);
		expect(client.getOrCreateSandbox).toHaveBeenCalledTimes(2);
	});

	it('lets a concurrent task create the sandbox again instead of reusing the dead id', async () => {
		const recreate = deferred<Awaited<ReturnType<CodeSandboxClient['getOrCreateSandbox']>>>();
		client.getOrCreateSandbox
			.mockResolvedValueOnce({ id: 'sbx-dead', name: 'n', created: true, state: 'ready' })
			.mockReturnValueOnce(recreate.promise)
			.mockResolvedValue({ id: 'sbx-new', name: 'n', created: false, state: 'ready' });
		client.runTask
			.mockRejectedValueOnce(new SandboxServiceError('gone', 404))
			.mockResolvedValue(done);

		const first = scopeClient.runTask(scopeKey, options, task);
		await vi.waitFor(() => expect(client.getOrCreateSandbox).toHaveBeenCalledTimes(2));
		const second = scopeClient.runTask(scopeKey, options, task);
		await vi.waitFor(() => expect(client.getOrCreateSandbox).toHaveBeenCalledTimes(3));

		expect(client.runTask).toHaveBeenCalledTimes(1);
		recreate.resolve({ id: 'sbx-new', name: 'n', created: true, state: 'ready' });
		await Promise.all([first, second]);
		expect(client.runTask.mock.calls.slice(1).map(([sandboxId]) => sandboxId)).toEqual([
			'sbx-new',
			'sbx-new',
		]);
	});

	it('does not try the next shard when the create is refused', async () => {
		const tenantLimit = new SandboxServiceError('too many sandboxes', 429);
		client.getOrCreateSandbox.mockRejectedValue(tenantLimit);

		await expect(scopeClient.runTask(scopeKey, options, task)).rejects.toBe(tenantLimit);
		expect(client.getOrCreateSandbox).toHaveBeenCalledTimes(1);
	});

	it('creates no sandbox for a cancelled task', async () => {
		const signal = AbortSignal.abort();

		await expect(scopeClient.runTask(scopeKey, options, { ...task, signal })).rejects.toThrow();
		expect(client.getOrCreateSandbox).not.toHaveBeenCalled();
	});

	it('fails when the sandboxes stay full until the deadline', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		client.runTask.mockRejectedValue(full);

		const result = scopeClient.runTask(scopeKey, options, task).catch((e: unknown) => e);
		vi.setSystemTime(Date.now() + 31_000);

		expect(await result).toBeInstanceOf(CodeSandboxesFullError);
	});
});
