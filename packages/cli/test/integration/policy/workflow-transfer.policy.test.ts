/**
 * Pins the `workflowTransfer` and `credentialTransfer` host wiring through the real request
 * path. A move does not refuse: the destination's publish, run and decrypt checks restrict
 * the content after it lands. A delete with a transferee moves without unpublishing, so it
 * still refuses.
 */
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	getWorkflowSharing,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, UserRepository } from '@n8n/db';
import type {
	CredentialTransferContext,
	PolicyCheckResult,
	PolicyViolation,
	RegisteredPolicyCheck,
	WorkflowTransferContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { getCredentialSharings, saveCredential } from '../shared/db/credentials';
import { createFolder } from '../shared/db/folders';
import { createMember, createMemberWithApiKey, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'test-target-project-deny';
const VIOLATION_KIND = 'test-target-project-denied';

const deniedMessage = (projectId: string) => `Transfers into project ${projectId} are blocked`;

/**
 * The decorator registers the check once per process, so it can't be swapped per test.
 * Each test instead names the project it wants denied — which is also what keeps the check
 * from denying the transfers the other tests need to succeed.
 */
const deniedTargetProjectIds = new Set<string>();

@PolicyCheck()
class TargetProjectDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowTransfer({
		targetProjectId,
	}: WorkflowTransferContext): Promise<PolicyCheckResult> {
		return { violations: this.violationsFor(targetProjectId) };
	}

	async onCredentialTransfer({
		targetProjectId,
	}: CredentialTransferContext): Promise<PolicyCheckResult> {
		return { violations: this.violationsFor(targetProjectId) };
	}

	private violationsFor(targetProjectId: string): PolicyViolation[] {
		if (!deniedTargetProjectIds.has(targetProjectId)) return [];

		return [
			{
				kind: VIOLATION_KIND,
				checkId: this.id,
				message: deniedMessage(targetProjectId),
				subject: targetProjectId,
				subjectType: 'project',
				scope: 'project',
			},
		];
	}
}

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'publicApi', 'folder', 'credentials', 'project', 'users'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions', 'feat:folders'],
	modules: ['policy-infrastructure'],
});

let member: User;
let authMemberAgent: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;
let publicApiMemberAgent: SuperAgentTest;
let sourceProject: Project;
let targetProject: Project;

beforeAll(async () => {
	// Without this the "allowed" cases below would still pass with the check never registered,
	// which is exactly the silent allow-all this suite exists to catch.
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(TargetProjectDenyCheck);

	member = await createMemberWithApiKey();
	authMemberAgent = testServer.authAgentFor(member);
	authOwnerAgent = testServer.authAgentFor(await createOwner());
	publicApiMemberAgent = testServer.publicApiAgentFor(member);

	await utils.initNodeTypes();
});

beforeEach(async () => {
	deniedTargetProjectIds.clear();
	activeWorkflowManager.add.mockReset();
	activeWorkflowManager.remove.mockReset();

	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'Folder',
		'CredentialsEntity',
		'SharedCredentials',
	]);

	// The member is admin of both, so `workflow:move` and `workflow:create` are never the
	// reason a transfer fails here.
	sourceProject = await createTeamProject('Source project', member);
	targetProject = await createTeamProject('Target project', member);
});

const expectOwnedBy = async (workflow: IWorkflowBase, project: Project) => {
	const sharings = await getWorkflowSharing(workflow);

	expect(sharings).toHaveLength(1);
	expect(sharings[0]).toMatchObject({
		projectId: project.id,
		workflowId: workflow.id,
		role: 'workflow:owner',
	});
};

