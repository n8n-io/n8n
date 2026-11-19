import { LicenseState } from '@n8n/backend-common';
import { CredentialsFinderService } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ProjectRole } from '@n8n/permissions';

import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';

import { createMember, createOwner, createServiceAccountWithProject } from '../shared/db/users';
import * as utils from '../shared/utils';

mockInstance(MessageEventBus);
mockInstance(Telemetry);
mockInstance(LicenseState).isSharingLicensed.mockReturnValue(true);

/** A caller of each kind, with the same global role. */
const callers = [
	['person', async () => await createMember()],
	['service account', async () => await createServiceAccountWithProject(GLOBAL_MEMBER_ROLE)],
] as const;

const payload = (projectId: string) => ({
	name: 'GitHub',
	type: 'githubApi',
	data: { accessToken: 'abcdefghijklmnopqrstuvwxyz', user: 'test', server: 'testServer' },
	projectId,
});

describe('Credentials with a service account as the caller', () => {
	let credentialsService: CredentialsService;
	let enterpriseCredentialsService: EnterpriseCredentialsService;
	let credentialsFinderService: CredentialsFinderService;
	let sharedCredentialsRepository: SharedCredentialsRepository;
	let project: Project;

	beforeAll(async () => {
		await testDb.init();
		await utils.initCredentialsTypes();
		credentialsService = Container.get(CredentialsService);
		enterpriseCredentialsService = Container.get(EnterpriseCredentialsService);
		credentialsFinderService = Container.get(CredentialsFinderService);
		sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedCredentials',
			'CredentialsEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
		project = await createTeamProject('Team', await createOwner());
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function join(caller: User, role: ProjectRole, target = project) {
		await linkUserToProject(caller, target, role);
	}

	async function owningProjectId(credentialId: string) {
		const owner = await sharedCredentialsRepository.findOneByOrFail({
			credentialsId: credentialId,
			role: 'credential:owner',
		});
		return owner.projectId;
	}

	it.each(callers)(
		'lets a %s with project:editor create, update and delete a credential',
		async (_kind, createCaller) => {
			const caller = await createCaller();
			await join(caller, 'project:editor');

			const created = await credentialsService.createUnmanagedCredential(
				payload(project.id),
				caller,
			);
			expect(await owningProjectId(created.id)).toBe(project.id);

			const found = await credentialsFinderService.findCredentialForUser(created.id, caller, [
				'credential:update',
			]);
			expect(found?.id).toBe(created.id);
			const updated = await credentialsService.update(
				created.id,
				{ name: 'Renamed' } as CredentialsEntity,
				{ kind: 'user', user: caller },
			);
			expect(updated?.name).toBe('Renamed');

			expect(await credentialsService.delete(caller, created.id)).toBe(true);
		},
	);

	it.each(callers)(
		'does not let a %s with project:viewer update or delete a credential',
		async (_kind, createCaller) => {
			const owner = await createOwner();
			const caller = await createCaller();
			await join(caller, 'project:viewer');
			const created = await credentialsService.createUnmanagedCredential(
				payload(project.id),
				owner,
			);

			expect(
				await credentialsFinderService.findCredentialForUser(created.id, caller, [
					'credential:update',
				]),
			).toBeNull();
			expect(await credentialsService.delete(caller, created.id)).toBe(false);
		},
	);

	it.each(callers)(
		'lets a %s with project:admin share a credential with a person and move it to another project',
		async (_kind, createCaller) => {
			const caller = await createCaller();
			const sharee = await getPersonalProject(await createMember());
			const destination = await createTeamProject('Destination', await createOwner());
			await join(caller, 'project:admin');
			await join(caller, 'project:admin', destination);
			const created = await credentialsService.createUnmanagedCredential(
				payload(project.id),
				caller,
			);

			await enterpriseCredentialsService.shareWithProjects(caller, created.id, [sharee.id]);
			const sharedWith = await sharedCredentialsRepository.findBy({
				credentialsId: created.id,
				role: 'credential:user',
			});
			expect(sharedWith.map(({ projectId }) => projectId)).toEqual([sharee.id]);

			await enterpriseCredentialsService.transferOne(caller, created.id, destination.id);
			expect(await owningProjectId(created.id)).toBe(destination.id);
		},
	);

	it('lets a person share a credential with a service account, which can then use it', async () => {
		const person = await createMember();
		const serviceAccount = await createServiceAccountWithProject(GLOBAL_MEMBER_ROLE);
		const created = await credentialsService.createUnmanagedCredential(
			payload((await getPersonalProject(person)).id),
			person,
		);

		await enterpriseCredentialsService.shareWithProjects(person, created.id, [
			(await getPersonalProject(serviceAccount)).id,
		]);

		const found = await credentialsFinderService.findCredentialForUser(created.id, serviceAccount, [
			'credential:read',
		]);
		expect(found?.id).toBe(created.id);
	});
});
