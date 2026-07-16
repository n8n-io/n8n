import type { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '../credentials.service';
import { InstanceCredentialBroker } from '../instance-credential-broker';
import { InstanceCredentialConsumerRegistry } from '../instance-credential-consumer.registry';

describe('InstanceCredentialBroker', () => {
	const consumerId = 'example:primary';
	const consumerRegistry = new InstanceCredentialConsumerRegistry();
	const logger = mock<Logger>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
	const broker = new InstanceCredentialBroker(
		logger,
		consumerRegistry,
		credentialsRepository,
		credentialsService,
	);

	beforeAll(() => {
		broker.registerConsumer({
			id: consumerId,
			credentialTypes: ['openAiApi'],
			isCredentialInUse: () => false,
		});
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('rejects unknown consumers', async () => {
		await expect(broker.listForConsumer('unknown')).rejects.toThrow(
			'Unknown instance credential consumer "unknown"',
		);
	});

	it('lists only credentials allowed by the consumer policy', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		credentialsRepository.find.mockResolvedValue([credential]);

		await expect(broker.listForConsumer(consumerId)).resolves.toEqual([credential]);
		expect(credentialsRepository.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ availability: 'instance' }),
			}),
		);
	});

	it('rejects credentials outside the consumer policy', async () => {
		credentialsRepository.findOne.mockResolvedValue(null);

		await expect(broker.resolveForConsumer(consumerId, 'workflow-credential')).rejects.toThrow(
			'not valid for instance credential consumer',
		);
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('finds the consumer currently using a credential', async () => {
		const registry = new InstanceCredentialConsumerRegistry();
		registry.register({
			id: 'example:usage',
			credentialTypes: ['openAiApi'],
			isCredentialInUse: (credentialId) => credentialId === 'credential-id',
		});

		await expect(registry.findConsumerUsingCredential('credential-id')).resolves.toMatchObject({
			id: 'example:usage',
		});
		await expect(registry.findConsumerUsingCredential('other-id')).resolves.toBeNull();
	});

	it('resolves a credential through the shared decrypt path', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		credentialsRepository.findOne.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret' });

		await expect(broker.resolveForConsumer(consumerId, credential.id)).resolves.toEqual({
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data: { apiKey: 'secret' },
		});
		expect(credentialsService.decrypt).toHaveBeenCalledWith(credential, true);
		expect(logger.debug).toHaveBeenCalledWith('Resolved instance credential', {
			consumerId,
			credentialId: credential.id,
		});
		expect(credentialsRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: credential.id, availability: 'instance' }),
			}),
		);
	});
});
