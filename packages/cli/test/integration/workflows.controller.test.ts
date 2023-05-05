import type { SuperAgentTest } from 'supertest';
import type { IPinData } from 'n8n-workflow';

import type { User } from '@db/entities/User';
import * as UserManagementHelpers from '@/UserManagement/UserManagementHelper';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { makeWorkflow, MOCK_PINDATA } from './shared/utils';

let ownerShell: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['workflows'] });
	const globalOwnerRole = await testDb.getGlobalOwnerRole();
	ownerShell = await testDb.createUserShell(globalOwnerRole);
	authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	// mock whether sharing is enabled or not
	jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(false);
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('POST /workflows', () => {
	test('should store pin data for node in workflow', async () => {
		const workflow = makeWorkflow({ withPinData: true });

		const response = await authOwnerAgent.post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);

		const { pinData } = response.body.data as { pinData: IPinData };

		expect(pinData).toMatchObject(MOCK_PINDATA);
	});

	test('should set pin data to null if no pin data', async () => {
		const workflow = makeWorkflow({ withPinData: false });

		const response = await authOwnerAgent.post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);

		const { pinData } = response.body.data as { pinData: IPinData };

		expect(pinData).toBeNull();
	});
});

describe('GET /workflows/:id', () => {
	test('should return pin data', async () => {
		const workflow = makeWorkflow({ withPinData: true });

		const workflowCreationResponse = await authOwnerAgent.post('/workflows').send(workflow);

		const { id } = workflowCreationResponse.body.data as { id: string };

		const workflowRetrievalResponse = await authOwnerAgent.get(`/workflows/${id}`);

		expect(workflowRetrievalResponse.statusCode).toBe(200);

		const { pinData } = workflowRetrievalResponse.body.data as { pinData: IPinData };

		expect(pinData).toMatchObject(MOCK_PINDATA);
	});
});
