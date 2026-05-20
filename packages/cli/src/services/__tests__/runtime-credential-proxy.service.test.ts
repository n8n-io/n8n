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
		const result = await service.getRuntimeCredentials(runExecutionData, 'api_key');

		expect(result).toBeUndefined();
	});

	it('forwards arguments to the registered provider and returns its result', async () => {
		const provider: RuntimeCredentialProvider = {
			getRuntimeCredentials: jest.fn().mockResolvedValue('Bearer xyz'),
		};
		service.registerProvider(provider);

		const result = await service.getRuntimeCredentials(runExecutionData, 'api_key');

		expect(result).toBe('Bearer xyz');
		expect(provider.getRuntimeCredentials).toHaveBeenCalledWith(runExecutionData, 'api_key');
	});

	it('uses the last-registered provider when registerProvider is called multiple times', async () => {
		const providerA: RuntimeCredentialProvider = {
			getRuntimeCredentials: jest.fn().mockResolvedValue('from-a'),
		};
		const providerB: RuntimeCredentialProvider = {
			getRuntimeCredentials: jest.fn().mockResolvedValue('from-b'),
		};

		service.registerProvider(providerA);
		service.registerProvider(providerB);

		const result = await service.getRuntimeCredentials(runExecutionData, 'api_key');

		expect(result).toBe('from-b');
		expect(providerA.getRuntimeCredentials).not.toHaveBeenCalled();
		expect(providerB.getRuntimeCredentials).toHaveBeenCalledTimes(1);
	});
});
