// Env feature flag deliberately unset: the module is licensed but must not
// register any routes while N8N_ENV_FEAT_WORKFLOW_REVIEWS is off.
delete process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;

import { createWorkflow, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';

import { createOwner } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let ownerProject: Project;
let ownerAgent: SuperAgentTest;

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'WorkflowHistory', 'WorkflowEntity', 'Project', 'User']);
	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	ownerAgent = testServer.authAgentFor(owner);
});

describe('POST /workflow-review-requests (env flag off)', () => {
	test('is unreachable (404) even though the license is present', async () => {
		expect(ownerProject).toBeDefined();
		const workflow = await createWorkflow({}, owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-1' });

		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: workflow.id, workflowVersionId: 'version-1' }],
			})
			.expect(404);
	});
});
