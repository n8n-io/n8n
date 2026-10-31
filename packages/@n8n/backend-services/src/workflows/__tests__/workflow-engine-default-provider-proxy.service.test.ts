import { mock } from 'vitest-mock-extended';

import {
	type WorkflowEngineDefaultProvider,
	WorkflowEngineDefaultProviderProxy,
} from '../workflow-engine-default-provider-proxy.service';

describe('WorkflowEngineDefaultProviderProxy', () => {
	test('returns undefined when no provider is registered', async () => {
		const proxy = new WorkflowEngineDefaultProviderProxy();

		await expect(proxy.getDefaultEngine()).resolves.toBeUndefined();
	});

	test.each(['v1', 'v2', undefined] as const)(
		'returns the value of the registered provider (%s)',
		async (value) => {
			const proxy = new WorkflowEngineDefaultProviderProxy();
			const provider = mock<WorkflowEngineDefaultProvider>();
			provider.getDefaultEngine.mockResolvedValue(value);
			proxy.registerProvider(provider);

			await expect(proxy.getDefaultEngine()).resolves.toBe(value);
			expect(provider.getDefaultEngine).toHaveBeenCalledOnce();
		},
	);
});
