import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { SharedCredentialsRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { createCredentials, getAllSharedCredentials } from '../../shared/db/credentials';

describe('SharedCredentialsRepository', () => {
	let repository: SharedCredentialsRepository;
	let transactionRunner: TransactionRunner;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(SharedCredentialsRepository);
		transactionRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedCredentials',
			'CredentialsEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const credentialAttributes = { name: 'Test', type: 'githubApi', data: '' };

	describe('findCredentialOwningProject', () => {
		it('returns the project that owns the credential', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes, project);

			const owner = await repository.findCredentialOwningProject(credential.id);

			expect(owner?.id).toBe(project.id);
		});

		it('returns undefined when the credential is only shared with a project', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes);
			await repository.save({
				credentialsId: credential.id,
				projectId: project.id,
				role: 'credential:user',
			});

			const owner = await repository.findCredentialOwningProject(credential.id);

			expect(owner).toBeUndefined();
		});

		it('reads through the transaction carried by ctx', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes);

			await expect(
				transactionRunner.run({}, async (ctx) => {
					await repository.ensureOwner(credential.id, project.id, ctx);
					const owner = await repository.findCredentialOwningProject(credential.id, ctx);
					expect(owner?.id).toBe(project.id);
					throw new Error('roll back');
				}),
			).rejects.toThrow('roll back');

			expect(await repository.findCredentialOwningProject(credential.id)).toBeUndefined();
		});
	});

	describe('removeAllForCredential', () => {
		it('deletes every sharing row of the credential and keeps other credentials', async () => {
			const owningProject = await createTeamProject();
			const otherProject = await createTeamProject();
			const credential = await createCredentials(credentialAttributes, owningProject);
			await repository.save({
				credentialsId: credential.id,
				projectId: otherProject.id,
				role: 'credential:user',
			});
			const untouched = await createCredentials(credentialAttributes, owningProject);

			await repository.removeAllForCredential(credential.id);

			expect(await getAllSharedCredentials()).toEqual([
				expect.objectContaining({ credentialsId: untouched.id, projectId: owningProject.id }),
			]);
		});

		it('joins the transaction carried by ctx', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes, project);

			await expect(
				transactionRunner.run({}, async (ctx) => {
					await repository.removeAllForCredential(credential.id, ctx);
					expect(await repository.findCredentialOwningProject(credential.id, ctx)).toBeUndefined();
					throw new Error('roll back');
				}),
			).rejects.toThrow('roll back');

			expect(await getAllSharedCredentials()).toHaveLength(1);
		});
	});

	describe('ensureOwner', () => {
		it('creates the owner row when the credential has no owner', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes);

			await repository.ensureOwner(credential.id, project.id);

			expect(await getAllSharedCredentials()).toEqual([
				expect.objectContaining({
					credentialsId: credential.id,
					projectId: project.id,
					role: 'credential:owner',
				}),
			]);
		});

		it('keeps the existing owner when another project already owns the credential', async () => {
			const owningProject = await createTeamProject();
			const otherProject = await createTeamProject();
			const credential = await createCredentials(credentialAttributes, owningProject);

			await repository.ensureOwner(credential.id, otherProject.id);

			expect(await getAllSharedCredentials()).toEqual([
				expect.objectContaining({
					credentialsId: credential.id,
					projectId: owningProject.id,
					role: 'credential:owner',
				}),
			]);
		});

		it('is idempotent for the project that already owns the credential', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes, project);

			await repository.ensureOwner(credential.id, project.id);
			await repository.ensureOwner(credential.id, project.id);

			expect(await getAllSharedCredentials()).toHaveLength(1);
		});

		it('joins the transaction carried by ctx', async () => {
			const project = await createTeamProject();
			const credential = await createCredentials(credentialAttributes);

			await expect(
				transactionRunner.run({}, async (ctx) => {
					await repository.ensureOwner(credential.id, project.id, ctx);
					throw new Error('roll back');
				}),
			).rejects.toThrow('roll back');

			expect(await getAllSharedCredentials()).toHaveLength(0);
		});
	});
});
