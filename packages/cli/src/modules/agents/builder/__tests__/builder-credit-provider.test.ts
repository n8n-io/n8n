import type { User } from '@n8n/db';
import type { BuilderUsageItem } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { BuilderCreditProvider } from '../builder-credit-provider';
import { BuilderCreditProviderRegistry } from '../builder-credit-provider';

describe('BuilderCreditProviderRegistry', () => {
	const user = mock<User>({ id: 'user-1' });
	const usage: BuilderUsageItem[] = [
		{
			type: 'llmTokens',
			model: 'model-1',
			uncachedInput: 1,
			cacheRead: 0,
			cacheWrite: 0,
			output: 2,
		},
	];

	it('is a no-op when no provider is registered', async () => {
		const registry = new BuilderCreditProviderRegistry();

		await expect(
			registry.claimRunUsage(user, 'thread-1', 'dedupe-1', usage, 'completed'),
		).resolves.toBeUndefined();
	});

	it('forwards claims to the registered provider', async () => {
		const registry = new BuilderCreditProviderRegistry();
		const provider = mock<BuilderCreditProvider>();
		provider.claimRunUsage.mockResolvedValue(3);

		registry.register(provider);

		await expect(
			registry.claimRunUsage(user, 'thread-1', 'dedupe-1', usage, 'completed'),
		).resolves.toBe(3);
		expect(provider.claimRunUsage).toHaveBeenCalledWith(
			user,
			'thread-1',
			'dedupe-1',
			usage,
			'completed',
		);
	});
});
