import type { CommandResult, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import type {
	KnowledgeSandboxHandle,
	KnowledgeSandboxProvider,
} from '../knowledge-sandbox-provider';
import { KnowledgeSandboxProviderProxy } from '../knowledge-sandbox-provider-proxy';

const scope: KnowledgeConsumerScope = { kind: 'agent', projectId: 'project-1', agentId: 'agent-1' };

describe('KnowledgeSandboxProviderProxy', () => {
	let proxy: KnowledgeSandboxProviderProxy;
	let provider: ReturnType<typeof mock<KnowledgeSandboxProvider>>;

	beforeEach(() => {
		proxy = new KnowledgeSandboxProviderProxy();
		provider = mock<KnowledgeSandboxProvider>();
	});

	it('reports no provider until a consumer registers one', () => {
		expect(proxy.isRegistered).toBe(false);

		proxy.register(provider);

		expect(proxy.isRegistered).toBe(true);
	});

	describe('with a registered provider', () => {
		beforeEach(() => {
			proxy.register(provider);
		});

		it('delegates assertConfiguration with the scope', () => {
			proxy.assertConfiguration(scope);

			expect(provider.assertConfiguration).toHaveBeenCalledWith(scope);
		});

		it('delegates acquire and returns the handle of the provider untouched', async () => {
			const handle = mock<KnowledgeSandboxHandle>({ cacheKey: 'daytona:knowledge:sandbox-1' });
			provider.acquire.mockResolvedValue(handle);

			await expect(proxy.acquire(scope)).resolves.toBe(handle);
			expect(provider.acquire).toHaveBeenCalledWith(scope);
		});

		it('delegates executeCommand with the sandbox, command and timeout', async () => {
			const sandbox = mock<WorkspaceSandbox>();
			const result = mock<CommandResult>({ exitCode: 0, stdout: 'ok' });
			provider.executeCommand.mockResolvedValue(result);

			await expect(proxy.executeCommand(sandbox, 'cat manifest', 120_000)).resolves.toBe(result);
			expect(provider.executeCommand).toHaveBeenCalledWith(sandbox, 'cat manifest', 120_000);
		});

		it('delegates warm with the scope', async () => {
			await proxy.warm(scope);

			expect(provider.warm).toHaveBeenCalledWith(scope);
		});

		it('delegates destroy with the scope', async () => {
			await proxy.destroy(scope);

			expect(provider.destroy).toHaveBeenCalledWith(scope);
		});

		it('hands every call to the last registered provider', async () => {
			const replacement = mock<KnowledgeSandboxProvider>();
			proxy.register(replacement);

			await proxy.warm(scope);

			expect(replacement.warm).toHaveBeenCalledWith(scope);
			expect(provider.warm).not.toHaveBeenCalled();
		});
	});

	describe('without a registered provider', () => {
		const expectedError = new UnexpectedError(
			'No knowledge sandbox provider is registered. A consumer module must register one on init before knowledge retrieval runs.',
		);

		it('throws on assertConfiguration', () => {
			expect(() => proxy.assertConfiguration(scope)).toThrow(expectedError);
		});

		it.each([
			['acquire', async () => await proxy.acquire(scope)],
			[
				'executeCommand',
				async () => await proxy.executeCommand(mock<WorkspaceSandbox>(), 'ls', 1_000),
			],
			['warm', async () => await proxy.warm(scope)],
		])('rejects %s', async (_method, call) => {
			await expect(call()).rejects.toThrow(expectedError);
		});

		it('resolves destroy, because teardown never throws and there is no sandbox to delete', async () => {
			await expect(proxy.destroy(scope)).resolves.toBeUndefined();
		});
	});
});
