import { Logger } from '@n8n/backend-common';
import {
	createWorkflowWithTriggerAndHistory,
	getPersonalProject,
	getWorkflowById,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES, type BooleanLicenseFeature } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { INodeType } from 'n8n-workflow';

import '@/zod-alias-support';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	REVIEW_TABLES,
	seedReview,
} from '@/modules/workflow-reviews.ee/__tests__/support/workflow-review-test-data';
import { NodeTypes } from '@/node-types';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createOwner } from '../shared/db/users';

const FIXTURE = './test/integration/commands/import-workflows/separate/001-activeWorkflow.json';
const FIXTURE_WORKFLOW_ID = '998';

beforeAll(async () => {
	await testModules.loadModules(['workflow-reviews']);
});

mockInstance(LoadNodesAndCredentials);
mockInstance(ActiveWorkflowManager);
mockInstance(NodeTypes).getByNameAndVersion.mockReturnValue({
	description: { properties: [] },
	webhook: vi.fn(),
} as unknown as INodeType);
mockInstance(License, {
	isLicensed: (feature: BooleanLicenseFeature) => feature === LICENSE_FEATURES.WORKFLOW_REVIEWS,
});
const command = setupTestCommand(ImportWorkflowsCommand);

const globalConfig = Container.get(GlobalConfig);
const originalMode = globalConfig.executions.mode;

beforeAll(() => {
	globalConfig.executions.mode = 'queue';
});

afterAll(async () => {
	globalConfig.executions.mode = originalMode;
	await testDb.truncate([...REVIEW_TABLES]);
});

test('import:workflow leaves a workflow with an open review unpublished and reports why', async () => {
	// Webhook conflict detection needs the variables cache, which this test does not set up.
	vi.spyOn(
		Container.get(WorkflowService) as unknown as {
			_findConflictingWebhooks: () => Promise<unknown[]>;
		},
		'_findConflictingWebhooks',
	).mockResolvedValue([]);
	const owner = await createOwner();
	await Container.get(WorkflowReviewPolicyService).update({ enabled: true });
	const workflow = await createWorkflowWithTriggerAndHistory({ id: FIXTURE_WORKFLOW_ID }, owner);
	await seedReview({
		projectId: (await getPersonalProject(owner)).id,
		workflowId: workflow.id,
		versionId: workflow.versionId,
		author: owner,
	});
	const error = vi.spyOn(Container.get(Logger), 'error');

	await command.run([`--input=${FIXTURE}`, '--activeState=fromJson']);

	expect(await getWorkflowById(FIXTURE_WORKFLOW_ID)).toMatchObject({ activeVersionId: null });
	expect(error).toHaveBeenCalledWith(
		expect.stringContaining("Workflow can't be published while its review is open."),
		expect.anything(),
	);
});
