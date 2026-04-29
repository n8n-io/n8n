import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { NodeGovernanceController } from '@/controllers/node-governance.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeGovernanceService } from '@/services/node-governance.service';

// Type guard for governance response
function isGovernanceRecord(obj: unknown): obj is Record<string, { status: string }> {
	if (typeof obj !== 'object' || obj === null) return false;
	return Object.values(obj).every(
		(v) => typeof v === 'object' && v !== null && 'status' in v && typeof v.status === 'string',
	);
}

describe('NodeGovernanceController', () => {
	const nodeGovernanceService = mockInstance(NodeGovernanceService);
	const controller = Container.get(NodeGovernanceController);

	const mockUser = {
		id: 'user-123',
		email: 'admin@example.com',
		firstName: 'Admin',
		lastName: 'User',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getNodeGovernanceStatus', () => {
		it('should return governance status for requested nodes', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const query = {
				projectId: 'project-1',
				nodeTypes: 'n8n-nodes-base.httpRequest,n8n-nodes-base.code',
			};

			const mockGovernanceMap = new Map([
				['n8n-nodes-base.httpRequest', { status: 'blocked' }],
				['n8n-nodes-base.code', { status: 'allowed' }],
			]);

			nodeGovernanceService.getGovernanceForNodes.mockResolvedValue(mockGovernanceMap as never);

			const result = await controller.getNodeGovernanceStatus(req, res as never, query as never);

			expect(isGovernanceRecord(result.governance)).toBe(true);
			if (isGovernanceRecord(result.governance)) {
				expect(result.governance['n8n-nodes-base.httpRequest'].status).toBe('blocked');
				expect(result.governance['n8n-nodes-base.code'].status).toBe('allowed');
			}
		});

		it('should return empty governance if no node types provided', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const query = { projectId: 'project-1', nodeTypes: '' };

			const result = await controller.getNodeGovernanceStatus(req, res as never, query as never);

			expect(result.governance).toEqual({});
		});
	});

	describe('getAllPolicies', () => {
		it('should return all policies', async () => {
			const mockPolicies = [
				{
					id: 'policy-1',
					name: 'Block HTTP',
					nodeType: 'n8n-nodes-base.httpRequest',
					action: 'block',
					isGlobal: true,
				},
			];

			nodeGovernanceService.getAllPolicies.mockResolvedValue(mockPolicies as never);

			const result = await controller.getAllPolicies();

			expect(result.policies).toEqual(mockPolicies);
			expect(nodeGovernanceService.getAllPolicies).toHaveBeenCalled();
		});
	});

	describe('createPolicy', () => {
		it('should create a global policy', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				name: 'Block SSH',
				nodeType: 'n8n-nodes-base.ssh',
				action: 'block' as const,
				scope: 'global' as const,
				targetType: 'node' as const,
				targetValue: 'n8n-nodes-base.ssh',
			};

			const mockPolicy = {
				id: 'policy-new',
				...payload,
				isGlobal: true,
			};

			nodeGovernanceService.createPolicy.mockResolvedValue(mockPolicy as never);

			const result = await controller.createPolicy(req, res as never, payload as never);

			expect(result.policy).toEqual(mockPolicy);
		});

		it('should throw BadRequestError if project-scoped policy has no project IDs', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				name: 'Block SSH',
				nodeType: 'n8n-nodes-base.ssh',
				action: 'block' as const,
				scope: 'projects' as const,
				targetType: 'node' as const,
				targetValue: 'n8n-nodes-base.ssh',
				projectIds: [],
			};

			await expect(controller.createPolicy(req, res as never, payload as never)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('updatePolicy', () => {
		it('should update a policy', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = { targetValue: 'n8n-nodes-base.ssh' };

			const mockPolicy = {
				id: 'policy-1',
				policyType: 'block',
				scope: 'global',
				targetType: 'node',
				targetValue: 'n8n-nodes-base.ssh',
			};

			nodeGovernanceService.updatePolicy.mockResolvedValue(mockPolicy as never);

			const result = await controller.updatePolicy(req, res as never, 'policy-1', payload as never);

			expect(result.policy.targetValue).toBe('n8n-nodes-base.ssh');
		});

		it('should throw NotFoundError if policy does not exist', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = { targetValue: 'n8n-nodes-base.ssh' };

			nodeGovernanceService.updatePolicy.mockResolvedValue(null as never);

			await expect(
				controller.updatePolicy(req, res as never, 'non-existent', payload as never),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('deletePolicy', () => {
		it('should delete a policy', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();

			nodeGovernanceService.deletePolicy.mockResolvedValue(undefined);

			const result = await controller.deletePolicy(req, res as never, 'policy-1');

			expect(result.success).toBe(true);
			expect(nodeGovernanceService.deletePolicy).toHaveBeenCalledWith('policy-1');
		});
	});

	describe('getAllCategories', () => {
		it('should return all categories', async () => {
			const mockCategories = [
				{
					id: 'cat-1',
					name: 'External Services',
					description: 'Nodes for external services',
				},
			];

			nodeGovernanceService.getAllCategories.mockResolvedValue(mockCategories as never);

			const result = await controller.getAllCategories();

			expect(result.categories).toEqual(mockCategories);
		});
	});

	describe('createCategory', () => {
		it('should create a category', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				slug: 'database-nodes',
				displayName: 'Database Nodes',
				description: 'Nodes for database operations',
			};

			const mockCategory = {
				id: 'cat-new',
				slug: payload.slug,
				displayName: payload.displayName,
				description: payload.description,
			};

			nodeGovernanceService.createCategory.mockResolvedValue(mockCategory as never);

			const result = await controller.createCategory(req, res as never, payload as never);

			expect(result.category.displayName).toBe('Database Nodes');
		});
	});

	describe('getPendingRequests', () => {
		it('should return pending requests', async () => {
			const mockRequests = [
				{
					id: 'req-1',
					nodeType: 'n8n-nodes-base.httpRequest',
					status: 'pending',
				},
			];

			nodeGovernanceService.getPendingRequests.mockResolvedValue(mockRequests as never);

			const result = await controller.getPendingRequests();

			expect(result.requests).toEqual(mockRequests);
		});
	});

	describe('createAccessRequest', () => {
		it('should create a new access request', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				nodeType: 'n8n-nodes-base.ssh',
				projectId: 'project-1',
				reason: 'Need for automation',
			};

			const mockResult = {
				alreadyExists: false,
				request: {
					id: 'req-new',
					...payload,
					status: 'pending',
				},
			};

			nodeGovernanceService.createAccessRequest.mockResolvedValue(mockResult as never);

			const result = await controller.createAccessRequest(req, res as never, payload as never);

			expect(result.alreadyExists).toBe(false);
			expect(result.request.status).toBe('pending');
		});

		it('should return existing request if duplicate', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				nodeType: 'n8n-nodes-base.ssh',
				projectId: 'project-1',
				reason: 'Need for automation',
			};

			const mockResult = {
				alreadyExists: true,
				request: {
					id: 'req-existing',
					...payload,
					status: 'pending',
				},
			};

			nodeGovernanceService.createAccessRequest.mockResolvedValue(mockResult as never);

			const result = await controller.createAccessRequest(req, res as never, payload as never);

			expect(result.alreadyExists).toBe(true);
			expect(result.message).toContain('already exists');
		});
	});

	describe('reviewAccessRequest', () => {
		it('should approve a request', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				action: 'approve' as const,
				comment: 'Approved for use',
			};

			const mockRequest = {
				id: 'req-1',
				status: 'approved',
				reviewerId: mockUser.id,
			};

			nodeGovernanceService.approveRequest.mockResolvedValue(mockRequest as never);

			const result = await controller.reviewAccessRequest(
				req,
				res as never,
				'req-1',
				payload as never,
			);

			expect(result.request.status).toBe('approved');
		});

		it('should reject a request', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				action: 'reject' as const,
				comment: 'Security concerns',
			};

			const mockRequest = {
				id: 'req-1',
				status: 'rejected',
				reviewerId: mockUser.id,
			};

			nodeGovernanceService.rejectRequest.mockResolvedValue(mockRequest as never);

			const result = await controller.reviewAccessRequest(
				req,
				res as never,
				'req-1',
				payload as never,
			);

			expect(result.request.status).toBe('rejected');
		});

		it('should throw NotFoundError if request does not exist', async () => {
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const res = mock<Response>();
			const payload = {
				action: 'approve' as const,
			};

			nodeGovernanceService.approveRequest.mockResolvedValue(null as never);

			await expect(
				controller.reviewAccessRequest(req, res as never, 'non-existent', payload as never),
			).rejects.toThrow(NotFoundError);
		});
	});
});
