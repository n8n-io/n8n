import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { RoleMappingRuleController } from '../role-mapping-rule.controller.ee';
import type {
	RoleMappingRuleResponse,
	RoleMappingRuleService,
} from '../role-mapping-rule.service.ee';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '@n8n/db';

const roleMappingRuleService = mock<RoleMappingRuleService>();
const licenseState = mock<LicenseState>();

const controller = new RoleMappingRuleController(roleMappingRuleService, licenseState);

describe('RoleMappingRuleController', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('create', () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>({
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		});

		const body = {
			expression: 'groups.includes("admins")',
			role: 'global:admin',
			type: 'instance' as const,
			order: 0,
		};

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.create(req, res, body);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should create a role mapping rule when provisioning is licensed', async () => {
			const created: RoleMappingRuleResponse = {
				id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
				expression: body.expression,
				role: body.role,
				type: 'instance',
				order: 0,
				projectIds: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			roleMappingRuleService.create.mockResolvedValue(created);

			const result = await controller.create(req, res, body);

			expect(result).toEqual(created);
			expect(roleMappingRuleService.create).toHaveBeenCalledWith(body);
		});
	});
});
