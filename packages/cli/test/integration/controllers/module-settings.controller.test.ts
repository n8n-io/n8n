import { mockInstance } from '@n8n/backend-test-utils';
import type { ModuleSettings } from '@n8n/decorators';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

import { FrontendService } from '@/services/frontend.service';

describe('ModuleSettingsController', () => {
	const frontendService = mockInstance(FrontendService);

	const testServer = setupTestServer({ endpointGroups: ['module-settings'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		const member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /module-settings', () => {
		const mockSettings: { [key: string]: ModuleSettings } = { module: { some: 'settings' } };

		it('should require authentication', async () => {
			await testServer.authlessAgent.get('/module-settings').expect(401);
		});

		it('should allow authenticated owner to get module settings', async () => {
			frontendService.getModuleSettings.mockReturnValue(mockSettings);

			const response = await ownerAgent.get('/module-settings').expect(200);

			expect(response.body).toEqual({ data: mockSettings });
			expect(frontendService.getModuleSettings).toHaveBeenCalledTimes(1);
		});

		it('should allow authenticated member to get module settings', async () => {
			frontendService.getModuleSettings.mockReturnValue(mockSettings);

			const response = await memberAgent.get('/module-settings').expect(200);

			expect(response.body).toEqual({ data: mockSettings });
			expect(frontendService.getModuleSettings).toHaveBeenCalledTimes(1);
		});

		it('should handle service errors gracefully', async () => {
			frontendService.getModuleSettings.mockImplementation(() => {
				throw new Error('Service error');
			});

			await ownerAgent.get('/module-settings').expect(500);
		});
	});
});
