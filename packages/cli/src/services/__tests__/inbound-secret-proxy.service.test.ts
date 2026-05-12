import type { IRunExecutionData } from 'n8n-workflow';

import {
	InboundSecretProxyService,
	type InboundSecretProvider,
} from '@/services/inbound-secret-proxy.service';

const runExecutionData = {} as IRunExecutionData;

describe('InboundSecretProxyService', () => {
	let service: InboundSecretProxyService;

	beforeEach(() => {
		service = new InboundSecretProxyService();
	});

	it('returns undefined when no provider is registered', async () => {
		const result = await service.getInboundArtifacts(
			runExecutionData,
			'Webhook',
			'headers.authorization',
			0,
		);

		expect(result).toBeUndefined();
	});

	it('forwards all arguments to the registered provider and returns its result', async () => {
		const provider: InboundSecretProvider = {
			getInboundArtifacts: jest.fn().mockResolvedValue('Bearer xyz'),
		};
		service.registerProvider(provider);

		const result = await service.getInboundArtifacts(
			runExecutionData,
			'Webhook',
			'headers.authorization',
			2,
		);

		expect(result).toBe('Bearer xyz');
		expect(provider.getInboundArtifacts).toHaveBeenCalledWith(
			runExecutionData,
			'Webhook',
			'headers.authorization',
			2,
		);
	});

	it('uses the last-registered provider when registerProvider is called multiple times', async () => {
		const providerA: InboundSecretProvider = {
			getInboundArtifacts: jest.fn().mockResolvedValue('from-a'),
		};
		const providerB: InboundSecretProvider = {
			getInboundArtifacts: jest.fn().mockResolvedValue('from-b'),
		};

		service.registerProvider(providerA);
		service.registerProvider(providerB);

		const result = await service.getInboundArtifacts(runExecutionData, 'Webhook', 'k', 0);

		expect(result).toBe('from-b');
		expect(providerA.getInboundArtifacts).not.toHaveBeenCalled();
		expect(providerB.getInboundArtifacts).toHaveBeenCalledTimes(1);
	});
});
