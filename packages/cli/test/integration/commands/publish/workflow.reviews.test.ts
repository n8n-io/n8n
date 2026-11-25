/**
 * The tests share one command: its `init()` runs once in `beforeAll`, because module init
 * registers an inbox source and a second init throws. Telemetry is mocked there too, because
 * `setupTestCommand` mocks it only in `beforeEach`.
 */
import { randomUUID } from 'node:crypto';

import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflowHistory,
	createWorkflowWithTriggerAndHistory,
	getPersonalProject,
	getWorkflowById,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { LICENSE_FEATURES, type BooleanLicenseFeature } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeType } from 'n8n-workflow';

import { PublishWorkflowCommand } from '@/commands/publish/workflow';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	REVIEW_TABLES,
	seedReview,
} from '@/modules/workflow-reviews.ee/__tests__/support/workflow-review-test-data';
import { NodeTypes } from '@/node-types';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createOwner } from '../../shared/db/users';

beforeAll(async () => {
	await testModules.loadModules(['workflow-reviews']);
});

mockInstance(LoadNodesAndCredentials);
mockInstance(ExternalHooks);
const nodeTypes = mockInstance(NodeTypes);
mockInstance(License, {
	isLicensed: (feature: BooleanLicenseFeature) => feature === LICENSE_FEATURES.WORKFLOW_REVIEWS,
});
setupTestCommand(PublishWorkflowCommand);

let command: PublishWorkflowCommand;

beforeAll(async () => {
	mockInstance(TelemetryEventRelay);
	command = new PublishWorkflowCommand();
	await command.init();
});

const publish = async (workflowId: string, versionId?: string) => {
	// @ts-expect-error Read-only property, normally set by the command runner
	command.flags = { id: workflowId, versionId };
	await command.run();
};

let owner: User;
let ownerProject: Project;
let teamProject: Project;
let policyService: WorkflowReviewPolicyService;

beforeEach(async () => {
	nodeTypes.getByNameAndVersion.mockReturnValue({
		description: { properties: [] },
		trigger: async () => ({}),
	} as unknown as INodeType);

	await testDb.truncate([...REVIEW_TABLES]);
	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	teamProject = await createTeamProject('Reviews Project', owner);
	policyService = Container.get(WorkflowReviewPolicyService);
	await policyService.update({ enabled: true, alwaysRequired: false });
});

afterAll(async () => {
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.update({ enabled: false, alwaysRequired: false });
});

test('publish:workflow refuses a workflow with an open review', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);
	await seedReview({
		projectId: ownerProject.id,
		workflowId: workflow.id,
		versionId: workflow.versionId,
		author: owner,
	});

	await expect(publish(workflow.id)).rejects.toThrow(
		"Workflow can't be published while its review is open.",
	);
	expect(await getWorkflowById(workflow.id)).toMatchObject({ activeVersionId: null });
});

describe('when reviews are always required', () => {
	beforeEach(async () => {
		await policyService.update({ alwaysRequired: true });
	});

	test('publish:workflow refuses a team project version without an approved review', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, teamProject);

		await expect(publish(workflow.id)).rejects.toThrow(
			"Workflow can't be published because this version has no approved review.",
		);
		expect(await getWorkflowById(workflow.id)).toMatchObject({ activeVersionId: null });
	});

	test('publish:workflow keeps the live version when it refuses a new version', async () => {
		const workflow = await createActiveWorkflow({}, teamProject);
		const newVersionId = randomUUID();
		await createWorkflowHistory(workflow, teamProject, undefined, { versionId: newVersionId });

		await expect(publish(workflow.id, newVersionId)).rejects.toThrow(
			"Workflow can't be published because this version has no approved review.",
		);
		expect(await getWorkflowById(workflow.id)).toMatchObject({
			activeVersionId: workflow.versionId,
		});
	});

	test('publish:workflow publishes a team project version with an approved review', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, teamProject);
		await seedReview({
			projectId: teamProject.id,
			workflowId: workflow.id,
			versionId: workflow.versionId,
			author: owner,
			state: 'closed',
			decision: 'approved',
		});

		await publish(workflow.id);

		expect(await getWorkflowById(workflow.id)).toMatchObject({
			activeVersionId: workflow.versionId,
		});
	});
});
