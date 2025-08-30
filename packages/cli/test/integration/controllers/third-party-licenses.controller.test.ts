import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('ThirdPartyLicensesController', () => {
	const testServer = setupTestServer({ endpointGroups: ['third-party-licenses'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		const member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	describe('GET /third-party-licenses', () => {
		it('should require authentication', async () => {
			await testServer.authlessAgent.get('/third-party-licenses').expect(401);
		});

		it('should allow authenticated owner to get third-party licenses', async () => {
			const response = await ownerAgent.get('/third-party-licenses');
			expect([200, 404]).toContain(response.status);
		});

		it('should allow authenticated member to get third-party licenses', async () => {
			const response = await memberAgent.get('/third-party-licenses');
			expect([200, 404]).toContain(response.status);
		});
	});
});
