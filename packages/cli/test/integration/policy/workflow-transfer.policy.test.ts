/**
 * Pins the `workflowTransfer` host wiring through the real request path. Unit tests mock
 * `PolicyEnforcementService`, so they prove the service method is called but not that a
 * registered check actually runs — a removed call site or a new transfer path would look
 * identical to an allow-all policy.
 */
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	getWorkflowSharing,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import type {
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowTransferContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { createMemberWithApiKey } from '../shared/db/users';
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
		if (targetProjectId === null || !deniedTargetProjectIds.has(targetProjectId)) {
			return { violations: [] };
		}

		return {
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: this.id,
					message: deniedMessage(targetProjectId),
					subject: targetProjectId,
					subjectType: 'project',
					scope: 'project',
				},
			],
		};
	}
}

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'publicApi'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions'],
	modules: ['policy-infrastructure'],
});

let member: User;
let authMemberAgent: SuperAgentTest;
let publicApiMemberAgent: SuperAgentTest;
let sourceProject: Project;
let targetProject: Project;

beforeAll(async () => {
	// Without this the "allowed" cases below would still pass with the check never registered,
	// which is exactly the silent allow-all this suite exists to catch.
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(TargetProjectDenyCheck);

	member = await createMemberWithApiKey();
	authMemberAgent = testServer.authAgentFor(member);
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
	test('blocks the transfer with the structured violation when the target project is denied', async () => {
		const workflow = await createWorkflow({}, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			message: deniedMessage(targetProject.id),
			meta: {
				violations: [
					{
						kind: VIOLATION_KIND,
						checkId: CHECK_ID,
						message: deniedMessage(targetProject.id),
						subject: targetProject.id,
						subjectType: 'project',
						scope: 'project',
					},
				],
			},
		});

		await expectOwnedBy(workflow, sourceProject);
	});

	test('validates against the target project, not the source', async () => {
		const workflow = await createWorkflow({}, sourceProject);

		// Only the project the workflow is leaving is denied. Checking the wrong project would
		// block this transfer and defeat the point of the enforcement point.
		deniedTargetProjectIds.add(sourceProject.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		await expectOwnedBy(workflow, targetProject);
	});

	test('leaves the workflow untouched when the transfer is blocked', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(403);

		await expectOwnedBy(workflow, sourceProject);

		// Deactivation happens after the check, so a blocked transfer must not take a live
		// workflow down on its way out.
		expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
		expect(activeWorkflowManager.add).not.toHaveBeenCalled();
	});

	test('transfers as usual when no check objects', async () => {
		const workflow = await createWorkflow({}, sourceProject);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		await expectOwnedBy(workflow, targetProject);
	});
});

describe('PUT /api/v1/workflows/:id/transfer', () => {
	test('blocks the transfer when the target project is denied', async () => {
		const workflow = await createWorkflow({}, sourceProject);
		deniedTargetProjectIds.add(targetProject.id);

		const response = await publicApiMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id });

		expect(response.statusCode).toBe(403);

		// Status and message only: on master `serializePublicApiError` whitelists `meta.issues`,
		// so the violation list stays internal on this surface. IAM-1129 adds `violations` to
		// that whitelist — tighten this to assert the list once that lands.
		expect(response.body).toMatchObject({ message: deniedMessage(targetProject.id) });

		await expectOwnedBy(workflow, sourceProject);
	});
});
