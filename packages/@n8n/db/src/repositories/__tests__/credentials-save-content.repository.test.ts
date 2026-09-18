import { credentialContentSubject } from '@n8n/decorators';
import { mintPolicyCleared } from '@n8n/decorators/policy-internal';
import type { EnforcementPoint, PolicySubject } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { CredentialsEntity } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { CredentialsRepository } from '../credentials.repository';

const newCredential = (type: string) => {
	const credential = new CredentialsEntity();
	credential.name = 'My credential';
	credential.type = type;
	credential.data = 'encrypted';
	return credential;
};

const clearance = (subject: PolicySubject, point: EnforcementPoint = 'credentialSave') =>
	mintPolicyCleared({ point, subject, decision: { violations: [] } });

const forContent = (credential: CredentialsEntity) =>
	clearance(credentialContentSubject(credential));

const forId = (id: string) => clearance({ type: 'credential', id });

describe('CredentialsRepository sealed writes', () => {
	const entityManager = mockEntityManager(CredentialsEntity);
	const repository = Container.get(CredentialsRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createContent', () => {
		it('writes through the manager when the clearance matches the type', async () => {
			const credential = newCredential('slackApi');

			await repository.createContent(credential, { policyCleared: forContent(credential) });

			expect(entityManager.save).toHaveBeenCalledWith(CredentialsEntity, credential);
		});

		it('throws and writes nothing without a clearance', async () => {
			await expect(repository.createContent(newCredential('slackApi'), {})).rejects.toThrow();

			expect(entityManager.save).not.toHaveBeenCalled();
		});

		it('throws and writes nothing when the clearance is for another type', async () => {
			const cleared = forContent(newCredential('githubApi'));

			await expect(
				repository.createContent(newCredential('slackApi'), { policyCleared: cleared }),
			).rejects.toThrow();

			expect(entityManager.save).not.toHaveBeenCalled();
		});

		it('throws when the clearance was minted for another point', async () => {
			const credential = newCredential('slackApi');
			const cleared = clearance(credentialContentSubject(credential), 'workflowSave');

			await expect(
				repository.createContent(credential, { policyCleared: cleared }),
			).rejects.toThrow();

			expect(entityManager.save).not.toHaveBeenCalled();
		});

		// A client-supplied id is no proof of what was checked, so it does not unlock the write.
		it('binds to the type, not a supplied id', async () => {
			const credential = newCredential('slackApi');
			credential.id = 'cred-1';

			await expect(
				repository.createContent(credential, { policyCleared: forId('cred-1') }),
			).rejects.toThrow();
			await repository.createContent(credential, { policyCleared: forContent(credential) });

			expect(entityManager.save).toHaveBeenCalledTimes(1);
		});
	});

	describe('updateContent', () => {
		it('writes through the manager when the clearance matches the id', async () => {
			await repository.updateContent(
				'cred-1',
				{ name: 'Renamed' },
				{ policyCleared: forId('cred-1') },
			);

			expect(entityManager.update).toHaveBeenCalledWith(CredentialsEntity, 'cred-1', {
				name: 'Renamed',
			});
		});

		it('throws and writes nothing when the clearance is for another credential', async () => {
			await expect(
				repository.updateContent('cred-1', { name: 'Renamed' }, { policyCleared: forId('cred-2') }),
			).rejects.toThrow();

			expect(entityManager.update).not.toHaveBeenCalled();
		});
	});

	describe('instance credential writes', () => {
		it('saveInstanceCredential requires a clearance for the type', async () => {
			const credential = newCredential('slackApi');

			await expect(repository.saveInstanceCredential(credential, {})).rejects.toThrow();
			await repository.saveInstanceCredential(credential, {
				policyCleared: forContent(credential),
			});

			expect(entityManager.save).toHaveBeenCalledTimes(1);
		});

		it('updateInstanceCredential requires a clearance for the id', async () => {
			const data = { id: 'cred-1', name: 'Renamed', type: 'slackApi', data: 'encrypted' };

			await expect(repository.updateInstanceCredential('cred-1', data, {})).rejects.toThrow();
			await repository.updateInstanceCredential('cred-1', data, { policyCleared: forId('cred-1') });

			expect(entityManager.update).toHaveBeenCalledTimes(1);
		});
	});

	describe('insertProjectCredentialWithOwner', () => {
		it('throws and writes nothing without a clearance for the type', async () => {
			const credential = newCredential('slackApi');

			await expect(
				repository.insertProjectCredentialWithOwner(credential, 'proj-1', [], {}),
			).rejects.toThrow();

			expect(entityManager.insert).not.toHaveBeenCalled();
		});
	});
});
