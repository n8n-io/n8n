import type { Logger } from '@n8n/backend-common';
import {
	CredentialsEntity,
	InstanceCredentialAssignment,
	type CredentialsRepository,
	type InstanceCredentialAssignmentRepository,
} from '@n8n/db';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { QueryFailedError, type EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '../credentials.service';
import { InstanceCredentialBroker } from '../instance-credential-broker';
import { InstanceCredentialUseRegistry } from '../instance-credential-use.registry';

describe('InstanceCredentialBroker', () => {
	const credentialUseId = 'example:primary';
	const useRegistry = new InstanceCredentialUseRegistry();
	const logger = mock<Logger>();
	const entityManager = mock<EntityManager>();
	const credentialsRepository = mock<CredentialsRepository>({ manager: entityManager });
	const assignmentRepository = mock<InstanceCredentialAssignmentRepository>({
		manager: entityManager,
	});
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
		entityManager.findOne.mockResolvedValue(null);

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
		entityManager.findOne.mockResolvedValue(credential);

		await expect(broker.assignForUse(credentialUseId, credential.id)).resolves.toEqual({
			id: credential.id,
			name: credential.name,
			type: credential.type,
		});
		expect(entityManager.upsert).toHaveBeenCalledWith(
			InstanceCredentialAssignment,
			{ credentialUseId, credentialId: credential.id },
			['credentialUseId'],
		);

		await broker.clearForUse(credentialUseId);
		expect(entityManager.delete).toHaveBeenCalledWith(InstanceCredentialAssignment, {
			credentialUseId,
		});
	});

	it('rejects the assignment when the credential is deleted concurrently', async () => {
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			name: 'Primary model',
			type: 'openAiApi',
			availability: 'instance',
		});
		entityManager.findOne.mockResolvedValue(credential);
		entityManager.upsert.mockRejectedValue(
			new QueryFailedError('INSERT', [], new Error('FOREIGN KEY constraint failed')),
		);

		await expect(broker.assignForUse(credentialUseId, credential.id)).rejects.toThrow(
			'not valid for instance credential use',
		);
	});

	it('returns no credential when the credential use has no assignment', async () => {
		entityManager.findOneBy.mockResolvedValue(null);

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
		entityManager.findOneBy.mockResolvedValue(
			mock<InstanceCredentialAssignment>({ credentialUseId, credentialId: credential.id }),
		);
		entityManager.findOne.mockResolvedValue(credential);
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
		expect(entityManager.findOne).toHaveBeenCalledWith(
			CredentialsEntity,
			expect.objectContaining({
				where: expect.objectContaining({ id: credential.id, availability: 'instance' }),
			}),
		);
	});
});
