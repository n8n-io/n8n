import { mock } from 'vitest-mock-extended';

import {
	type WorkflowPublishGuard,
	WorkflowPublishGuardProxy,
} from '../workflow-publish-guard-proxy.service';

describe('WorkflowPublishGuardProxy', () => {
	test('allows publication when no review provider is registered', async () => {
		const proxy = new WorkflowPublishGuardProxy();

		await expect(proxy.assertCanPublish('workflow-1')).resolves.toBeUndefined();
	});

	test('asks the registered review provider before publication', async () => {
		const proxy = new WorkflowPublishGuardProxy();
		const provider = mock<WorkflowPublishGuard>();
		proxy.registerProvider(provider);

		await proxy.assertCanPublish('workflow-1');

		expect(provider.assertCanPublish).toHaveBeenCalledOnce();
		expect(provider.assertCanPublish).toHaveBeenCalledWith('workflow-1');
	});
});
