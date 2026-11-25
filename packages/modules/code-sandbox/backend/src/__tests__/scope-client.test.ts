import { SandboxServiceError, type CodeTaskDoneEvent } from '@n8n/sandbox-client';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { CodeSandboxClient } from '../code-sandbox-client';
import { CodeSandboxesFullError, ScopeClient, type SandboxOptions } from '../scope-client';
import type { ScopeKey } from '../scope-key';

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

	afterEach(() => vi.useRealTimers());

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

	it.each([404, 410])('creates the sandbox again when it returns %i', async (status) => {
		client.runTask
			.mockRejectedValueOnce(new SandboxServiceError('gone', status))
			.mockResolvedValueOnce(done);

		await expect(scopeClient.runTask(scopeKey, options, task)).resolves.toBe(done);
		expect(client.getOrCreateSandbox).toHaveBeenCalledTimes(2);
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

	it('fails when all sandboxes stay full until the deadline', async () => {
		vi.useFakeTimers();
		client.runTask.mockRejectedValue(full);

		const result = scopeClient.runTask(scopeKey, options, task).catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(31_000);

		expect(await result).toBeInstanceOf(CodeSandboxesFullError);
	});
});
