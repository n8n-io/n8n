import { Reset } from '@/commands/ldap/reset';
import { Config } from '@oclif/core';

import * as testDb from '../../shared/testDb';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { mockInstance } from '../../../shared/mocking';
import { InternalHooks } from '@/InternalHooks';
import { createLdapUser, createMember, getUserById } from '../../shared/db/users';
import { createWorkflow } from '../../shared/db/workflows';
import { randomCredentialPayload } from '../../shared/random';
import { saveCredential } from '../../shared/db/credentials';
import Container from 'typedi';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { EntityNotFoundError } from '@n8n/typeorm';
import { Push } from '@/push';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { createTeamProject, findProject, getPersonalProject } from '../../shared/db/projects';
import { WaitTracker } from '@/WaitTracker';
import { getLdapSynchronizations, saveLdapSynchronization } from '@/Ldap/helpers';
import { createLdapConfig } from '../../shared/ldap';
import { LdapService } from '@/Ldap/ldap.service';
import { v4 as uuid } from 'uuid';

const oclifConfig = new Config({ root: __dirname });

async function resetLDAP(argv: string[]) {
	const cmd = new Reset(argv, oclifConfig);
	try {
		await cmd.init();
	} catch (error) {
		console.error(error);
		throw error;
	}
	await cmd.run();
}

beforeAll(async () => {
	mockInstance(Push);
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	// This needs to be mocked, otherwise the time setInterval would prevent jest
	// from exiting properly.
	mockInstance(WaitTracker);
	await testDb.init();
	await oclifConfig.load();
});

afterAll(async () => {
	await testDb.terminate();
});

test('fails if neither `--userId` nor `--projectId` nor `--deleteWorkflowsAndCredentials` is passed', async () => {
	await expect(resetLDAP([])).rejects.toThrowError(
		'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.',
	);
});

test.each([
	[`--userId=${uuid()}`, `--projectId=${uuid()}`, '--deleteWorkflowsAndCredentials'],

	[`--userId=${uuid()}`, `--projectId=${uuid()}`],
	[`--userId=${uuid()}`, '--deleteWorkflowsAndCredentials'],

	['--deleteWorkflowsAndCredentials', `--projectId=${uuid()}`],
])(
	'fails if more than one of `--userId`, `--projectId`, `--deleteWorkflowsAndCredentials` are passed',
	async (...argv) => {
		await expect(resetLDAP(argv)).rejects.toThrowError(
			'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.',
		);
	},
);

