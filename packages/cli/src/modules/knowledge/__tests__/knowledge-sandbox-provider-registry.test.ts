import type { CommandResult, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import type {
	KnowledgeSandboxHandle,
	KnowledgeSandboxProvider,
} from '../knowledge-sandbox-provider';
import { KnowledgeSandboxProviderRegistry } from '../knowledge-sandbox-provider-registry';

const scope: KnowledgeConsumerScope = { kind: 'agent', projectId: 'project-1', agentId: 'agent-1' };

describe('KnowledgeSandboxProviderRegistry', () => {
	let registry: KnowledgeSandboxProviderRegistry;
	let provider: ReturnType<typeof mock<KnowledgeSandboxProvider>>;

	beforeEach(() => {
		registry = new KnowledgeSandboxProviderRegistry();
		provider = mock<KnowledgeSandboxProvider>();
	});

	it('reports no provider until a consumer registers one', () => {
		expect(registry.isRegistered).toBe(false);

		registry.register(provider);

		expect(registry.isRegistered).toBe(true);
	});

	describe('with a registered provider', () => {
		beforeEach(() => {
			registry.register(provider);
		});

		it('delegates assertConfiguration with the scope', () => {
			registry.assertConfiguration(scope);

			expect(provider.assertConfiguration).toHaveBeenCalledWith(scope);
		});

		it('delegates acquire and returns the handle of the provider untouched', async () => {
			const handle = mock<KnowledgeSandboxHandle>({ cacheKey: 'daytona:knowledge:sandbox-1' });
			provider.acquire.mockResolvedValue(handle);

			await expect(registry.acquire(scope)).resolves.toBe(handle);
			expect(provider.acquire).toHaveBeenCalledWith(scope);
		});

		it('delegates executeCommand with the sandbox, command and timeout', async () => {
			const sandbox = mock<WorkspaceSandbox>();
			const result = mock<CommandResult>({ exitCode: 0, stdout: 'ok' });
			provider.executeCommand.mockResolvedValue(result);

			await expect(registry.executeCommand(sandbox, 'cat manifest', 120_000)).resolves.toBe(result);
			expect(provider.executeCommand).toHaveBeenCalledWith(sandbox, 'cat manifest', 120_000);
		});

		it('delegates warm with the scope', async () => {
			await registry.warm(scope);

			expect(provider.warm).toHaveBeenCalledWith(scope);
		});

		it('delegates destroy with the scope', async () => {
			await registry.destroy(scope);

			expect(provider.destroy).toHaveBeenCalledWith(scope);
		});

		it('hands every call to the last registered provider', async () => {
			const replacement = mock<KnowledgeSandboxProvider>();
			registry.register(replacement);

			await registry.warm(scope);

			expect(replacement.warm).toHaveBeenCalledWith(scope);
			expect(provider.warm).not.toHaveBeenCalled();
		});
	});

	describe('without a registered provider', () => {
		const expectedError = new UnexpectedError(
			'No knowledge sandbox provider is registered. A consumer module must register one on init before knowledge retrieval runs.',
		);

		it('throws on assertConfiguration', () => {
			expect(() => registry.assertConfiguration(scope)).toThrow(expectedError);
		});

		it.each([
			['acquire', async () => await registry.acquire(scope)],
			[
				'executeCommand',
				async () => await registry.executeCommand(mock<WorkspaceSandbox>(), 'ls', 1_000),
			],
			['warm', async () => await registry.warm(scope)],
		])('rejects %s', async (_method, call) => {
			await expect(call()).rejects.toThrow(expectedError);
		});

		it('resolves destroy, because teardown never throws and there is no sandbox to delete', async () => {
			await expect(registry.destroy(scope)).resolves.toBeUndefined();
		});
	});
});
