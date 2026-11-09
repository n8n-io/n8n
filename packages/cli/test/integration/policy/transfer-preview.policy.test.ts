import {
	createTeamProject,
	createWorkflow,
	createWorkflowHistory,
	getWorkflowSharing,
	mockInstance,
	randomCredentialPayload,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import type { IWorkflowDb, Project, User } from '@n8n/db';
import type {
	CredentialTransferContext,
	PolicedWorkflow,
	PolicyCheckResult,
	PolicyViolation,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
	WorkflowTransferContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import type { INode } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { getCredentialSharings, saveCredential } from '../shared/db/credentials';
import { createFolder } from '../shared/db/folders';
import { createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'test-type-deny';
const BLOCKED_TYPE = 'n8n-nodes-base.blockedNode';
const OTHER_BLOCKED_TYPE = 'n8n-nodes-base.otherBlockedNode';
const ALLOWED_TYPE = 'n8n-nodes-base.allowedNode';

/** Registered once per process, so each test names the projects it wants denied or broken. */
const denyingProjectIds = new Set<string>();
const failingProjectIds = new Set<string>();

@PolicyCheck()
class TypeDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowTransfer({
		workflow,
		targetProjectId,
	}: WorkflowTransferContext): Promise<PolicyCheckResult> {
		return { violations: this.workflowViolations(workflow, targetProjectId) };
	}

	async onWorkflowPublish({
		workflow,
		projectId,
	}: WorkflowPublishContext): Promise<PolicyCheckResult> {
		return { violations: this.workflowViolations(workflow, projectId) };
	}

	async onCredentialTransfer({
		credential,
		targetProjectId,
	}: CredentialTransferContext): Promise<PolicyCheckResult> {
		return { violations: this.violationsFor([credential.type], 'credentialType', targetProjectId) };
	}

	private workflowViolations(workflow: PolicedWorkflow, projectId: string | null) {
		const types = [...new Set(workflow.nodes.map((node) => node.type))];
		return this.violationsFor(types, 'nodeType', projectId);
	}

	private violationsFor(
		types: string[],
		subjectType: string,
		projectId: string | null,
	): PolicyViolation[] {
		if (projectId !== null && failingProjectIds.has(projectId)) {
			throw new Error('Policy store unavailable');
		}
		if (projectId === null || !denyingProjectIds.has(projectId)) return [];

		return types
			.filter((type) => type !== ALLOWED_TYPE)
			.map((type) => ({
				kind: 'test-type-denied',
				checkId: this.id,
				message: `${type} is blocked`,
				subject: type,
				subjectType,
				scope: 'project',
				projectId,
			}));
	}
}

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'folder', 'credentials'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions', 'feat:folders'],
	modules: ['policy-infrastructure'],
});

let member: User;
let authMemberAgent: SuperAgentTest;
let sourceProject: Project;
let targetProject: Project;

const node = (type: string): INode => ({
	id: randomUUID(),
	name: type,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

/** A draft and a published version with different nodes, as after an unpublished edit. */
const createPublishedWorkflow = async (
	draftTypes: string[],
	publishedTypes: string[],
	attributes: Partial<IWorkflowDb> = {},
) => {
	const workflow = await createWorkflow(
		{ ...attributes, nodes: draftTypes.map(node) },
		sourceProject,
	);
	const publishedVersionId = randomUUID();
	await createWorkflowHistory(workflow, sourceProject, undefined, {
		versionId: publishedVersionId,
		nodes: publishedTypes.map(node),
	});
	await setActiveVersion(workflow.id, publishedVersionId);

	return workflow;
};

beforeAll(async () => {
	// A missing registration would make every empty preview below pass vacuously.
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(TypeDenyCheck);

	member = await createMember();
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	denyingProjectIds.clear();
	failingProjectIds.clear();
	activeWorkflowManager.add.mockReset();
	activeWorkflowManager.remove.mockReset();

	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'Folder',
		'CredentialsEntity',
		'SharedCredentials',
	]);

	sourceProject = await createTeamProject('Source project', member);
	targetProject = await createTeamProject('Target project', member);
});

