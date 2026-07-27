// Env feature flag deliberately unset: the module is licensed but must not
// register any routes while N8N_ENV_FEAT_WORKFLOW_REVIEWS is off.
delete process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;

import { testDb } from '@n8n/backend-test-utils';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let ownerAgent: SuperAgentTest;

beforeEach(async () => {
	await testDb.truncate(['ProjectRelation', 'Project', 'User']);
	const owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
});

describe('workflow-review-requests (env flag off)', () => {
	test('POST is unreachable (404) even though the license is present', async () => {
		await ownerAgent
			.post('/workflow-review-requests')
			.send({
				title: 'x',
				workflows: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
			})
			.expect(404);
	});

	test('POST update-version is unreachable (404) even though the license is present', async () => {
		await ownerAgent
			.post('/workflow-review-requests/some-request/update-version')
			.send({ workflowId: 'wf-1', workflowVersionId: 'version-1' })
			.expect(404);
	});

	test('GET inbox is unreachable (404)', async () => {
		await ownerAgent.get('/workflow-review-requests/inbox').expect(404);
	});

	test('GET summary is unreachable (404)', async () => {
		await ownerAgent.get('/workflow-review-requests/summary').expect(404);
	});
});

describe('GET /workflow-review-requests (env flag off)', () => {
	test('is unreachable (404) even though the license is present', async () => {
		await ownerAgent.get('/workflow-review-requests').query({ workflowId: 'wf-1' }).expect(404);
	});
});
