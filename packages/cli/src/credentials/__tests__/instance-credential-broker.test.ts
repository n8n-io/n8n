import type { Logger } from '@n8n/backend-common';
import type {
	CredentialsEntity,
	CredentialsRepository,
	InstanceCredentialAssignment,
	InstanceCredentialAssignmentRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '../credentials.service';
import { InstanceCredentialBroker } from '../instance-credential-broker';
import { InstanceCredentialUseRegistry } from '../instance-credential-use.registry';

describe('InstanceCredentialBroker', () => {
	const credentialUseId = 'example:primary';
	const useRegistry = new InstanceCredentialUseRegistry();
	const logger = mock<Logger>();
	const credentialsRepository = mock<CredentialsRepository>();
	const assignmentRepository = mock<InstanceCredentialAssignmentRepository>();
	const credentialsService = mock<CredentialsService>();
	const broker = new InstanceCredentialBroker(
		logger,
		useRegistry,
		credentialsRepository,
		assignmentRepository,
		credentialsService,
	);

	beforeAll(() => {
		broker.registerUse({
			id: credentialUseId,
			credentialTypes: ['openAiApi'],
		});
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('rejects unknown credential uses', async () => {
		await expect(broker.listForUse('unknown')).rejects.toThrow(
			'Unknown instance credential use "unknown"',
		);
	});

	it('lists only credentials allowed for the credential use', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		credentialsRepository.find.mockResolvedValue([credential]);

		await expect(broker.listForUse(credentialUseId)).resolves.toEqual([credential]);
		expect(credentialsRepository.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ availability: 'instance' }),
			}),
		);
	});

	it('rejects assignments outside the credential use policy', async () => {
		credentialsRepository.findOne.mockResolvedValue(null);

		await expect(broker.assignForUse(credentialUseId, 'workflow-credential')).rejects.toThrow(
			'not valid for instance credential use',
		);
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('assigns and clears a credential for a credential use', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		credentialsRepository.findOne.mockResolvedValue(credential);

		await expect(broker.assignForUse(credentialUseId, credential.id)).resolves.toEqual({
			id: credential.id,
			name: credential.name,
			type: credential.type,
		});
		expect(assignmentRepository.upsert).toHaveBeenCalledWith(
			{ credentialUseId, credentialId: credential.id },
			['credentialUseId'],
		);

		await broker.clearForUse(credentialUseId);
		expect(assignmentRepository.delete).toHaveBeenCalledWith({ credentialUseId });
	});

	it('returns no credential when the credential use has no assignment', async () => {
		assignmentRepository.findOneBy.mockResolvedValue(null);

		await expect(broker.resolveForUse(credentialUseId)).resolves.toBeNull();
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('resolves a credential through the shared decrypt path', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		assignmentRepository.findOneBy.mockResolvedValue(
			mock<InstanceCredentialAssignment>({ credentialUseId, credentialId: credential.id }),
		);
		credentialsRepository.findOne.mockResolvedValue(credential);
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret' });

		await expect(broker.resolveForUse(credentialUseId)).resolves.toEqual({
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data: { apiKey: 'secret' },
		});
		expect(credentialsService.decrypt).toHaveBeenCalledWith(credential, true);
		expect(logger.debug).toHaveBeenCalledWith('Resolved instance credential', {
			credentialUseId,
			credentialId: credential.id,
		});
		expect(credentialsRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: credential.id, availability: 'instance' }),
			}),
		);
	});
});
