import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { createCredentials } from '../shared/db/credentials';
import { createAdmin, createMember, createServiceAccountWithProject } from '../shared/db/users';

describe('CredentialsService with a service account as the personal owner', () => {
	let credentialsService: CredentialsService;
	let projectRepository: ProjectRepository;

	beforeAll(async () => {
		await testDb.init();
		credentialsService = Container.get(CredentialsService);
		projectRepository = Container.get(ProjectRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedCredentials',
			'CredentialsEntity',
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** The credential ids each account's personal workflow and project may use. */
	async function usableCredentialIds(owner: User) {
		const project = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const workflow = await createWorkflow({}, project);
		const forWorkflow = await credentialsService.findAllCredentialIdsForWorkflow(workflow.id);
		const forProject = await credentialsService.findAllCredentialIdsForProject(project.id);
		return {
			forWorkflow: forWorkflow.map(({ id }) => id).sort(),
			forProject: forProject.map(({ id }) => id).sort(),
		};
	}

	// A member reaches only the credentials of their own project. An admin reaches
	// every personal credential.
	it.each([
		['member', GLOBAL_MEMBER_ROLE, createMember, false],
		['admin', GLOBAL_ADMIN_ROLE, createAdmin, true],
	])(
		'gives a service account with the %s role the same credentials as a person with that role',
		async (_name, role, createPerson, reachesAllPersonal) => {
			const person = await createPerson();
			const serviceAccount = await createServiceAccountWithProject(role);
			const personProject = await projectRepository.getPersonalProjectForUserOrFail(person.id);
			const serviceAccountProject = await projectRepository.getPersonalProjectForUserOrFail(
				serviceAccount.id,
			);
			const personCredential = await createCredentials(
				{ name: 'Person', type: 'slackApi', data: '' },
				personProject,
			);
			const serviceAccountCredential = await createCredentials(
				{ name: 'Service account', type: 'slackApi', data: '' },
				serviceAccountProject,
			);

			const forPerson = await usableCredentialIds(person);
			const forServiceAccount = await usableCredentialIds(serviceAccount);

			const all = [personCredential.id, serviceAccountCredential.id].sort();
			const expected = (ownId: string) =>
				reachesAllPersonal
					? { forWorkflow: all, forProject: all }
					: { forWorkflow: [ownId], forProject: [ownId] };
			expect(forPerson).toEqual(expected(personCredential.id));
			expect(forServiceAccount).toEqual(expected(serviceAccountCredential.id));
		},
	);
});
