import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import { createAdmin, createMember, createOwner } from './shared/db/users';

import type { SuperAgentTest } from 'supertest';
import type { User } from '@db/entities/User';

const testServer = utils.setupTestServer({
	endpointGroups: ['role'],
	enabledFeatures: ['feat:advancedPermissions'],
});

const license = testServer.license;

describe('GET /roles', () => {
	let owner: User;
	let admin: User;
	let member: User;

	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	let toAgent: Record<string, SuperAgentTest> = {};

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		admin = await createAdmin();
		member = await createMember();

		ownerAgent = testServer.authAgentFor(owner);
		adminAgent = testServer.authAgentFor(admin);
		memberAgent = testServer.authAgentFor(member);

		toAgent = {
			owner: ownerAgent,
			admin: adminAgent,
			member: memberAgent,
		};
	});

	describe('with advanced permissions licensed', () => {
		test.each(['owner', 'admin', 'member'])('should return all roles to %s', async (user) => {
			license.enable('feat:advancedPermissions');

			const response = await toAgent[user].get('/roles').expect(200);

			expect(response.body.data).toEqual([
				{ scope: 'global', name: 'owner', isAvailable: true },
				{ scope: 'global', name: 'member', isAvailable: true },
				{ scope: 'global', name: 'admin', isAvailable: true },
				{ scope: 'workflow', name: 'owner', isAvailable: true },
				{ scope: 'credential', name: 'owner', isAvailable: true },
				{ scope: 'credential', name: 'user', isAvailable: true },
				{ scope: 'workflow', name: 'editor', isAvailable: true },
			]);
		});
	});

	describe('with advanced permissions not licensed', () => {
		test.each(['owner', 'admin', 'member'])('should return all roles to %s', async (user) => {
			license.disable('feat:advancedPermissions');

			const response = await toAgent[user].get('/roles').expect(200);

			expect(response.body.data).toEqual([
				{ scope: 'global', name: 'owner', isAvailable: true },
				{ scope: 'global', name: 'member', isAvailable: true },
				{ scope: 'global', name: 'admin', isAvailable: false },
				{ scope: 'workflow', name: 'owner', isAvailable: true },
				{ scope: 'credential', name: 'owner', isAvailable: true },
				{ scope: 'credential', name: 'user', isAvailable: true },
				{ scope: 'workflow', name: 'editor', isAvailable: true },
			]);
		});
	});
});
