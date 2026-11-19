/**
 * One command `init()` per file: the workflow-reviews module registers its inbox source once
 * per process, so a second `init()` in the same file would throw.
 */
import {
	createTeamProject,
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

const publish = async (workflowId: string) => {
	// @ts-expect-error Read-only property, normally set by the command runner
	command.flags = { id: workflowId };
	await command.run();
};

const isPublished = async (workflowId: string) =>
	(await getWorkflowById(workflowId))?.activeVersionId !== null;

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
	expect(await isPublished(workflow.id)).toBe(false);
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
		expect(await isPublished(workflow.id)).toBe(false);
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

		expect(await isPublished(workflow.id)).toBe(true);
	});

	test('publish:workflow publishes a personal space workflow without a review', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

		await publish(workflow.id);

		expect(await isPublished(workflow.id)).toBe(true);
	});
});