describe('PUT /workflows/:workflowId/transfer', () => {
	test('moves the workflow although a transfer check objects', async () => {
		const workflow = await createWorkflow({}, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		await expectOwnedBy(workflow, targetProject);
	});
});

describe('PUT /api/v1/workflows/:id/transfer', () => {
	test('moves the workflow although a transfer check objects', async () => {
		const workflow = await createWorkflow({}, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		await publicApiMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(204);

		await expectOwnedBy(workflow, targetProject);
	});
});

describe('PUT /projects/:projectId/folders/:folderId/transfer', () => {
	test('moves the folder although a transfer check objects', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const workflow = await createWorkflow({ parentFolder: folder }, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		await expectOwnedBy(workflow, targetProject);
	});
});

describe('PUT /credentials/:credentialId/transfer', () => {
	test('moves the credential although a transfer check objects', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});
		deniedTargetProjectIds.add(targetProject.id);

		await authMemberAgent
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const sharings = await getCredentialSharings(credential);
		expect(sharings).toHaveLength(1);
		expect(sharings[0]).toMatchObject({ projectId: targetProject.id, role: 'credential:owner' });
	});
});

describe('DELETE /projects/:projectId?transferId', () => {
	test('blocks the deletion and moves nothing when the target project is denied', async () => {
		const workflow = await createWorkflow({}, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.delete(`/projects/${sourceProject.id}`)
			.query({ transferId: targetProject.id })
			.expect(403);

		expect(response.body).toMatchObject({
			meta: { violations: [{ kind: VIOLATION_KIND, checkId: CHECK_ID }] },
		});

		await expectOwnedBy(workflow, sourceProject);
		await expect(
			Container.get(ProjectRepository).findOneByOrFail({ id: sourceProject.id }),
		).resolves.toBeDefined();
	});

	test('blocks the deletion when only a credential is denied', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});
		deniedTargetProjectIds.add(targetProject.id);

		await authMemberAgent
			.delete(`/projects/${sourceProject.id}`)
			.query({ transferId: targetProject.id })
			.expect(403);

		const sharings = await getCredentialSharings(credential);
		expect(sharings).toHaveLength(1);
		expect(sharings[0]).toMatchObject({ projectId: sourceProject.id });
	});

	test('deletes and transfers as usual when no check objects', async () => {
		const workflow = await createWorkflow({}, sourceProject);

		await authMemberAgent
			.delete(`/projects/${sourceProject.id}`)
			.query({ transferId: targetProject.id })
			.expect(200);

		await expectOwnedBy(workflow, targetProject);
		await expect(
			Container.get(ProjectRepository).findOneBy({ id: sourceProject.id }),
		).resolves.toBeNull();
	});
});

describe('DELETE /users/:id?transferId', () => {
	test('blocks the deletion and moves nothing when the transferee project is denied', async () => {
		const memberToDelete = await createMember();
		const personalProject = await getPersonalProject(memberToDelete);
		const workflow = await createWorkflow({}, memberToDelete);
		deniedTargetProjectIds.add(targetProject.id);

		const response = await authOwnerAgent
			.delete(`/users/${memberToDelete.id}`)
			.query({ transferId: targetProject.id })
			.expect(403);

		expect(response.body).toMatchObject({
			meta: { violations: [{ kind: VIOLATION_KIND, checkId: CHECK_ID }] },
		});

		await expectOwnedBy(workflow, personalProject);
		await expect(
			Container.get(UserRepository).findOneByOrFail({ id: memberToDelete.id }),
		).resolves.toBeDefined();
	});

	test('blocks the deletion when only a credential is denied', async () => {
		const memberToDelete = await createMember();
		const personalProject = await getPersonalProject(memberToDelete);
		const credential = await saveCredential(randomCredentialPayload(), {
			user: memberToDelete,
			role: 'credential:owner',
		});
		deniedTargetProjectIds.add(targetProject.id);

		await authOwnerAgent
			.delete(`/users/${memberToDelete.id}`)
			.query({ transferId: targetProject.id })
			.expect(403);

		const sharings = await getCredentialSharings(credential);
		expect(sharings).toHaveLength(1);
		expect(sharings[0]).toMatchObject({ projectId: personalProject.id });
	});

	test('deletes and transfers as usual when no check objects', async () => {
		const memberToDelete = await createMember();
		const workflow = await createWorkflow({}, memberToDelete);

		await authOwnerAgent
			.delete(`/users/${memberToDelete.id}`)
			.query({ transferId: targetProject.id })
			.expect(200);

		await expectOwnedBy(workflow, targetProject);
		await expect(
			Container.get(UserRepository).findOneBy({ id: memberToDelete.id }),
		).resolves.toBeNull();
	});
});
