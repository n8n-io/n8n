import type { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, InstanceCredentialAssignmentRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '../credentials.service';
import { InstanceCredentialBroker } from '../instance-credential-broker';
import { InstanceCredentialUseRegistry } from '../instance-credential-use.registry';

describe('InstanceCredentialBroker', () => {
	const credentialUse = {
		id: 'example:primary',
		credentialTypes: ['openAiApi'],
	} as const;
	const credentialUseId = credentialUse.id;
	const logger = mock<Logger>();
	const assignmentRepository = mock<InstanceCredentialAssignmentRepository>();
	const credentialsService = mock<CredentialsService>();
	const useRegistry = new InstanceCredentialUseRegistry();
	useRegistry.register(credentialUse);
	const broker = new InstanceCredentialBroker(
		logger,
		useRegistry,
		assignmentRepository,
		credentialsService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('rejects unregistered credential uses', async () => {
		const unknownUse = { id: 'unknown:use', credentialTypes: ['openAiApi'] } as const;

		await expect(broker.listForUse(unknownUse)).rejects.toThrow(
			'Unknown instance credential use "unknown:use"',
		);
		expect(assignmentRepository.findAvailableCredentials).not.toHaveBeenCalled();
	});

	it('enforces the registered credential types', async () => {
		const spoofedUse = { id: credentialUseId, credentialTypes: ['httpHeaderAuth'] } as const;

		await broker.listForUse(spoofedUse);

		expect(assignmentRepository.findAvailableCredentials).toHaveBeenCalledWith(['openAiApi']);
	});

	it('lists only credentials allowed for the credential use', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		assignmentRepository.findAvailableCredentials.mockResolvedValue([credential]);

		await expect(broker.listForUse(credentialUse)).resolves.toEqual([credential]);
		expect(assignmentRepository.findAvailableCredentials).toHaveBeenCalledWith(['openAiApi']);
	});

	it('rejects assignments outside the credential use policy', async () => {
		assignmentRepository.assignCredential.mockResolvedValue(null);

		await expect(broker.assignForUse(credentialUse, 'workflow-credential')).rejects.toThrow(
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
		assignmentRepository.assignCredential.mockResolvedValue(credential);

		await expect(broker.assignForUse(credentialUse, credential.id)).resolves.toEqual({
			id: credential.id,
			name: credential.name,
			type: credential.type,
		});
		expect(assignmentRepository.assignCredential).toHaveBeenCalledWith(
			credentialUseId,
			credential.id,
			['openAiApi'],
			undefined,
		);

		await broker.clearForUse(credentialUse);
		expect(assignmentRepository.clearCredential).toHaveBeenCalledWith(credentialUseId, undefined);
	});

	it('rejects the assignment when the credential is deleted concurrently', async () => {
		assignmentRepository.assignCredential.mockResolvedValue(null);

		await expect(broker.assignForUse(credentialUse, 'credential-id')).rejects.toThrow(
			'not valid for instance credential use',
		);
	});

	it('rethrows transient DB failures instead of blaming the credential', async () => {
		assignmentRepository.assignCredential.mockRejectedValue(new Error('deadlock detected'));

		await expect(broker.assignForUse(credentialUse, 'credential-id')).rejects.toThrow(
			'deadlock detected',
		);
	});

	it('returns no credential when the credential use has no assignment', async () => {
		assignmentRepository.findAssignedCredential.mockResolvedValue(null);

		await expect(broker.resolveForUse(credentialUse)).resolves.toBeNull();
		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('resolves a credential through the shared decrypt path', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		assignmentRepository.findAssignedCredential.mockResolvedValue({
			credentialId: credential.id,
			credential,
		});
		credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret' });

		await expect(broker.resolveForUse(credentialUse)).resolves.toEqual({
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
		expect(assignmentRepository.findAssignedCredential).toHaveBeenCalledWith(
			credentialUseId,
			['openAiApi'],
			undefined,
		);
	});
});
