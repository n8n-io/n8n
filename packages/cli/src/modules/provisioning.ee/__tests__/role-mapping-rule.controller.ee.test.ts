import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { RoleMappingRuleController } from '../role-mapping-rule.controller.ee';
import type {
	RoleMappingRuleListResponse,
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

	describe('list', () => {
		const req = mock<AuthenticatedRequest>();
		const res = mock<Response>({
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		});

		const query = { skip: 0, take: 10 };

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.list(req, res, query);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should list role mapping rules when provisioning is licensed', async () => {
			const payload: RoleMappingRuleListResponse = {
				count: 1,
				items: [
					{
						id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
						expression: 'true',
						role: 'global:member',
						type: 'instance',
						order: 0,
						projectIds: [],
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				],
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			roleMappingRuleService.list.mockResolvedValue(payload);

			const result = await controller.list(req, res, query);

			expect(result).toEqual(payload);
			expect(roleMappingRuleService.list).toHaveBeenCalledWith(query);
		});
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

	describe('patch', () => {
		const ruleId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
		const patchBody = { expression: 'claims.updated === true' };
		const req = mock<AuthenticatedRequest>();
		req.params = { id: ruleId };
		req.body = patchBody;
		const res = mock<Response>({
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		});

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.patch(req, res, patchBody, ruleId);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should patch a role mapping rule when provisioning is licensed', async () => {
			const updated: RoleMappingRuleResponse = {
				id: ruleId,
				expression: patchBody.expression,
				role: 'global:admin',
				type: 'instance',
				order: 0,
				projectIds: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			roleMappingRuleService.patch.mockResolvedValue(updated);

			const result = await controller.patch(req, res, patchBody, ruleId);

			expect(result).toEqual(updated);
			expect(roleMappingRuleService.patch).toHaveBeenCalledWith(ruleId, patchBody);
		});
	});

	describe('move', () => {
		const ruleId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
		const moveBody = { targetIndex: 2 };
		const req = mock<AuthenticatedRequest>();
		req.params = { id: ruleId };
		const res = mock<Response>({
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		});

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.move(req, res, moveBody, ruleId);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should move a role mapping rule when provisioning is licensed', async () => {
			const moved: RoleMappingRuleResponse = {
				id: ruleId,
				expression: 'true',
				role: 'global:admin',
				type: 'instance',
				order: 2,
				projectIds: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			licenseState.isProvisioningLicensed.mockReturnValue(true);
			roleMappingRuleService.move.mockResolvedValue(moved);

			const result = await controller.move(req, res, moveBody, ruleId);

			expect(result).toEqual(moved);
			expect(roleMappingRuleService.move).toHaveBeenCalledWith(ruleId, moveBody.targetIndex);
		});
	});

	describe('delete', () => {
		const ruleId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
		const req = mock<AuthenticatedRequest>();
		req.params = { id: ruleId };
		const res = mock<Response>({
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		});

		it('should return 403 if provisioning is not licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(false);
			await controller.delete(req, res, ruleId);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('should delete a role mapping rule when provisioning is licensed', async () => {
			licenseState.isProvisioningLicensed.mockReturnValue(true);
			roleMappingRuleService.delete.mockResolvedValue(undefined);

			const result = await controller.delete(req, res, ruleId);

			expect(result).toEqual({ success: true });
			expect(roleMappingRuleService.delete).toHaveBeenCalledWith(ruleId);
		});
	});
});
