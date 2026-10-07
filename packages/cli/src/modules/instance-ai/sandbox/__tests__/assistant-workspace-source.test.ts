import type { User } from '@n8n/db';
import type { InstanceAiContext, SandboxConfig } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { AssistantSandboxWorkspaceSource } from '../assistant-workspace-source';
import type { InstanceAiSandboxService, RuntimeSandboxEntry } from '../instance-ai-sandbox.service';

const user = mock<User>({ id: 'user-1' });
const scope = { agentId: 'n8n-assistant', threadId: 'thread-1', projectId: 'project-1', user };
const daytona: SandboxConfig = { enabled: true, provider: 'daytona', timeout: 300_000 };

function setup(config: SandboxConfig = daytona, available = true) {
	const sandboxService = mock<InstanceAiSandboxService>();
	const entry = mock<RuntimeSandboxEntry>();
	sandboxService.getOrCreateWorkspaceEntry.mockResolvedValue(entry);
	sandboxService.getOrCreateWorkspace.mockResolvedValue(entry);
	const resolveConfig = vi.fn(async () => config);
	const source = new AssistantSandboxWorkspaceSource(sandboxService, {
		isAvailable: () => available,
		resolveConfig,
	});
	return { source, sandboxService, entry, resolveConfig };
}

describe('AssistantSandboxWorkspaceSource', () => {
	describe('acquire', () => {
		it('gives no lease when the sandboxed builder is not available', async () => {
			const { source, resolveConfig } = setup(daytona, false);

			expect(await source.acquire(scope)).toBeUndefined();
			expect(resolveConfig).not.toHaveBeenCalled();
		});

		it('gives no lease when the sandbox is disabled', async () => {
			const { source } = setup({ enabled: false, provider: 'daytona', timeout: 1 });

			expect(await source.acquire(scope)).toBeUndefined();
		});

		it('starts no sandbox until the lease is used', async () => {
			const { source, sandboxService } = setup();

			const lease = await source.acquire(scope);

			expect(lease?.workspaceRoot).toEqual(expect.any(String));
			expect(sandboxService.getOrCreateWorkspaceEntry).not.toHaveBeenCalled();
			expect(sandboxService.getOrCreateWorkspace).not.toHaveBeenCalled();
		});

		it('creates or reattaches the thread sandbox once per lease', async () => {
			const { source, sandboxService, entry } = setup();
			const lease = await source.acquire(scope);

			expect(await lease?.getEntry()).toBe(entry);
			expect(await lease?.getEntry()).toBe(entry);
			expect(sandboxService.getOrCreateWorkspaceEntry).toHaveBeenCalledTimes(1);
			expect(sandboxService.getOrCreateWorkspaceEntry).toHaveBeenCalledWith('thread-1', user);
		});

		it('retries the sandbox after a failed attempt', async () => {
			const { source, sandboxService, entry } = setup();
			sandboxService.getOrCreateWorkspaceEntry.mockRejectedValueOnce(new Error('busy'));
			const lease = await source.acquire(scope);

			await expect(lease?.getEntry()).rejects.toThrow('busy');
			expect(await lease?.getEntry()).toBe(entry);
		});

		it('runs the Assistant workspace setup through the sandbox service', async () => {
			const { source, sandboxService } = setup();
			const context = mock<InstanceAiContext>();
			const lease = await source.acquire(scope);

			await lease?.getSetupEntry(context);

			expect(sandboxService.getOrCreateWorkspace).toHaveBeenCalledWith('thread-1', user, context);
		});
	});

	describe('release', () => {
		it('drops the cached handle when the turn waits for the user', async () => {
			const { source, sandboxService } = setup();
			const lease = await source.acquire(scope);

			await source.release(scope, lease!, { status: 'suspended' });

			expect(sandboxService.forgetSandbox).toHaveBeenCalledWith('thread-1', 'turn_suspended');
		});

		it.each(['completed', 'errored', 'cancelled'] as const)(
			'keeps the cached handle after a %s turn',
			async (status) => {
				const { source, sandboxService } = setup();
				const lease = await source.acquire(scope);

				await source.release(scope, lease!, { status });

				expect(sandboxService.forgetSandbox).not.toHaveBeenCalled();
			},
		);
	});

	it('destroys the thread sandbox', async () => {
		const { source, sandboxService } = setup();

		await source.destroy({ threadId: 'thread-1', userId: 'user-1' });

		expect(sandboxService.destroySandbox).toHaveBeenCalledWith(
			'thread-1',
			'thread_cleanup',
			'user-1',
		);
	});
});
