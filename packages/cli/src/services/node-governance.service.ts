import {
	NodeAccessRequestRepository,
	NodeCategoryAssignmentRepository,
	NodeCategoryRepository,
	NodeGovernancePolicyRepository,
	PolicyProjectAssignmentRepository,
	type EntityManager,
	type NodeGovernancePolicy,
	type PolicyScope,
	type PolicyType,
	type TargetType,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
	priority: number; // Lower = higher priority: Project ALLOW=1, Global BLOCK=2, Global ALLOW=3, Project BLOCK=4
}

export interface NodeGovernanceExportCategory {
	slug: string;
	displayName: string;
	description?: string | null;
	color?: string | null;
	nodes: string[];
}

export interface NodeGovernanceExport {
	version: string;
	exportedAt?: string;
	categories: NodeGovernanceExportCategory[];
}

export interface NodeGovernanceImportResult {
	created: number;
	updated: number;
	unchanged: number;
	categories: Array<{
		slug: string;
		action: 'created' | 'updated' | 'unchanged';
		nodeCount: number;
	}>;
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
	 * Policy priority: Project ALLOW > Global BLOCK > Global ALLOW > Project BLOCK > Default (allowed)
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
		const categoryAssignments = await this.categoryAssignmentRepository.findByNodeTypes(
			nodeTypes,
			entityManager,
		);

		// Build node type to category slugs map
		const nodeToCategories = new Map<string, string[]>();
		for (const assignment of categoryAssignments) {
			const existing = nodeToCategories.get(assignment.nodeType) ?? [];
			existing.push(assignment.category.slug);
			nodeToCategories.set(assignment.nodeType, existing);
		}

