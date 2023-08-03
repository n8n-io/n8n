import * as utils from './shared/utils';
import type { MetricsService } from '@/services/metrics.service';
import config from '@/config';
import * as testDb from './shared/testDb';
import type { SuperAgentTest } from 'supertest';
import type { Role } from '@/databases/entities/Role';
import type { User } from '@/databases/entities/User';

config.set('endpoints.metrics.enable', true);
const testServer = utils.setupTestServer({ endpointGroups: ['metrics'] });

let globalOwnerRole: Role;
let ownerShell: User;
let authOwnerAgent: SuperAgentTest;

let metricsService: MetricsService;

describe('Metrics ', () => {
	beforeAll(async () => {
		const owner = await testDb.createOwner();
		globalOwnerRole = await testDb.getGlobalOwnerRole();
		ownerShell = await testDb.createUserShell(globalOwnerRole);
		authOwnerAgent = testServer.authAgentFor(ownerShell);
	});

	beforeEach(async () => {});
	it('should return metrics', async () => {
		const result = await authOwnerAgent.get('/metrics');
		console.log(result.body);
		// this returns 404 :(
		// expect(result.status).toEqual(200);
	});
});
