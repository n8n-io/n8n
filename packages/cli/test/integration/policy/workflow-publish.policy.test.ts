/**
 * Pins the `workflowPublish` host wiring for both call sites through the real code path.
 *
 * The unit tests for each site mock `PolicyEnforcementService`, so they prove the service
 * method is called but not that a registered check runs — a removed call site would look
 * identical to an allow-all policy. The two sites need separate coverage because startup
 * reactivation is what makes "a policy changed while this workflow was active" converge on
 * restart, and nothing about the interactive path exercises it.
 */
import {
	createWorkflowHistory,
	createWorkflowWithHistory,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowRepository, type Project, type User } from '@n8n/db';
import type {
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { INode, INodeTypeData } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'test-workflow-publish-deny';
const VIOLATION_KIND = 'test-workflow-publish-denied';

/** The marker the check refuses. Named, not typed, so it stays a registrable trigger. */
const BLOCKED_NODE_NAME = 'Blocked Node';

const deniedMessage = (nodeName: string) => `Publishing the node "${nodeName}" is blocked`;

/** What the host passed the check, so a test can assert the nodes and scope it resolved. */
const seenContexts: WorkflowPublishContext[] = [];

/**
 * The decorator registers the check once per process and `PolicyCheckMetadata` has no
 * unregister, so the check is live for every request in this file. Keying off a marker node
 * — rather than denying everything — is what lets the allowed cases below still publish.
 */
@PolicyCheck()
class BlockedNodePublishCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowPublish(context: WorkflowPublishContext): Promise<PolicyCheckResult> {
		seenContexts.push(context);

		const blocked = context.workflow.nodes.find((node) => node.name === BLOCKED_NODE_NAME);

		if (!blocked) return { violations: [] };

		return {
			violations: [
				{
					kind: VIOLATION_KIND,
					checkId: this.id,
					message: deniedMessage(blocked.name),
					subject: blocked.type,
					subjectType: 'nodeType',
					scope: 'project',
				},
			],
		};
	}
}

// `endpointGroups` is load-bearing beyond the routes it mounts: `setupTestServer` only
// reaches `ModuleRegistry.initModules` when it is set, and that init registers the
// enforcement implementation. Without it every test here would pass with nothing enforced.
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'activeWorkflows', 'publicApi'],
	modules: ['policy-infrastructure'],
});

let owner: User;
let ownerPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let publicApiAgent: SuperAgentTest;
let activeWorkflowManager: ActiveWorkflowManager;
let workflowRepository: WorkflowRepository;

const scheduleNode = (name: string): INode => ({
	id: uuid(),
	name,
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

beforeAll(async () => {
	// Without this the "allowed" cases below would still pass with the check never
	// registered, which is exactly the silent allow-all this suite exists to catch.
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(BlockedNodePublishCheck);

	// A real trigger type: `ActiveWorkflowManager` is not mocked here, so the allowed cases
	// register for real. The default interval never fires within a test run.
	const nodes: INodeTypeData = {
		'n8n-nodes-base.scheduleTrigger': { type: new ScheduleTrigger(), sourcePath: '' },
	};
	await utils.initNodeTypes(nodes);

	owner = await createOwnerWithApiKey();
	authOwnerAgent = testServer.authAgentFor(owner);
	publicApiAgent = testServer.publicApiAgentFor(owner);

	// Both hosts resolve the project through a deliberately unguarded lookup, so an
	// ownerless workflow would fail with an ownership error dressed as a policy block.
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);

	Container.get(InstanceSettings).markAsLeader();
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	workflowRepository = Container.get(WorkflowRepository);
});

beforeEach(() => {
	seenContexts.length = 0;
});

afterEach(async () => {
	await activeWorkflowManager.removeAll();
	await activeWorkflowManager.clearAllActivationErrors();

	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WebhookEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
	]);
});

const expectUnpublished = async (workflowId: string) => {
	const stored = await workflowRepository.findOneBy({ id: workflowId });

	expect(stored?.activeVersionId).toBeNull();
	expect(activeWorkflowManager.allActiveInMemory()).not.toContain(workflowId);
};

const expectedViolation = {
	kind: VIOLATION_KIND,
	checkId: CHECK_ID,
	message: deniedMessage(BLOCKED_NODE_NAME),
	subject: 'n8n-nodes-base.scheduleTrigger',
	subjectType: 'nodeType',
	scope: 'project',
};

