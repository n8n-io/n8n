import {
	createWorkflowWithTriggerAndHistory,
	getPersonalProject,
	getWorkflowById,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { LICENSE_FEATURES, type BooleanLicenseFeature } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { INodeType } from 'n8n-workflow';

import { UpdateWorkflowCommand } from '@/commands/update/workflow';
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
mockInstance(NodeTypes).getByNameAndVersion.mockReturnValue({
	description: { properties: [] },
	trigger: async () => ({}),
} as unknown as INodeType);
mockInstance(License, {
	isLicensed: (feature: BooleanLicenseFeature) => feature === LICENSE_FEATURES.WORKFLOW_REVIEWS,
});
const command = setupTestCommand(UpdateWorkflowCommand);

afterAll(async () => {
	await testDb.truncate([...REVIEW_TABLES]);
	await Container.get(WorkflowReviewPolicyService).update({
		enabled: false,
		alwaysRequired: false,
	});
});

test('update:workflow refuses to publish a workflow with an open review', async () => {
	const owner = await createOwner();
	await Container.get(WorkflowReviewPolicyService).update({ enabled: true });
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);
	await seedReview({
		projectId: (await getPersonalProject(owner)).id,
		workflowId: workflow.id,
		versionId: workflow.versionId,
		author: owner,
	});

	await expect(command.run([`--id=${workflow.id}`, '--active=true'])).rejects.toThrow(
		"Workflow can't be published while its review is open.",
	);
	expect(await getWorkflowById(workflow.id)).toMatchObject({ activeVersionId: null });
});
