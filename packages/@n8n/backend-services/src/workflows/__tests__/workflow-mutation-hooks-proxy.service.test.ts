import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import {
	type WorkflowMutationHooks,
	WorkflowMutationHooksProxy,
} from '../workflow-mutation-hooks-proxy.service';

describe('WorkflowMutationHooksProxy', () => {
	test('every hook is a no-op when no provider is registered', async () => {
		const proxy = new WorkflowMutationHooksProxy(mock<Logger>());

		await expect(proxy.afterWorkflowArchived('workflow-1', 'user-1')).resolves.toBeUndefined();
		await expect(
			proxy.afterWorkflowsTransferred(['workflow-1'], 'user-1'),
		).resolves.toBeUndefined();
		await expect(proxy.beforeWorkflowDeleted('workflow-1', 'user-1')).resolves.toBeUndefined();
		await expect(proxy.afterWorkflowsDeleted(['workflow-1'])).resolves.toBeUndefined();
		await expect(
			proxy.afterWorkflowPublished({ workflowId: 'workflow-1', versionId: 'v-1', userId: 'u-1' }),
		).resolves.toBeUndefined();
	});

	test('forwards each hook to all registered providers', async () => {
		const proxy = new WorkflowMutationHooksProxy(mock<Logger>());
		const providers = [mock<WorkflowMutationHooks>(), mock<WorkflowMutationHooks>()];
		for (const provider of providers) {
			proxy.registerProvider(provider);
		}

		await proxy.afterWorkflowArchived('workflow-1', 'user-1');
		await proxy.afterWorkflowsTransferred(['workflow-1', 'workflow-2'], null);
		await proxy.beforeWorkflowDeleted('workflow-3', 'user-1');
		await proxy.afterWorkflowsDeleted(['workflow-4', 'workflow-5']);
		await proxy.afterWorkflowPublished({
			workflowId: 'workflow-6',
			versionId: 'v-1',
			userId: 'user-1',
		});

		for (const provider of providers) {
			expect(provider.afterWorkflowArchived).toHaveBeenCalledExactlyOnceWith(
				'workflow-1',
				'user-1',
			);
			expect(provider.afterWorkflowsTransferred).toHaveBeenCalledExactlyOnceWith(
				['workflow-1', 'workflow-2'],
				null,
			);
			expect(provider.beforeWorkflowDeleted).toHaveBeenCalledExactlyOnceWith(
				'workflow-3',
				'user-1',
			);
			expect(provider.afterWorkflowsDeleted).toHaveBeenCalledExactlyOnceWith([
				'workflow-4',
				'workflow-5',
			]);
			expect(provider.afterWorkflowPublished).toHaveBeenCalledExactlyOnceWith({
				workflowId: 'workflow-6',
				versionId: 'v-1',
				userId: 'user-1',
			});
		}
	});

	test('allows a provider to handle only transfers and registers it once', async () => {
		const proxy = new WorkflowMutationHooksProxy(mock<Logger>());
		const provider = { afterWorkflowsTransferred: vi.fn().mockResolvedValue(undefined) };
		proxy.registerProvider(provider);
		proxy.registerProvider(provider);

		await proxy.afterWorkflowArchived('workflow-1', null);
		await proxy.beforeWorkflowDeleted('workflow-1', null);
		await proxy.afterWorkflowsDeleted(['workflow-1']);
		await proxy.afterWorkflowPublished({
			workflowId: 'workflow-1',
			versionId: 'v-1',
			userId: 'u-1',
		});
		await proxy.afterWorkflowsTransferred(['workflow-1'], null);

		expect(provider.afterWorkflowsTransferred).toHaveBeenCalledExactlyOnceWith(
			['workflow-1'],
			null,
		);
	});

	test.each(['throws', 'rejects'] as const)(
		'continues to the next provider when a hook %s',
		async (failure) => {
			const logger = mock<Logger>();
			const proxy = new WorkflowMutationHooksProxy(logger);
			const error = new Error('Cleanup failed');
			const fail = vi.fn<() => Promise<void>>().mockImplementation(() => {
				throw error;
			});
			if (failure === 'rejects') fail.mockRejectedValue(error);
			const failed = {
				afterWorkflowsTransferred: fail,
			};
			const next = { afterWorkflowsTransferred: vi.fn().mockResolvedValue(undefined) };
			proxy.registerProvider(failed);
			proxy.registerProvider(next);

			await expect(
				proxy.afterWorkflowsTransferred(['workflow-1'], 'user-1'),
			).resolves.toBeUndefined();
			expect(next.afterWorkflowsTransferred).toHaveBeenCalledExactlyOnceWith(
				['workflow-1'],
				'user-1',
			);
			expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Workflow mutation hook failed', {
				hook: 'afterWorkflowsTransferred',
				provider: 'Object',
				error,
			});
		},
	);
});