describe('POST /workflows/:workflowId/activate', () => {
	test('blocks publishing with the structured violation and leaves the workflow unpublished', async () => {
		const workflow = await createWorkflowWithHistory(
			{ nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			message: deniedMessage(BLOCKED_NODE_NAME),
			meta: { violations: [expectedViolation] },
		});

		await expectUnpublished(workflow.id);
	});

	test('resolves the workflow project as the scope of the check', async () => {
		const workflow = await createWorkflowWithHistory(
			{ nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);

		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(403);

		expect(seenContexts).toContainEqual(
			expect.objectContaining({ projectId: ownerPersonalProject.id }),
		);
	});

	test('polices the version being published, not the current draft', async () => {
		// The draft carries the marker and a clean older version is the one published. A
		// host reading the workflow entity's nodes instead of the version row would block
		// this — the whole point of snapshotting `versionToActivate`.
		const workflow = await createWorkflowWithHistory(
			{ nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);

		const cleanVersionId = uuid();
		await createWorkflowHistory(workflow, owner, undefined, {
			versionId: cleanVersionId,
			nodes: [scheduleNode('Schedule Trigger')],
		});

		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: cleanVersionId })
			.expect(200);

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBe(cleanVersionId);
	});

	test('enforces the check on a republish of the already-published version', async () => {
		// The policy landed after this workflow went live, so the version is unchanged and
		// only the user's republish reaches the check.
		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);

		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(403);
	});

	test('publishes as usual when no node is denied', async () => {
		const workflow = await createWorkflowWithHistory(
			{ nodes: [scheduleNode('Schedule Trigger')] },
			owner,
		);

		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(200);

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBe(workflow.versionId);
		expect(activeWorkflowManager.allActiveInMemory()).toContain(workflow.id);
	});
});

describe('POST /api/v1/workflows/:workflowId/publish', () => {
	test('blocks publishing with the violation list', async () => {
		const workflow = await createWorkflowWithHistory(
			{ nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);

		const response = await publicApiAgent.post(`/workflows/${workflow.id}/publish`).send({});

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({
			message: deniedMessage(BLOCKED_NODE_NAME),
			violations: [expectedViolation],
		});

		await expectUnpublished(workflow.id);
	});
});

describe('startup reactivation', () => {
	test('leaves a denied workflow in the activation-error state', async () => {
		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);

		await activeWorkflowManager.init();

		// The check ran against the published version's nodes, not an empty stand-in.
		expect(seenContexts).toContainEqual(
			expect.objectContaining({
				workflow: expect.objectContaining({
					id: workflow.id,
					nodes: [expect.objectContaining({ name: BLOCKED_NODE_NAME })],
				}),
			}),
		);

		expect(activeWorkflowManager.allActiveInMemory()).not.toContain(workflow.id);

		// `ActivationErrorsService` stores a string, so the message is all this surface can
		// carry — the structured list stays on the interactive response above.
		const errorResponse = await authOwnerAgent
			.get(`/active-workflows/error/${workflow.id}`)
			.expect(200);
		expect(errorResponse.body.data).toBe(deniedMessage(BLOCKED_NODE_NAME));

		// A workflow with an activation error is not reported as active to the client.
		const activeResponse = await authOwnerAgent.get('/active-workflows').expect(200);
		expect(activeResponse.body.data).not.toContain(workflow.id);

		// Still published in the database: policy blocks the registration, it does not
		// silently unpublish the user's workflow.
		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});

	test('reactivates the other workflows of the same pass', async () => {
		const denied = await createWorkflowWithHistory(
			{ active: true, nodes: [scheduleNode(BLOCKED_NODE_NAME)] },
			owner,
		);
		await setActiveVersion(denied.id, denied.versionId);

		const allowed = await createWorkflowWithHistory(
			{ active: true, nodes: [scheduleNode('Schedule Trigger')] },
			owner,
		);
		await setActiveVersion(allowed.id, allowed.versionId);

		await activeWorkflowManager.init();

		expect(activeWorkflowManager.allActiveInMemory()).toEqual([allowed.id]);
		expect(await activeWorkflowManager.getAllWorkflowActivationErrors()).toMatchObject({
			[denied.id]: deniedMessage(BLOCKED_NODE_NAME),
		});
	});
});