describe('GET /workflows/:workflowId/transfer-preview', () => {
	test('reports the draft as restricted and the published version as the reason to unpublish', async () => {
		const workflow = await createPublishedWorkflow([BLOCKED_TYPE], [OTHER_BLOCKED_TYPE]);
		denyingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			restricted: [expect.objectContaining({ subject: BLOCKED_TYPE, subjectType: 'nodeType' })],
			unpublishReasons: [expect.objectContaining({ subject: OTHER_BLOCKED_TYPE })],
			checkFailed: false,
		});
	});

	test('reports nothing to unpublish for a workflow that is not published', async () => {
		const workflow = await createWorkflow({ nodes: [node(BLOCKED_TYPE)] }, sourceProject);
		denyingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data.restricted).toHaveLength(1);
		expect(response.body.data.unpublishReasons).toEqual([]);
	});

	test('judges the destination project, not the source', async () => {
		const workflow = await createPublishedWorkflow([BLOCKED_TYPE], [BLOCKED_TYPE]);
		denyingProjectIds.add(sourceProject.id);

		const response = await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			restricted: [],
			unpublishReasons: [],
			checkFailed: false,
		});
	});

	test('changes nothing about the workflow', async () => {
		const workflow = await createPublishedWorkflow([BLOCKED_TYPE], [BLOCKED_TYPE]);
		denyingProjectIds.add(targetProject.id);

		await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		const sharings = await getWorkflowSharing(workflow);
		expect(sharings).toEqual([
			expect.objectContaining({ projectId: sourceProject.id, role: 'workflow:owner' }),
		]);
		expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
		expect(activeWorkflowManager.add).not.toHaveBeenCalled();
	});

	test('flags the preview as incomplete when a check fails', async () => {
		const workflow = await createWorkflow({ nodes: [node(BLOCKED_TYPE)] }, sourceProject);
		failingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({ restricted: [], unpublishReasons: [], checkFailed: true });
	});

	test('returns 404 when the member cannot create workflows in the destination', async () => {
		const workflow = await createWorkflow({}, sourceProject);
		const foreignProject = await createTeamProject('Foreign project');

		await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: foreignProject.id })
			.expect(404);
	});

	test('returns 400 without a destination project', async () => {
		const workflow = await createWorkflow({}, sourceProject);

		await authMemberAgent.get(`/workflows/${workflow.id}/transfer-preview`).expect(400);
	});

	test('returns 400 for the project that already owns the workflow, as the move does', async () => {
		const workflow = await createWorkflow({ nodes: [node(BLOCKED_TYPE)] }, sourceProject);
		denyingProjectIds.add(sourceProject.id);

		const response = await authMemberAgent
			.get(`/workflows/${workflow.id}/transfer-preview`)
			.query({ destinationProjectId: sourceProject.id })
			.expect(400);

		expect(response.body.message).toContain('already owning it');
	});
});

describe('GET /projects/:projectId/folders/:folderId/transfer-preview', () => {
	test('lists each restricted type once and names the workflows to unpublish', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const subFolder = await createFolder(sourceProject, { name: 'Sub', parentFolder: folder });
		await createWorkflow({ nodes: [node(BLOCKED_TYPE)], parentFolder: folder }, sourceProject);
		const published = await createPublishedWorkflow([BLOCKED_TYPE], [OTHER_BLOCKED_TYPE], {
			name: 'Published in sub folder',
			parentFolder: subFolder,
		});
		await createPublishedWorkflow([ALLOWED_TYPE], [ALLOWED_TYPE], { parentFolder: folder });
		denyingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/projects/${sourceProject.id}/folders/${folder.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			restricted: [expect.objectContaining({ subject: BLOCKED_TYPE })],
			workflowsToUnpublish: [{ id: published.id, name: 'Published in sub folder' }],
			checkFailed: false,
		});
	});

	test('ignores workflows outside the folder tree', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		await createWorkflow({ nodes: [node(BLOCKED_TYPE)] }, sourceProject);
		denyingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/projects/${sourceProject.id}/folders/${folder.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			restricted: [],
			workflowsToUnpublish: [],
			checkFailed: false,
		});
	});

	test('flags the preview as incomplete when a check fails', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		await createWorkflow({ nodes: [node(BLOCKED_TYPE)], parentFolder: folder }, sourceProject);
		failingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/projects/${sourceProject.id}/folders/${folder.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			restricted: [],
			workflowsToUnpublish: [],
			checkFailed: true,
		});
	});

	test('returns 400 for the project that already owns the folder, as the move does', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		await createWorkflow({ nodes: [node(BLOCKED_TYPE)], parentFolder: folder }, sourceProject);
		denyingProjectIds.add(sourceProject.id);

		const response = await authMemberAgent
			.get(`/projects/${sourceProject.id}/folders/${folder.id}/transfer-preview`)
			.query({ destinationProjectId: sourceProject.id })
			.expect(400);

		expect(response.body.message).toContain('already owning it');
	});

	test('returns 404 for a folder of another project', async () => {
		const folder = await createFolder(targetProject, { name: 'Elsewhere' });

		await authMemberAgent
			.get(`/projects/${sourceProject.id}/folders/${folder.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(404);
	});

	test('returns 404 when the member cannot create workflows in the destination', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const foreignProject = await createTeamProject('Foreign project');

		await authMemberAgent
			.get(`/projects/${sourceProject.id}/folders/${folder.id}/transfer-preview`)
			.query({ destinationProjectId: foreignProject.id })
			.expect(404);
	});
});

describe('GET /credentials/:credentialId/transfer-preview', () => {
	test('reports the credential type as restricted in the destination', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});
		denyingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/credentials/${credential.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			restricted: [
				expect.objectContaining({ subject: credential.type, subjectType: 'credentialType' }),
			],
			checkFailed: false,
		});

		const sharings = await getCredentialSharings(credential);
		expect(sharings).toEqual([expect.objectContaining({ projectId: sourceProject.id })]);
	});

	test('reports nothing when the destination allows the type', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});

		const response = await authMemberAgent
			.get(`/credentials/${credential.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({ restricted: [], checkFailed: false });
	});

	test('flags the preview as incomplete when a check fails', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});
		failingProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.get(`/credentials/${credential.id}/transfer-preview`)
			.query({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({ restricted: [], checkFailed: true });
	});

	test('returns 400 for the project that already owns the credential, as the move does', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});
		denyingProjectIds.add(sourceProject.id);

		const response = await authMemberAgent
			.get(`/credentials/${credential.id}/transfer-preview`)
			.query({ destinationProjectId: sourceProject.id })
			.expect(400);

		expect(response.body.message).toContain('already owning it');
	});
});
