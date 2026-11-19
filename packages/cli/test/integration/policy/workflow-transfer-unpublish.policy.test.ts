/**
 * Drives the real ActiveWorkflowManager, so the republish after a move runs the real
 * `workflowPublish` host point against the project the workflow moved into.
 */
import {
	createActiveWorkflow,
	createTeamProject,
	getWorkflowSharing,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { WorkflowPublishHistoryRepository, WorkflowRepository } from '@n8n/db';
import type {
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { Telemetry } from '@/telemetry';

import { createFolder } from '../shared/db/folders';
import { createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'test-publish-deny';

/** `${projectId}:${workflowId}` pairs whose publish the check refuses. */
const refusedPublishes = new Set<string>();

@PolicyCheck()
class PublishDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowPublish({
		workflow,
		projectId,
	}: WorkflowPublishContext): Promise<PolicyCheckResult> {
		if (!refusedPublishes.has(`${projectId}:${workflow.id}`)) return { violations: [] };

		return {
			violations: [
				{
					kind: 'test-publish-denied',
					checkId: this.id,
					message: `Publishing is blocked in project ${projectId}`,
					scope: 'project',
					projectId: projectId ?? undefined,
				},
			],
		};
	}
}

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'folder'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions', 'feat:folders'],
	modules: ['policy-infrastructure'],
});

let member: User;
let authMemberAgent: SuperAgentTest;
let sourceProject: Project;
let targetProject: Project;

const refusePublish = (projectId: string, workflowId: string) =>
	refusedPublishes.add(`${projectId}:${workflowId}`);

const activeVersionIdOf = async (workflowId: string) =>
	(await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowId })).activeVersionId;

beforeAll(async () => {
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(PublishDenyCheck);

	member = await createMember();
	authMemberAgent = testServer.authAgentFor(member);

	await utils.initNodeTypes();
});

beforeEach(async () => {
	refusedPublishes.clear();

	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'Folder',
	]);

	sourceProject = await createTeamProject('Source project', member);
	targetProject = await createTeamProject('Target project', member);
});

afterEach(async () => {
	// Anything the real manager registers would otherwise stay live for the rest of the worker.
	await Container.get(ActiveWorkflowManager).removeAll();
});

describe('PUT /workflows/:workflowId/transfer', () => {
	test('moves a published workflow and unpublishes it when the destination refuses the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })],
		});
		expect(await getWorkflowSharing(workflow)).toEqual([
			expect.objectContaining({ projectId: targetProject.id, role: 'workflow:owner' }),
		]);
		expect(await activeVersionIdOf(workflow.id)).toBeNull();
		await expect(
			Container.get(WorkflowPublishHistoryRepository).findOneBy({
				workflowId: workflow.id,
				event: 'deactivated',
			}),
		).resolves.not.toBeNull();
	});

	test('keeps the workflow published when the destination allows it', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(sourceProject.id, workflow.id);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body).toEqual({});
		expect(await activeVersionIdOf(workflow.id)).toBe(workflow.versionId);
	});
});

describe('PUT /projects/:projectId/folders/:folderId/transfer', () => {
	test('unpublishes only the refused workflows and republishes the rest', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const refused = await createActiveWorkflow(
			{ name: 'Refused', parentFolder: folder },
			sourceProject,
		);
		const allowed = await createActiveWorkflow(
			{ name: 'Allowed', parentFolder: folder },
			sourceProject,
		);
		refusePublish(targetProject.id, refused.id);

		const response = await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		expect(response.body.data).toEqual({
			unpublishedWorkflows: [
				{
					id: refused.id,
					name: 'Refused',
					unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })],
				},
			],
		});
		expect(await activeVersionIdOf(refused.id)).toBeNull();
		expect(await activeVersionIdOf(allowed.id)).toBe(allowed.versionId);
	});
});
