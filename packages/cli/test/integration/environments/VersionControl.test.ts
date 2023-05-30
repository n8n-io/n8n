import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';
import type { User } from '@db/entities/User';
import { License } from '@/License';
import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils';
import { VERSION_CONTROL_API_ROOT } from '@/environments/versionControl/constants';

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	Container.get(License).isVersionControlLicensed = () => true;
	const app = await utils.initTestServer({ endpointGroups: ['versionControl'] });
	owner = await testDb.createOwner();
	authOwnerAgent = utils.createAuthAgent(app)(owner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GET /versionControl/preferences', () => {
	test('should return Version Control preferences', async () => {
		await authOwnerAgent
			.get(`/${VERSION_CONTROL_API_ROOT}/preferences`)
			.expect(200)
			.expect((res) => {
				return 'repositoryUrl' in res.body && 'branchName' in res.body;
			});
	});
});
