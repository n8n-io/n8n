import type { IRunExecutionData } from 'n8n-workflow';

import {
	RuntimeCredentialProxyService,
	type RuntimeCredentialProvider,
} from '@/services/runtime-credential-proxy.service';

const runExecutionData = {} as IRunExecutionData;

describe('RuntimeCredentialProxyService', () => {
	let service: RuntimeCredentialProxyService;

	beforeEach(() => {
		service = new RuntimeCredentialProxyService();
	});

	it('returns undefined when no provider is registered', async () => {
		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBeUndefined();
	});

	it('forwards arguments to the registered provider and returns its result', async () => {
		const provider: RuntimeCredentialProvider = {
			getRuntimeCredential: vi.fn().mockResolvedValue('Bearer xyz'),
		};
		service.registerProvider(provider);

		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBe('Bearer xyz');
		expect(provider.getRuntimeCredential).toHaveBeenCalledWith(runExecutionData, 'api_key');
	});

	it('uses the last-registered provider when registerProvider is called multiple times', async () => {
		const providerA: RuntimeCredentialProvider = {
			getRuntimeCredential: vi.fn().mockResolvedValue('from-a'),
		};
		const providerB: RuntimeCredentialProvider = {
			getRuntimeCredential: vi.fn().mockResolvedValue('from-b'),
		};

		service.registerProvider(providerA);
		service.registerProvider(providerB);

		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBe('from-b');
		expect(providerA.getRuntimeCredential).not.toHaveBeenCalled();
		expect(providerB.getRuntimeCredential).toHaveBeenCalledTimes(1);
	});
});