describe('--deleteWorkflowsAndCredentials', () => {
	test('deletes personal projects, workflows and credentials owned by LDAP managed users', async () => {
		//
		// ARRANGE
		//
		const member = await createLdapUser({ role: 'global:member' }, uuid());
		const memberProject = await getPersonalProject(member);
		const workflow = await createWorkflow({}, member);
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const normalMember = await createMember();
		const workflow2 = await createWorkflow({}, normalMember);
		const credential2 = await saveCredential(randomCredentialPayload(), {
			user: normalMember,
			role: 'credential:owner',
		});

		//
		// ACT
		//
		await resetLDAP(['--deleteWorkflowsAndCredentials']);

		//
		// ASSERT
		//
		// LDAP user is deleted
		await expect(getUserById(member.id)).rejects.toThrowError(EntityNotFoundError);
		await expect(findProject(memberProject.id)).rejects.toThrowError(EntityNotFoundError);
		await expect(
			Container.get(WorkflowRepository).findOneBy({ id: workflow.id }),
		).resolves.toBeNull();
		await expect(
			Container.get(CredentialsRepository).findOneBy({ id: credential.id }),
		).resolves.toBeNull();

		// Non LDAP user is not deleted
		await expect(getUserById(normalMember.id)).resolves.not.toThrowError();
		await expect(
			Container.get(WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			Container.get(CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});

	test('deletes the LDAP sync history', async () => {
		//
		// ARRANGE
		//
		await saveLdapSynchronization({
			created: 1,
			disabled: 1,
			scanned: 1,
			updated: 1,
			endedAt: new Date(),
			startedAt: new Date(),
			error: '',
			runMode: 'dry',
			status: 'success',
		});

		//
		// ACT
		//
		await resetLDAP(['--deleteWorkflowsAndCredentials']);

		//
		// ASSERT
		//
		await expect(getLdapSynchronizations(0, 10)).resolves.toHaveLength(0);
	});

	test('resets LDAP settings', async () => {
		//
		// ARRANGE
		//
		await createLdapConfig();
		await expect(Container.get(LdapService).loadConfig()).resolves.toMatchObject({
			loginEnabled: true,
		});

		//
		// ACT
		//
		await resetLDAP(['--deleteWorkflowsAndCredentials']);

		//
		// ASSERT
		//
		await expect(Container.get(LdapService).loadConfig()).resolves.toMatchObject({
			loginEnabled: false,
		});
	});
});

describe('--userId', () => {
	test('fails if the user does not exist', async () => {
		const userId = uuid();
		await expect(resetLDAP([`--userId=${userId}`])).rejects.toThrowError(
			`Could not find the user with the ID ${userId} or their personalProject.`,
		);
	});

	test('fails if the user to migrate to is also an LDAP user', async () => {
		//
		// ARRANGE
		//
		const member = await createLdapUser({ role: 'global:member' }, uuid());

		await expect(resetLDAP([`--userId=${member.id}`])).rejects.toThrowError(
			`Can't migrate workflows and credentials to the user with the ID ${member.id}. That user was created via LDAP and will be deleted as well.`,
		);
	});

	test("transfers all workflows and credentials to the user's personal project", async () => {
		//
		// ARRANGE
		//
		const member = await createLdapUser({ role: 'global:member' }, uuid());
		const memberProject = await getPersonalProject(member);
		const workflow = await createWorkflow({}, member);
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const normalMember = await createMember();
		const normalMemberProject = await getPersonalProject(normalMember);
		const workflow2 = await createWorkflow({}, normalMember);
		const credential2 = await saveCredential(randomCredentialPayload(), {
			user: normalMember,
			role: 'credential:owner',
		});

		//
		// ACT
		//
		await resetLDAP([`--userId=${normalMember.id}`]);

		//
		// ASSERT
		//
		// LDAP user is deleted
		await expect(getUserById(member.id)).rejects.toThrowError(EntityNotFoundError);
		await expect(findProject(memberProject.id)).rejects.toThrowError(EntityNotFoundError);

		// Their workflow and credential have been migrated to the normal user.
		await expect(
			Container.get(SharedWorkflowRepository).findOneBy({
				workflowId: workflow.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();
		await expect(
			Container.get(SharedCredentialsRepository).findOneBy({
				credentialsId: credential.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();

		// Non LDAP user is not deleted
		await expect(getUserById(normalMember.id)).resolves.not.toThrowError();
		await expect(
			Container.get(WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			Container.get(CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});
});

describe('--projectId', () => {
	test('fails if the project does not exist', async () => {
		const projectId = uuid();
		await expect(resetLDAP([`--projectId=${projectId}`])).rejects.toThrowError(
			`Could not find the project with the ID ${projectId}.`,
		);
	});

	test('fails if the user to migrate to is also an LDAP user', async () => {
		//
		// ARRANGE
		//
		const member = await createLdapUser({ role: 'global:member' }, uuid());
		const memberProject = await getPersonalProject(member);

		await expect(resetLDAP([`--projectId=${memberProject.id}`])).rejects.toThrowError(
			`Can't migrate workflows and credentials to the project with the ID ${memberProject.id}. That project is a personal project belonging to a user that was created via LDAP and will be deleted as well.`,
		);
	});

	test('transfers all workflows and credentials to a personal project', async () => {
		//
		// ARRANGE
		//
		const member = await createLdapUser({ role: 'global:member' }, uuid());
		const memberProject = await getPersonalProject(member);
		const workflow = await createWorkflow({}, member);
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const normalMember = await createMember();
		const normalMemberProject = await getPersonalProject(normalMember);
		const workflow2 = await createWorkflow({}, normalMember);
		const credential2 = await saveCredential(randomCredentialPayload(), {
			user: normalMember,
			role: 'credential:owner',
		});

		//
		// ACT
		//
		await resetLDAP([`--projectId=${normalMemberProject.id}`]);

		//
		// ASSERT
		//
		// LDAP user is deleted
		await expect(getUserById(member.id)).rejects.toThrowError(EntityNotFoundError);
		await expect(findProject(memberProject.id)).rejects.toThrowError(EntityNotFoundError);

		// Their workflow and credential have been migrated to the normal user.
		await expect(
			Container.get(SharedWorkflowRepository).findOneBy({
				workflowId: workflow.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();
		await expect(
			Container.get(SharedCredentialsRepository).findOneBy({
				credentialsId: credential.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();

		// Non LDAP user is not deleted
		await expect(getUserById(normalMember.id)).resolves.not.toThrowError();
		await expect(
			Container.get(WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			Container.get(CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});

	test('transfers all workflows and credentials to a team project', async () => {
		//
		// ARRANGE
		//
		const member = await createLdapUser({ role: 'global:member' }, uuid());
		const memberProject = await getPersonalProject(member);
		const workflow = await createWorkflow({}, member);
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const normalMember = await createMember();
		const workflow2 = await createWorkflow({}, normalMember);
		const credential2 = await saveCredential(randomCredentialPayload(), {
			user: normalMember,
			role: 'credential:owner',
		});

		const teamProject = await createTeamProject();

		//
		// ACT
		//
		await resetLDAP([`--projectId=${teamProject.id}`]);

		//
		// ASSERT
		//
		// LDAP user is deleted
		await expect(getUserById(member.id)).rejects.toThrowError(EntityNotFoundError);
		await expect(findProject(memberProject.id)).rejects.toThrowError(EntityNotFoundError);

		// Their workflow and credential have been migrated to the team project.
		await expect(
			Container.get(SharedWorkflowRepository).findOneBy({
				workflowId: workflow.id,
				projectId: teamProject.id,
			}),
		).resolves.not.toBeNull();
		await expect(
			Container.get(SharedCredentialsRepository).findOneBy({
				credentialsId: credential.id,
				projectId: teamProject.id,
			}),
		).resolves.not.toBeNull();

		// Non LDAP user is not deleted
		await expect(getUserById(normalMember.id)).resolves.not.toThrowError();
		await expect(
			Container.get(WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			Container.get(CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});
});
