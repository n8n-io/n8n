import type { SuperAgentTest } from 'supertest';
import { SOURCE_CONTROL_API_ROOT } from '@/environments/sourceControl/constants';
import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils/';

let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl'],
	enabledFeatures: ['feat:sourceControl'],
});

beforeAll(async () => {
	const owner = await testDb.createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
});

describe('GET /sourceControl/preferences', () => {
	test('should return Source Control preferences', async () => {
		await authOwnerAgent
			.get(`/${SOURCE_CONTROL_API_ROOT}/preferences`)
			.expect(200)
			.expect((res) => {
				return 'repositoryUrl' in res.body && 'branchName' in res.body;
			});
	});
});
