import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';

import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['promotions'],
	modules: ['promotions'],
	enabledFeatures: [LICENSE_FEATURES.GIT_CONNECTIONS],
});

let owner: User;
let member: User;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
});

afterEach(async () => {
	await testDb.truncate(['Project', 'SharedWorkflow', 'WorkflowEntity']);
});

describe('GET /promotions/:projectId/changes', () => {
	test('rejects a member without project export access with 403', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer.authAgentFor(member).get(`/promotions/${project.id}/changes`);

		expect(response.statusCode).toBe(403);
	});

	test('reaches the service and reports the missing instance connection with 404', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer.authAgentFor(owner).get(`/promotions/${project.id}/changes`);

		expect(response.statusCode).toBe(404);
	});
});

describe('POST /promotions/:projectId/promote', () => {
	test('rejects a member without project export access with 403', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer
			.authAgentFor(member)
			.post(`/promotions/${project.id}/promote`)
			.send({ workflowIds: ['w1'], createBranch: false });

		expect(response.statusCode).toBe(403);
	});

	test('rejects an empty selection with 400', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer
			.authAgentFor(owner)
			.post(`/promotions/${project.id}/promote`)
			.send({ workflowIds: [], createBranch: false });

		expect(response.statusCode).toBe(400);
	});

	test('reaches the service and reports the missing instance connection with 404', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer
			.authAgentFor(owner)
			.post(`/promotions/${project.id}/promote`)
			.send({ workflowIds: ['w1'], createBranch: false });

		expect(response.statusCode).toBe(404);
	});
});

describe('POST /promotions/:projectId/promote-all', () => {
	test('rejects a member without project export access with 403', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer
			.authAgentFor(member)
			.post(`/promotions/${project.id}/promote-all`);

		expect(response.statusCode).toBe(403);
	});

	test('reaches the service and reports the missing instance connection with 404', async () => {
		const project = await createTeamProject('Orders', owner);

		const response = await testServer
			.authAgentFor(owner)
			.post(`/promotions/${project.id}/promote-all`);

		expect(response.statusCode).toBe(404);
	});
});
