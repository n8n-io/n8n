import type { User } from '@n8n/db';
import {
	NodeAccessRequestRepository,
	NodeCategoryAssignmentRepository,
	NodeCategoryRepository,
	NodeGovernancePolicyRepository,
	PolicyProjectAssignmentRepository,
	type NodeGovernancePolicy,
	type PolicyScope,
	type PolicyType,
	type TargetType,
	type RequestStatus,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';

export interface GovernanceStatus {
	status: 'allowed' | 'blocked' | 'pending_request';
	category?: string;
	requestId?: string;
}

export interface NodeGovernanceResult {
	nodeType: string;
	governance: GovernanceStatus;
}

interface PolicyMatch {
	policy: NodeGovernancePolicy;
	priority: number; // Lower = higher priority: Global BLOCK=1, Global ALLOW=2, Project BLOCK=3, Project ALLOW=4
}

@Service()
export class NodeGovernanceService {
	constructor(
		private readonly policyRepository: NodeGovernancePolicyRepository,
		private readonly policyProjectAssignmentRepository: PolicyProjectAssignmentRepository,
		private readonly categoryRepository: NodeCategoryRepository,
		private readonly categoryAssignmentRepository: NodeCategoryAssignmentRepository,
		private readonly accessRequestRepository: NodeAccessRequestRepository,
	) {}

	/**
	 * Get governance status for a list of node types for a specific project
	 * Policy priority: Global BLOCK > Global ALLOW > Project BLOCK > Project ALLOW > Default (allowed)
	 */
	async getGovernanceForNodes(
		nodeTypes: string[],
		projectId: string,
		userId: string,
		entityManager?: EntityManager,
	): Promise<Map<string, GovernanceStatus>> {
		// Get all policies (global and project-scoped)
		const [globalPolicies, projectPolicies] = await Promise.all([
			this.policyRepository.findGlobalPolicies(entityManager),
			this.policyRepository.findByProjectIds([projectId], entityManager),
		]);

		// Get category assignments for all node types
		const categoryAssignments =
			await this.categoryAssignmentRepository.findByNodeTypes(nodeTypes, entityManager);

		// Build node type to category slugs map
		const nodeToCategories = new Map<string, string[]>();
		for (const assignment of categoryAssignments) {
			const existing = nodeToCategories.get(assignment.nodeType) ?? [];
			existing.push(assignment.category.slug);
			nodeToCategories.set(assignment.nodeType, existing);
		}

		// Get pending requests for this user in this project
		const pendingRequests =
			await this.accessRequestRepository.findByProjectId(projectId, entityManager);
		const pendingRequestMap = new Map<string, string>();
		for (const request of pendingRequests) {
			if (request.status === 'pending' && request.requestedById === userId) {
				pendingRequestMap.set(request.nodeType, request.id);
			}
		}

		const result = new Map<string, GovernanceStatus>();

		for (const nodeType of nodeTypes) {
			const categories = nodeToCategories.get(nodeType) ?? [];
			const governanceStatus = this.resolveNodeGovernance(
				nodeType,
				categories,
				globalPolicies,
				projectPolicies,
				projectId,
			);

			// Check for pending request
			const pendingRequestId = pendingRequestMap.get(nodeType);
			if (governanceStatus.status === 'blocked' && pendingRequestId) {
				result.set(nodeType, {
					status: 'pending_request',
					category: categories[0],
					requestId: pendingRequestId,
				});
			} else {
				result.set(nodeType, {
					...governanceStatus,
					category: categories[0],
				});
			}
		}

		return result;
	}

	/**
	 * Resolve governance for a single node type
	 * Priority: Global BLOCK (1) > Global ALLOW (2) > Project BLOCK (3) > Project ALLOW (4) > Default
	 */
	private resolveNodeGovernance(
		nodeType: string,
		categories: string[],
		globalPolicies: NodeGovernancePolicy[],
		projectPolicies: NodeGovernancePolicy[],
		projectId: string,
	): GovernanceStatus {
		const matchingPolicies: PolicyMatch[] = [];

		// Check global policies
		for (const policy of globalPolicies) {
			if (this.policyMatchesNode(policy, nodeType, categories)) {
				matchingPolicies.push({
					policy,
					priority: policy.policyType === 'block' ? 1 : 2,
				});
			}
		}

		// Check project policies
		for (const policy of projectPolicies) {
			const isForThisProject = policy.projectAssignments?.some(
				(a) => a.projectId === projectId,
			);
			if (isForThisProject && this.policyMatchesNode(policy, nodeType, categories)) {
				matchingPolicies.push({
					policy,
					priority: policy.policyType === 'block' ? 3 : 4,
				});
			}
		}

		// Sort by priority (lowest = highest priority)
		matchingPolicies.sort((a, b) => a.priority - b.priority);

		// Apply highest priority policy
		if (matchingPolicies.length > 0) {
			const highestPriorityPolicy = matchingPolicies[0].policy;
			return {
				status: highestPriorityPolicy.policyType === 'block' ? 'blocked' : 'allowed',
			};
		}

		// Default: allowed
		return { status: 'allowed' };
	}

	private policyMatchesNode(
		policy: NodeGovernancePolicy,
		nodeType: string,
		categories: string[],
	): boolean {
		if (policy.targetType === 'node') {
			return policy.targetValue === nodeType;
		}
		if (policy.targetType === 'category') {
			return categories.includes(policy.targetValue);
		}
		return false;
	}

	// === Policy Management ===

	async createPolicy(
		data: {
			policyType: PolicyType;
			scope: PolicyScope;
			targetType: TargetType;
			targetValue: string;
			projectIds?: string[];
		},
		user: User,
		entityManager?: EntityManager,
	) {
		const policy = await this.policyRepository.createPolicy(
			{
				policyType: data.policyType,
				scope: data.scope,
				targetType: data.targetType,
				targetValue: data.targetValue,
				createdById: user.id,
			},
			entityManager,
		);

		if (data.scope === 'projects' && data.projectIds && data.projectIds.length > 0) {
			await this.policyProjectAssignmentRepository.createAssignments(
				policy.id,
				data.projectIds,
				entityManager,
			);
		}

		return await this.policyRepository.findOne({
			where: { id: policy.id },
			relations: ['projectAssignments', 'projectAssignments.project', 'createdBy'],
		});
	}

	async updatePolicy(
		id: string,
		data: {
			policyType?: PolicyType;
			scope?: PolicyScope;
			targetType?: TargetType;
			targetValue?: string;
			projectIds?: string[];
		},
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.policyRepository.manager;

		const updateData: Partial<NodeGovernancePolicy> = {};
		if (data.policyType) updateData.policyType = data.policyType;
		if (data.scope) updateData.scope = data.scope;
		if (data.targetType) updateData.targetType = data.targetType;
		if (data.targetValue) updateData.targetValue = data.targetValue;

		if (Object.keys(updateData).length > 0) {
			await em.update('NodeGovernancePolicy', { id }, updateData);
		}

		if (data.projectIds !== undefined) {
			await this.policyProjectAssignmentRepository.replaceAssignments(
				id,
				data.projectIds,
				em,
			);
		}

		return await this.policyRepository.findOne({
			where: { id },
			relations: ['projectAssignments', 'projectAssignments.project', 'createdBy'],
		});
	}

	async deletePolicy(id: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.policyRepository.manager;
		await em.delete('NodeGovernancePolicy', { id });
	}

	async getAllPolicies(entityManager?: EntityManager) {
		return await this.policyRepository.findAllWithRelations(entityManager);
	}

	// === Category Management ===

	async createCategory(
		data: {
			slug: string;
			displayName: string;
			description?: string;
			color?: string;
		},
		user: User,
		entityManager?: EntityManager,
	) {
		return await this.categoryRepository.createCategory(
			{ ...data, createdById: user.id },
			entityManager,
		);
	}

	async updateCategory(
		id: string,
		data: {
			slug?: string;
			displayName?: string;
			description?: string | null;
			color?: string | null;
		},
		entityManager?: EntityManager,
	) {
		return await this.categoryRepository.updateCategory(id, data, entityManager);
	}

	async deleteCategory(id: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.categoryRepository.manager;
		await em.delete('NodeCategory', { id });
	}

	async getAllCategories(entityManager?: EntityManager) {
		return await this.categoryRepository.findAllWithAssignments(entityManager);
	}

	async assignNodeToCategory(
		categoryId: string,
		nodeType: string,
		user: User,
		entityManager?: EntityManager,
	) {
		return await this.categoryAssignmentRepository.createAssignment(
			{ categoryId, nodeType, assignedById: user.id },
			entityManager,
		);
	}

	async removeNodeFromCategory(
		categoryId: string,
		nodeType: string,
		entityManager?: EntityManager,
	) {
		return await this.categoryAssignmentRepository.removeAssignment(
			categoryId,
			nodeType,
			entityManager,
		);
	}

	// === Access Request Management ===

	async createAccessRequest(
		data: {
			projectId: string;
			nodeType: string;
			justification: string;
			workflowName?: string;
		},
		user: User,
		entityManager?: EntityManager,
	) {
		// Check for existing pending request
		const existingRequest = await this.accessRequestRepository.findPendingByUserAndNode(
			user.id,
			data.nodeType,
			data.projectId,
			entityManager,
		);

		if (existingRequest) {
			return { alreadyExists: true, request: existingRequest };
		}

		const request = await this.accessRequestRepository.createRequest(
			{ ...data, requestedById: user.id },
			entityManager,
		);

		return { alreadyExists: false, request };
	}

	async approveRequest(
		id: string,
		reviewer: User,
		reviewComment?: string,
		createAllowPolicy = true,
		entityManager?: EntityManager,
	) {
		const request = await this.accessRequestRepository.updateStatus(
			id,
			'approved',
			reviewer.id,
			reviewComment,
			entityManager,
		);

		// Optionally create an allow policy for this node in the project
		if (createAllowPolicy && request) {
			await this.createPolicy(
				{
					policyType: 'allow',
					scope: 'projects',
					targetType: 'node',
					targetValue: request.nodeType,
					projectIds: [request.projectId],
				},
				reviewer,
				entityManager,
			);
		}

		return request;
	}

	async rejectRequest(
		id: string,
		reviewer: User,
		reviewComment?: string,
		entityManager?: EntityManager,
	) {
		return await this.accessRequestRepository.updateStatus(
			id,
			'rejected',
			reviewer.id,
			reviewComment,
			entityManager,
		);
	}

	async getPendingRequests(entityManager?: EntityManager) {
		return await this.accessRequestRepository.findPendingRequests(entityManager);
	}

	async getRequestsByUser(userId: string, entityManager?: EntityManager) {
		return await this.accessRequestRepository.findByRequestedById(userId, entityManager);
	}

	async getRequestsByProject(projectId: string, entityManager?: EntityManager) {
		return await this.accessRequestRepository.findByProjectId(projectId, entityManager);
	}
}
