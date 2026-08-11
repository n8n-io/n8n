import { mock } from 'vitest-mock-extended';

import {
	type WorkflowMutationHooks,
	WorkflowMutationHooksProxy,
} from '../workflow-mutation-hooks-proxy.service';

describe('WorkflowMutationHooksProxy', () => {
	test('every hook is a no-op when no provider is registered', async () => {
		const proxy = new WorkflowMutationHooksProxy();

		await expect(proxy.afterWorkflowArchived('workflow-1')).resolves.toBeUndefined();
		await expect(proxy.afterWorkflowsTransferred(['workflow-1'])).resolves.toBeUndefined();
		await expect(proxy.beforeWorkflowDeleted('workflow-1')).resolves.toBeUndefined();
		await expect(proxy.afterWorkflowsDeleted(['workflow-1'])).resolves.toBeUndefined();
	});

	test('forwards each hook to the registered provider', async () => {
		const proxy = new WorkflowMutationHooksProxy();
		const provider = mock<WorkflowMutationHooks>();
		proxy.registerProvider(provider);

		await proxy.afterWorkflowArchived('workflow-1');
		await proxy.afterWorkflowsTransferred(['workflow-1', 'workflow-2']);
		await proxy.beforeWorkflowDeleted('workflow-3');
		await proxy.afterWorkflowsDeleted(['workflow-4', 'workflow-5']);

		expect(provider.afterWorkflowArchived).toHaveBeenCalledExactlyOnceWith('workflow-1');
		expect(provider.afterWorkflowsTransferred).toHaveBeenCalledExactlyOnceWith([
			'workflow-1',
			'workflow-2',
		]);
		expect(provider.beforeWorkflowDeleted).toHaveBeenCalledExactlyOnceWith('workflow-3');
		expect(provider.afterWorkflowsDeleted).toHaveBeenCalledExactlyOnceWith([
			'workflow-4',
			'workflow-5',
		]);
	});
});
