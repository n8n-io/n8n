import { mockInstance } from '@n8n/backend-test-utils';
import {
	NodeAccessRequestRepository,
	NodeCategoryAssignmentRepository,
	NodeCategoryRepository,
	NodeGovernancePolicyRepository,
	PolicyProjectAssignmentRepository,
} from '@n8n/db';
import type { NodeGovernancePolicy, PolicyProjectAssignment } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { NodeGovernanceService } from '@/services/node-governance.service';

describe('NodeGovernanceService', () => {
	const policyRepository = mockInstance(NodeGovernancePolicyRepository);
	mockInstance(PolicyProjectAssignmentRepository);
	mockInstance(NodeCategoryRepository);
	const categoryAssignmentRepository = mockInstance(NodeCategoryAssignmentRepository);
	const accessRequestRepository = mockInstance(NodeAccessRequestRepository);

	const service = Container.get(NodeGovernanceService);

	const projectId = 'project-123';
	const userId = 'user-123';
	const nodeType = 'n8n-nodes-base.httpRequest';

	beforeEach(() => {
		jest.clearAllMocks();
		// Default: no pending requests
		accessRequestRepository.findByProjectId.mockResolvedValue([]);
		// Default: no category assignments
		categoryAssignmentRepository.findByNodeTypes.mockResolvedValue([]);
	});

	describe('getGovernanceForNodes - Priority Resolution', () => {
		/**
		 * Priority order (lower number = higher priority):
		 * 1. Project ALLOW - Explicitly allows a node for a specific project
		 * 2. Global BLOCK - Blocks a node across all projects
		 * 3. Global ALLOW - Explicitly allows a node globally
		 * 4. Project BLOCK - Blocks a node for a specific project
		 * Default: allowed (when no policies match)
		 */

		it('should default to allowed when no policies exist', async () => {
			policyRepository.findGlobalPolicies.mockResolvedValue([]);
			policyRepository.findByProjectIds.mockResolvedValue([]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			expect(result.get(nodeType)?.status).toBe('allowed');
		});

		it('should block node when only Global BLOCK policy exists', async () => {
			const globalBlockPolicy = createPolicy({
				scope: 'global',
				policyType: 'block',
				targetType: 'node',
				targetValue: nodeType,
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([globalBlockPolicy]);
			policyRepository.findByProjectIds.mockResolvedValue([]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			expect(result.get(nodeType)?.status).toBe('blocked');
		});

		it('should allow node when only Global ALLOW policy exists', async () => {
			const globalAllowPolicy = createPolicy({
				scope: 'global',
				policyType: 'allow',
				targetType: 'node',
				targetValue: nodeType,
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([globalAllowPolicy]);
			policyRepository.findByProjectIds.mockResolvedValue([]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			expect(result.get(nodeType)?.status).toBe('allowed');
		});

		it('should prioritize Project ALLOW over Global BLOCK (priority 1 > 2)', async () => {
			const globalBlockPolicy = createPolicy({
				scope: 'global',
				policyType: 'block',
				targetType: 'node',
				targetValue: nodeType,
			});

			const projectAllowPolicy = createPolicy({
				scope: 'projects',
				policyType: 'allow',
				targetType: 'node',
				targetValue: nodeType,
				projectAssignments: [{ projectId }],
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([globalBlockPolicy]);
			policyRepository.findByProjectIds.mockResolvedValue([projectAllowPolicy]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			// Project ALLOW wins over Global BLOCK
			expect(result.get(nodeType)?.status).toBe('allowed');
		});

		it('should prioritize Global BLOCK over Global ALLOW (priority 2 > 3)', async () => {
			const globalBlockPolicy = createPolicy({
				scope: 'global',
				policyType: 'block',
				targetType: 'node',
				targetValue: nodeType,
			});

			const globalAllowPolicy = createPolicy({
				scope: 'global',
				policyType: 'allow',
				targetType: 'node',
				targetValue: nodeType,
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([globalBlockPolicy, globalAllowPolicy]);
			policyRepository.findByProjectIds.mockResolvedValue([]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			// Global BLOCK wins over Global ALLOW
			expect(result.get(nodeType)?.status).toBe('blocked');
		});

		it('should prioritize Global ALLOW over Project BLOCK (priority 3 > 4)', async () => {
			const globalAllowPolicy = createPolicy({
				scope: 'global',
				policyType: 'allow',
				targetType: 'node',
				targetValue: nodeType,
			});

			const projectBlockPolicy = createPolicy({
				scope: 'projects',
				policyType: 'block',
				targetType: 'node',
				targetValue: nodeType,
				projectAssignments: [{ projectId }],
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([globalAllowPolicy]);
			policyRepository.findByProjectIds.mockResolvedValue([projectBlockPolicy]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			// Global ALLOW wins over Project BLOCK
			expect(result.get(nodeType)?.status).toBe('allowed');
		});

		it('should block when only Project BLOCK exists', async () => {
			const projectBlockPolicy = createPolicy({
				scope: 'projects',
				policyType: 'block',
				targetType: 'node',
				targetValue: nodeType,
				projectAssignments: [{ projectId }],
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([]);
			policyRepository.findByProjectIds.mockResolvedValue([projectBlockPolicy]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			expect(result.get(nodeType)?.status).toBe('blocked');
		});

		it('should ignore Project policies for other projects', async () => {
			const otherProjectBlockPolicy = createPolicy({
				scope: 'projects',
				policyType: 'block',
				targetType: 'node',
				targetValue: nodeType,
				projectAssignments: [{ projectId: 'other-project' }],
			});

			policyRepository.findGlobalPolicies.mockResolvedValue([]);
			policyRepository.findByProjectIds.mockResolvedValue([otherProjectBlockPolicy]);

			const result = await service.getGovernanceForNodes([nodeType], projectId, userId);

			// Policy is for a different project, so default to allowed
			expect(result.get(nodeType)?.status).toBe('allowed');
		});
	});
});

// Helper function to create policy objects for testing
function createPolicy(overrides: {
	scope: 'global' | 'projects';
	policyType: 'allow' | 'block';
	targetType: 'node' | 'category';
	targetValue: string;
	projectAssignments?: Array<{ projectId: string }>;
}): NodeGovernancePolicy {
	const policyId = `policy-${Math.random().toString(36).substring(7)}`;
	const assignments: PolicyProjectAssignment[] =
		overrides.projectAssignments?.map((a) =>
			mock<PolicyProjectAssignment>({
				id: `assignment-${Math.random().toString(36).substring(7)}`,
				policyId,
				projectId: a.projectId,
			}),
		) ?? [];

	return mock<NodeGovernancePolicy>({
		id: policyId,
		scope: overrides.scope,
		policyType: overrides.policyType,
		targetType: overrides.targetType,
		targetValue: overrides.targetValue,
		createdAt: new Date(),
		updatedAt: new Date(),
		createdById: null,
		projectAssignments: assignments,
	});
}
