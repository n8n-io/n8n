import { createTeamProject, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createCredentials } from '../../shared/db/credentials';
import { createMember } from '../../shared/db/users';

describe('CredentialsRepository.findCredentialsUsableInProject', () => {
	let repository: CredentialsRepository;
	let sharings: SharedCredentialsRepository;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(CredentialsRepository);
		sharings = Container.get(SharedCredentialsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each(['personal', 'team'])(
		'accepts a global credential in a %s project',
		async (projectType) => {
			const project =
				projectType === 'personal'
					? await getPersonalProject(await createMember())
					: await createTeamProject();
			const ownerProject = await createTeamProject();
			const credential = await createCredentials(
				{ name: 'Global Slack', type: 'slackApi', data: '', isGlobal: true },
				ownerProject,
			);

			expect(await repository.findCredentialsUsableInProject(project.id, [credential.id])).toEqual([
				{ id: credential.id, name: credential.name, type: credential.type },
			]);
			expect(
				await sharings.findOneBy({ credentialsId: credential.id, projectId: project.id }),
			).toBeNull();

			await repository.update(credential.id, { isGlobal: false });

			expect(await repository.findCredentialsUsableInProject(project.id, [credential.id])).toEqual(
				[],
			);
		},
	);

	it('lists project and global credentials once and keeps the ID filter', async () => {
		const project = await createTeamProject();
		const otherProject = await createTeamProject();
		const local = await createCredentials({ name: 'Local', type: 'slackApi', data: '' }, project);
		const shared = await createCredentials(
			{ name: 'Shared', type: 'slackApi', data: '' },
			otherProject,
		);
		const global = await createCredentials(
			{ name: 'Global', type: 'slackApi', data: '', isGlobal: true },
			otherProject,
		);
		await sharings.save(
			[shared, global].map((credential) => ({
				credentialsId: credential.id,
				projectId: project.id,
				role: 'credential:user',
			})),
		);
		await createCredentials({ name: 'Other project', type: 'slackApi', data: '' }, otherProject);

		const listed = await repository.findCredentialsUsableInProject(project.id);
		expect(listed.map((credential) => credential.id).sort()).toEqual(
			[local.id, shared.id, global.id].sort(),
		);
		expect(await repository.findCredentialsUsableInProject(project.id, [local.id])).toEqual([
			{ id: local.id, name: local.name, type: local.type },
		]);
		expect(await repository.findCredentialsUsableInProject(project.id, ['missing-id'])).toEqual([]);
		expect(await repository.findCredentialsUsableInProject(project.id, [])).toEqual([]);
	});

	it('keeps a renamed global credential accessible after its owner moves', async () => {
		const project = await createTeamProject();
		const destination = await createTeamProject();
		const credential = await createCredentials(
			{ name: 'Old Slack', type: 'slackApi', data: '', isGlobal: true },
			project,
		);
		await sharings.delete({ credentialsId: credential.id });
		await sharings.save({
			credentialsId: credential.id,
			projectId: destination.id,
			role: 'credential:owner',
		});
		await repository.update(credential.id, { name: 'Current Slack' });

		expect(await repository.findCredentialsUsableInProject(project.id, [credential.id])).toEqual([
			{ id: credential.id, name: 'Current Slack', type: 'slackApi' },
		]);
	});

	it('excludes instance credentials and credentials with pending authorization', async () => {
		const project = await createTeamProject();
		await createCredentials({
			name: 'Provider connection',
			type: 'slackApi',
			data: '',
			isGlobal: true,
			usageScope: 'instance',
		});
		await createCredentials(
			{
				name: 'Pending',
				type: 'slackOAuth2Api',
				data: '',
				isGlobal: true,
				pendingAuthorizationExpiresAt: new Date(Date.now() + 60_000),
			},
			project,
		);

		expect(await repository.findCredentialsUsableInProject(project.id)).toEqual([]);
	});
});
