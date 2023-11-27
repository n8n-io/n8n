import { License } from '@/License';

import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import { mockInstance } from '../shared/mocking';
import { createAdmin, createMember, createOwner } from './shared/db/users';

import type { SuperAgentTest } from 'supertest';
import type { User } from '@db/entities/User';

const testServer = utils.setupTestServer({ endpointGroups: ['role'] });

const license = mockInstance(License, {
	isAdvancedPermissionsLicensed: jest.fn().mockReturnValue(true),
	isWithinUsersLimit: jest.fn().mockReturnValue(true),
});

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
			license.isAdvancedPermissionsLicensed.mockReturnValue(true);

			const response = await toAgent[user].get('/roles').expect(200);

			expect(response.body.data).toEqual([
				{ scope: 'global', name: 'owner', licensed: true },
				{ scope: 'global', name: 'member', licensed: true },
				{ scope: 'global', name: 'admin', licensed: true },
				{ scope: 'workflow', name: 'owner', licensed: true },
				{ scope: 'credential', name: 'owner', licensed: true },
				{ scope: 'credential', name: 'user', licensed: true },
				{ scope: 'workflow', name: 'editor', licensed: true },
			]);
		});
	});

	describe('with advanced permissions not licensed', () => {
		test.each(['owner', 'admin', 'member'])('should return all roles to %s', async (user) => {
			license.isAdvancedPermissionsLicensed.mockReturnValue(false);

			const response = await toAgent[user].get('/roles').expect(200);

			expect(response.body.data).toEqual([
				{ scope: 'global', name: 'owner', licensed: true },
				{ scope: 'global', name: 'member', licensed: true },
				{ scope: 'global', name: 'admin', licensed: false },
				{ scope: 'workflow', name: 'owner', licensed: true },
				{ scope: 'credential', name: 'owner', licensed: true },
				{ scope: 'credential', name: 'user', licensed: true },
				{ scope: 'workflow', name: 'editor', licensed: true },
			]);
		});
	});
});
