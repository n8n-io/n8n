import type { EnforcementPoint } from '@n8n/decorators';
import { credentialSubject } from '@n8n/decorators';
import { mintPolicyCleared } from '@n8n/decorators/policy-internal';
import { mock } from 'vitest-mock-extended';

import { CredentialsEntity } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { CredentialsRepository } from '../credentials.repository';
import type { CredentialDependencyRepository } from '../credential-dependency.repository';
import type { InstanceCredentialAssignmentRepository } from '../instance-credential-assignment.repository';

const clearanceFor = (
	content: { id?: string; type: string },
	point: EnforcementPoint = 'contentImport',
) =>
	mintPolicyCleared({
		point,
		subject: credentialSubject({ id: content.id ?? null, type: content.type }),
		decision: { violations: [] },
	});

describe('CredentialsRepository.upsertImportedContent', () => {
	const entityManager = mockEntityManager(CredentialsEntity);
	const credentialsRepository = new CredentialsRepository(
		entityManager.connection,
		mock<InstanceCredentialAssignmentRepository>(),
		mock<TransactionRunner>(),
		mock<CredentialDependencyRepository>(),
	);

	beforeEach(() => {
		vi.resetAllMocks();
		entityManager.upsert.mockResolvedValue({
			identifiers: [{ id: 'cred-1' }],
			generatedMaps: [],
			raw: [],
		});
	});

	// The load-bearing red: the write must reach the manager only past the clearance gate.
	it('writes through the resolved manager and returns the row id', async () => {
		const content = { id: 'cred-1', name: 'Imported', type: 'slackApi' };

		const id = await credentialsRepository.upsertImportedContent(content, {
			policyCleared: clearanceFor(content),
		});

		expect(entityManager.upsert).toHaveBeenCalledWith(CredentialsEntity, content, ['id']);
		expect(id).toBe('cred-1');
	});

	it('throws and writes nothing when the context carries no clearance', async () => {
		await expect(
			credentialsRepository.upsertImportedContent({ name: 'Imported', type: 'slackApi' }, {}),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	// An import that supplies no id binds to its type, so each credential in a batch gets its
	// own subject rather than every new one sharing an absent id.
	it('throws and writes nothing when the clearance is for a different type', async () => {
		const cleared = clearanceFor({ type: 'githubApi' });

		await expect(
			credentialsRepository.upsertImportedContent(
				{ name: 'Imported', type: 'slackApi' },
				{ policyCleared: cleared },
			),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	// The load-bearing negative: an existing row binds by id, not by type — a token cleared
	// for one credential's id must not unlock a write to a different row of the same type.
	it('throws and writes nothing when the clearance is for a different existing id', async () => {
		const cleared = clearanceFor({ id: 'cred-2', type: 'slackApi' });

		await expect(
			credentialsRepository.upsertImportedContent(
				{ id: 'cred-1', name: 'Imported', type: 'slackApi' },
				{ policyCleared: cleared },
			),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	// An import is not a save: a credentialSave clearance must not unlock the import write.
	it('throws and writes nothing when the clearance is for another enforcement point', async () => {
		const content = { id: 'cred-1', name: 'Imported', type: 'slackApi' };
		const cleared = clearanceFor(content, 'credentialSave');

		await expect(
			credentialsRepository.upsertImportedContent(content, { policyCleared: cleared }),
		).rejects.toThrow();

		expect(entityManager.upsert).not.toHaveBeenCalled();
	});

	it('throws when the upsert reports no id', async () => {
		entityManager.upsert.mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] });
		const content = { id: 'cred-1', name: 'Imported', type: 'slackApi' };

		await expect(
			credentialsRepository.upsertImportedContent(content, {
				policyCleared: clearanceFor(content),
			}),
		).rejects.toThrow('returned no id');
	});
});
