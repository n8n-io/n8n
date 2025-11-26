import { WorkflowDependencyRepository, WorkflowRepository, CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export interface DependencyGraphNode {
	id: string;
	name: string;
	type: 'workflow' | 'credential';
	active?: boolean;
}

export interface DependencyGraphEdge {
	source: string;
	target: string;
	type: 'uses_credential' | 'calls_workflow';
	label?: string;
}

export interface DependencyGraph {
	nodes: DependencyGraphNode[];
	edges: DependencyGraphEdge[];
}

export interface WorkflowDependencyInfo {
	workflowId: string;
	workflowName: string;
	dependencies: {
		credentials: Array<{
			id: string;
			name: string | null;
			type: string | null;
		}>;
		nodeTypes: Array<{
			type: string;
			count: number;
		}>;
		calledWorkflows: Array<{
			id: string;
			name: string | null;
		}>;
		webhookPaths: string[];
	};
	dependents: {
		calledByWorkflows: Array<{
			id: string;
			name: string;
		}>;
	};
}

export interface CredentialUsageInfo {
	credentialId: string;
	credentialName: string;
	credentialType: string;
	usedByWorkflows: Array<{
		id: string;
		name: string;
		active: boolean;
		nodeInfo: Record<string, unknown> | null;
	}>;
}

export interface ImpactAnalysis {
	resourceType: 'credential' | 'workflow';
	resourceId: string;
	resourceName: string;
	impactedWorkflows: Array<{
		id: string;
		name: string;
		active: boolean;
		impactType: 'direct' | 'indirect';
	}>;
	totalImpactedCount: number;
	activeImpactedCount: number;
}

@Service()
export class WorkflowDependencyGraphService {
	constructor(
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
	) {}

	/**
	 * Build the full dependency graph for all workflows
	 */
	async buildFullDependencyGraph(): Promise<DependencyGraph> {
		const nodes: DependencyGraphNode[] = [];
		const edges: DependencyGraphEdge[] = [];
		const nodeSet = new Set<string>();

		// Get all non-archived workflows
		const workflows = await this.workflowRepository.find({
			where: { isArchived: false },
			select: ['id', 'name', 'active'],
		});

		// Add workflow nodes
		for (const workflow of workflows) {
			const nodeId = `workflow:${workflow.id}`;
			if (!nodeSet.has(nodeId)) {
				nodeSet.add(nodeId);
				nodes.push({
					id: nodeId,
					name: workflow.name,
					type: 'workflow',
					active: workflow.active,
				});
			}
		}

		// Get all dependencies
		const dependencies = await this.workflowDependencyRepository.find();

		// Get credentials for name lookup
		const credentialIds = dependencies
			.filter((d) => d.dependencyType === 'credentialId' && d.dependencyKey)
			.map((d) => d.dependencyKey);
		const credentials =
			credentialIds.length > 0
				? await this.credentialsRepository.find({
						where: credentialIds.map((id) => ({ id })),
						select: ['id', 'name', 'type'],
					})
				: [];
		const credentialMap = new Map(credentials.map((c) => [c.id, c]));

		// Get called workflow names (excluding archived)
		const calledWorkflowIds = dependencies
			.filter((d) => d.dependencyType === 'workflowCall' && d.dependencyKey)
			.map((d) => d.dependencyKey);
		const calledWorkflows =
			calledWorkflowIds.length > 0
				? await this.workflowRepository.find({
						where: calledWorkflowIds.map((id) => ({ id, isArchived: false })),
						select: ['id', 'name', 'active'],
					})
				: [];
		const workflowMap = new Map(calledWorkflows.map((w) => [w.id, w]));

		// Build set of valid (non-archived) workflow IDs for edge filtering
		const validWorkflowIds = new Set(workflows.map((w) => w.id));

		// Process dependencies to create edges
		for (const dep of dependencies) {
			if (!dep.dependencyKey) continue;

			// Skip edges from archived workflows
			if (!validWorkflowIds.has(dep.workflowId)) continue;

			if (dep.dependencyType === 'credentialId') {
				const credential = credentialMap.get(dep.dependencyKey);
				const nodeId = `credential:${dep.dependencyKey}`;

				// Add credential node if not exists
				if (!nodeSet.has(nodeId)) {
					nodeSet.add(nodeId);
					nodes.push({
						id: nodeId,
						name: credential?.name ?? 'Unknown Credential',
						type: 'credential',
					});
				}

				// Add edge
				edges.push({
					source: `workflow:${dep.workflowId}`,
					target: nodeId,
					type: 'uses_credential',
					label: credential?.type ?? undefined,
				});
			} else if (dep.dependencyType === 'workflowCall') {
				const calledWorkflow = workflowMap.get(dep.dependencyKey);

				// Skip edges to archived workflows
				if (!calledWorkflow) continue;

				const targetNodeId = `workflow:${dep.dependencyKey}`;

				// Ensure target workflow node exists
				if (!nodeSet.has(targetNodeId)) {
					nodeSet.add(targetNodeId);
					nodes.push({
						id: targetNodeId,
						name: calledWorkflow.name,
						type: 'workflow',
						active: calledWorkflow.active,
					});
				}

				// Add edge
				edges.push({
					source: `workflow:${dep.workflowId}`,
					target: targetNodeId,
					type: 'calls_workflow',
				});
			}
		}

		return { nodes, edges };
	}

	/**
	 * Get detailed dependency information for a specific workflow
	 */
	async getWorkflowDependencies(workflowId: string): Promise<WorkflowDependencyInfo> {
		// Get workflow info
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'name'],
		});

		if (!workflow) {
			throw new Error(`Workflow ${workflowId} not found`);
		}

		// Get all dependencies for this workflow
		const dependencies = await this.workflowDependencyRepository.find({
			where: { workflowId },
		});

		// Get workflows that call this workflow
		const dependents = await this.workflowDependencyRepository.find({
			where: {
				dependencyType: 'workflowCall',
				dependencyKey: workflowId,
			},
		});

		// Categorize dependencies
		const credentialDeps = dependencies.filter((d) => d.dependencyType === 'credentialId');
		const nodeTypeDeps = dependencies.filter((d) => d.dependencyType === 'nodeType');
		const workflowCallDeps = dependencies.filter((d) => d.dependencyType === 'workflowCall');
		const webhookDeps = dependencies.filter((d) => d.dependencyType === 'webhookPath');

		// Get credential details
		const credentialIds = credentialDeps.filter((d) => d.dependencyKey).map((d) => d.dependencyKey);
		const credentials =
			credentialIds.length > 0
				? await this.credentialsRepository.find({
						where: credentialIds.map((id) => ({ id })),
						select: ['id', 'name', 'type'],
					})
				: [];
		const credentialMap = new Map(credentials.map((c) => [c.id, c]));

		// Get called workflow details
		const calledWorkflowIds = workflowCallDeps
			.filter((d) => d.dependencyKey)
			.map((d) => d.dependencyKey);
		const calledWorkflows =
			calledWorkflowIds.length > 0
				? await this.workflowRepository.find({
						where: calledWorkflowIds.map((id) => ({ id })),
						select: ['id', 'name'],
					})
				: [];
		const calledWorkflowMap = new Map(calledWorkflows.map((w) => [w.id, w]));

		// Get dependent workflow details
		const dependentWorkflowIds = dependents.map((d) => d.workflowId);
		const dependentWorkflows =
			dependentWorkflowIds.length > 0
				? await this.workflowRepository.find({
						where: dependentWorkflowIds.map((id) => ({ id })),
						select: ['id', 'name'],
					})
				: [];
		const dependentWorkflowMap = new Map(dependentWorkflows.map((w) => [w.id, w]));

		// Count node types
		const nodeTypeCounts = new Map<string, number>();
		for (const dep of nodeTypeDeps) {
			if (dep.dependencyKey) {
				const count = nodeTypeCounts.get(dep.dependencyKey) ?? 0;
				nodeTypeCounts.set(dep.dependencyKey, count + 1);
			}
		}

		return {
			workflowId: workflow.id,
			workflowName: workflow.name,
			dependencies: {
				credentials: credentialDeps
					.filter((d) => d.dependencyKey)
					.map((d) => {
						const cred = credentialMap.get(d.dependencyKey);
						return {
							id: d.dependencyKey,
							name: cred?.name ?? null,
							type: cred?.type ?? null,
						};
					}),
				nodeTypes: Array.from(nodeTypeCounts.entries()).map(([type, count]) => ({
					type,
					count,
				})),
				calledWorkflows: workflowCallDeps
					.filter((d) => d.dependencyKey)
					.map((d) => ({
						id: d.dependencyKey,
						name: calledWorkflowMap.get(d.dependencyKey)?.name ?? null,
					})),
				webhookPaths: webhookDeps.filter((d) => d.dependencyKey).map((d) => d.dependencyKey),
			},
			dependents: {
				calledByWorkflows: dependents.map((d) => ({
					id: d.workflowId,
					name: dependentWorkflowMap.get(d.workflowId)?.name ?? 'Unknown',
				})),
			},
		};
	}

	/**
	 * Get all workflows that use a specific credential
	 */
	async getCredentialUsage(credentialId: string): Promise<CredentialUsageInfo> {
		// Get credential info
		const credential = await this.credentialsRepository.findOne({
			where: { id: credentialId },
			select: ['id', 'name', 'type'],
		});

		if (!credential) {
			throw new Error(`Credential ${credentialId} not found`);
		}

		// Find all workflows using this credential
		const dependencies = await this.workflowDependencyRepository.find({
			where: {
				dependencyType: 'credentialId',
				dependencyKey: credentialId,
			},
		});

		// Get workflow details
		const workflowIds = dependencies.map((d) => d.workflowId);
		const workflows =
			workflowIds.length > 0
				? await this.workflowRepository.find({
						where: workflowIds.map((id) => ({ id })),
						select: ['id', 'name', 'active'],
					})
				: [];
		const workflowMap = new Map(workflows.map((w) => [w.id, w]));

		return {
			credentialId: credential.id,
			credentialName: credential.name,
			credentialType: credential.type,
			usedByWorkflows: dependencies.map((d) => {
				const workflow = workflowMap.get(d.workflowId);
				return {
					id: d.workflowId,
					name: workflow?.name ?? 'Unknown',
					active: workflow?.active ?? false,
					nodeInfo: d.dependencyInfo,
				};
			}),
		};
	}

	/**
	 * Analyze the impact of deleting a resource
	 */
	async analyzeImpact(
		resourceType: 'credential' | 'workflow',
		resourceId: string,
	): Promise<ImpactAnalysis> {
		const impactedWorkflows: ImpactAnalysis['impactedWorkflows'] = [];
		let resourceName = 'Unknown';

		if (resourceType === 'credential') {
			// Get credential info
			const credential = await this.credentialsRepository.findOne({
				where: { id: resourceId },
				select: ['id', 'name'],
			});
			resourceName = credential?.name ?? 'Unknown Credential';

			// Find workflows using this credential
			const dependencies = await this.workflowDependencyRepository.find({
				where: {
					dependencyType: 'credentialId',
					dependencyKey: resourceId,
				},
			});

			const workflowIds = dependencies.map((d) => d.workflowId);
			if (workflowIds.length > 0) {
				const workflows = await this.workflowRepository.find({
					where: workflowIds.map((id) => ({ id })),
					select: ['id', 'name', 'active'],
				});

				for (const workflow of workflows) {
					impactedWorkflows.push({
						id: workflow.id,
						name: workflow.name,
						active: workflow.active,
						impactType: 'direct',
					});
				}
			}
		} else {
			// resourceType === 'workflow'
			// Get workflow info
			const workflow = await this.workflowRepository.findOne({
				where: { id: resourceId },
				select: ['id', 'name'],
			});
			resourceName = workflow?.name ?? 'Unknown Workflow';

			// Find workflows that call this workflow (direct dependents)
			const directDependents = await this.workflowDependencyRepository.find({
				where: {
					dependencyType: 'workflowCall',
					dependencyKey: resourceId,
				},
			});

			const directWorkflowIds = directDependents.map((d) => d.workflowId);
			if (directWorkflowIds.length > 0) {
				const workflows = await this.workflowRepository.find({
					where: directWorkflowIds.map((id) => ({ id })),
					select: ['id', 'name', 'active'],
				});

				for (const wf of workflows) {
					impactedWorkflows.push({
						id: wf.id,
						name: wf.name,
						active: wf.active,
						impactType: 'direct',
					});
				}

				// Find indirect dependents (workflows that call the direct dependents)
				const indirectDependents = await this.workflowDependencyRepository.find({
					where: directWorkflowIds.map((id) => ({
						dependencyType: 'workflowCall',
						dependencyKey: id,
					})),
				});

				const indirectWorkflowIds = indirectDependents
					.map((d) => d.workflowId)
					.filter((id) => !directWorkflowIds.includes(id) && id !== resourceId);

				if (indirectWorkflowIds.length > 0) {
					const indirectWorkflows = await this.workflowRepository.find({
						where: indirectWorkflowIds.map((id) => ({ id })),
						select: ['id', 'name', 'active'],
					});

					for (const wf of indirectWorkflows) {
						impactedWorkflows.push({
							id: wf.id,
							name: wf.name,
							active: wf.active,
							impactType: 'indirect',
						});
					}
				}
			}
		}

		return {
			resourceType,
			resourceId,
			resourceName,
			impactedWorkflows,
			totalImpactedCount: impactedWorkflows.length,
			activeImpactedCount: impactedWorkflows.filter((w) => w.active).length,
		};
	}
}