		// Get pending requests for this user in this project
		const pendingRequests = await this.accessRequestRepository.findByProjectId(
			projectId,
			entityManager,
		);
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
	 * Priority: Project ALLOW (1) > Global BLOCK (2) > Global ALLOW (3) > Project BLOCK (4) > Default
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
					priority: policy.policyType === 'block' ? 2 : 3,
				});
			}
		}

		// Check project policies
		for (const policy of projectPolicies) {
			const isForThisProject = policy.projectAssignments?.some((a) => a.projectId === projectId);
			if (isForThisProject && this.policyMatchesNode(policy, nodeType, categories)) {
				matchingPolicies.push({
					policy,
					priority: policy.policyType === 'block' ? 4 : 1,
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
			await this.policyProjectAssignmentRepository.replaceAssignments(id, data.projectIds, em);
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

	async getGlobalPolicies(entityManager?: EntityManager) {
		return await this.policyRepository.findGlobalPolicies(entityManager);
	}

	async getProjectPolicies(projectId: string, entityManager?: EntityManager) {
		return await this.policyRepository.findByProjectIds([projectId], entityManager);
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

	// === Import/Export ===

	/**
	 * Export all categories and their node assignments
	 */
	async exportCategories(): Promise<NodeGovernanceExport> {
		const categories = await this.categoryRepository.findAllWithAssignments();

		return {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			categories: categories.map((category) => ({
				slug: category.slug,
				displayName: category.displayName,
				description: category.description,
				color: category.color,
				nodes: category.nodeAssignments?.map((assignment) => assignment.nodeType) ?? [],
			})),
		};
	}

	/**
	 * Import categories and their node assignments
	 * Uses upsert behavior: existing categories (by slug) are updated, new ones are created
	 */
	async importCategories(
		data: NodeGovernanceExport,
		user: User,
		entityManager?: EntityManager,
	): Promise<NodeGovernanceImportResult> {
		const em = entityManager ?? this.categoryRepository.manager;

		const result: NodeGovernanceImportResult = {
			created: 0,
			updated: 0,
			unchanged: 0,
			categories: [],
		};

		for (const categoryData of data.categories) {
			// Check if category already exists
			const existingCategory = await this.categoryRepository.findBySlug(
				categoryData.slug,
				entityManager,
			);

			let categoryId: string;
			let action: 'created' | 'updated' | 'unchanged';

			if (existingCategory) {
				// Check if anything changed
				const hasChanges =
					existingCategory.displayName !== categoryData.displayName ||
					existingCategory.description !== categoryData.description ||
					existingCategory.color !== categoryData.color;

				if (hasChanges) {
					// Update existing category
					await this.categoryRepository.updateCategory(
						existingCategory.id,
						{
							displayName: categoryData.displayName,
							description: categoryData.description,
							color: categoryData.color,
						},
						entityManager,
					);
					action = 'updated';
					result.updated++;
				} else {
					action = 'unchanged';
					result.unchanged++;
				}
				categoryId = existingCategory.id;
			} else {
				// Create new category
				const newCategory = await this.categoryRepository.createCategory(
					{
						slug: categoryData.slug,
						displayName: categoryData.displayName,
						description: categoryData.description ?? undefined,
						color: categoryData.color ?? undefined,
						createdById: user.id,
					},
					entityManager,
				);
				categoryId = newCategory.id;
				action = 'created';
				result.created++;
			}

			// Sync node assignments - remove existing and add new ones
			const existingAssignments = await this.categoryAssignmentRepository.findByCategoryId(
				categoryId,
				entityManager,
			);
			const existingNodeTypes = new Set(existingAssignments.map((a) => a.nodeType));
			const newNodeTypes = new Set(categoryData.nodes ?? []);

			// Remove assignments that are no longer in the import
			for (const assignment of existingAssignments) {
				if (!newNodeTypes.has(assignment.nodeType)) {
					await em.delete('NodeCategoryAssignment', { id: assignment.id });
				}
			}

			// Add new assignments
			for (const nodeType of categoryData.nodes ?? []) {
				if (!existingNodeTypes.has(nodeType)) {
					await this.categoryAssignmentRepository.createAssignment(
						{
							categoryId,
							nodeType,
							assignedById: user.id,
						},
						entityManager,
					);
				}
			}

			result.categories.push({
				slug: categoryData.slug,
				action,
				nodeCount: categoryData.nodes?.length ?? 0,
			});
		}

		return result;
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
		policyId?: string,
		entityManager?: EntityManager,
	) {
		const request = await this.accessRequestRepository.updateStatus(
			id,
			'approved',
			reviewer.id,
			reviewComment,
			entityManager,
		);

		if (!request) {
			return request;
		}

		const em = entityManager ?? this.policyRepository.manager;

		// Get categories for the node type to find category-based policies
		const categoryAssignments = await this.categoryAssignmentRepository.findByNodeTypes(
			[request.nodeType],
			entityManager,
		);
		const categorySlugs = categoryAssignments.map((a) => a.category.slug);

		// Find all project-scoped BLOCK policies that match this node
		const projectPolicies = await this.policyRepository.findByProjectIds(
			[request.projectId],
			entityManager,
		);

		const conflictingBlockPolicies: NodeGovernancePolicy[] = [];
		for (const policy of projectPolicies) {
			if (policy.policyType !== 'block' || policy.scope !== 'projects') {
				continue;
			}

			// Check if policy matches the node (by node type or category)
			const matchesNode = policy.targetType === 'node' && policy.targetValue === request.nodeType;
			const matchesCategory =
				policy.targetType === 'category' && categorySlugs.includes(policy.targetValue);

			if (matchesNode || matchesCategory) {
				// Check if this policy is assigned to the request's project
				const isAssignedToProject = policy.projectAssignments?.some(
					(a) => a.projectId === request.projectId,
				);
				if (isAssignedToProject) {
					conflictingBlockPolicies.push(policy);
				}
			}
		}

		// Delete or update conflicting project-level BLOCK policies
		for (const policy of conflictingBlockPolicies) {
			const assignments = await this.policyProjectAssignmentRepository.findByPolicyId(
				policy.id,
				entityManager,
			);

			// If policy is only assigned to this project, delete the entire policy
			if (assignments.length === 1 && assignments[0].projectId === request.projectId) {
				await em.delete('NodeGovernancePolicy', { id: policy.id });
			} else {
				// If policy is assigned to multiple projects, just remove this project's assignment
				await em.delete('PolicyProjectAssignment', {
					policyId: policy.id,
					projectId: request.projectId,
				});
			}
		}

		// If a policy ID is provided, attach the request's project to that policy
		if (policyId) {
			const policy = await this.policyRepository.findOne({
				where: { id: policyId },
				relations: ['projectAssignments'],
			});

			if (!policy) {
				throw new NotFoundError(`Policy with ID ${policyId} not found`);
			}

			// Verify it's an allow policy
			if (policy.policyType !== 'allow') {
				throw new BadRequestError('Only allow policies can be attached to approved requests');
			}

			// If policy is project-scoped, add the request's project to its assignments
			if (policy.scope === 'projects') {
				const existingAssignments = await this.policyProjectAssignmentRepository.findByPolicyId(
					policyId,
					entityManager,
				);
				const existingProjectIds = existingAssignments.map((a) => a.projectId);

				// Only add if not already assigned
				if (!existingProjectIds.includes(request.projectId)) {
					await this.policyProjectAssignmentRepository.createAssignments(
						policyId,
						[request.projectId],
						entityManager,
					);
				}
			}
			// If policy is global, it already applies to all projects, no changes needed

			// If the policy targets a category, assign the node to that category
			if (policy.targetType === 'category') {
				// Find the category by slug (targetValue)
				const category = await this.categoryRepository.findOne({
					where: { slug: policy.targetValue },
				});

				if (category) {
					// Check if node is already assigned to this category
					const existingCategoryAssignment = await this.categoryAssignmentRepository.findByNodeType(
						request.nodeType,
						entityManager,
					);
					const alreadyAssigned = existingCategoryAssignment.some(
						(a) => a.categoryId === category.id,
					);

					if (!alreadyAssigned) {
						await this.categoryAssignmentRepository.createAssignment(
							{
								categoryId: category.id,
								nodeType: request.nodeType,
								assignedById: reviewer.id,
							},
							entityManager,
						);
					}
				}
			}
		} else {
			// No policy ID provided, create a new allow policy for this node in the project
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

	// === Workflow Validation ===

	/**
	 * Validates workflow nodes against governance policies
	 * Returns information about blocked nodes in the workflow
	 */
	async validateWorkflowNodes(
		nodes: Array<{ type: string; name?: string }>,
		projectId: string,
		userId: string,
		entityManager?: EntityManager,
	): Promise<{
		blockedNodes: Array<{ nodeType: string; nodeName?: string; governance: GovernanceStatus }>;
		hasBlockedNodes: boolean;
	}> {
		if (nodes.length === 0) {
			return { blockedNodes: [], hasBlockedNodes: false };
		}

		const nodeTypes = nodes.map((node) => node.type);
		const governanceMap = await this.getGovernanceForNodes(
			nodeTypes,
			projectId,
			userId,
			entityManager,
		);

		const blockedNodes: Array<{
			nodeType: string;
			nodeName?: string;
			governance: GovernanceStatus;
		}> = [];

		for (const node of nodes) {
			const governance = governanceMap.get(node.type);
			if (governance?.status === 'blocked') {
				blockedNodes.push({
					nodeType: node.type,
					nodeName: node.name,
					governance,
				});
			}
		}

		return {
			blockedNodes,
			hasBlockedNodes: blockedNodes.length > 0,
		};
	}
}
