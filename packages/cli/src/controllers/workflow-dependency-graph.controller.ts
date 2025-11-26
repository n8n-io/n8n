import { Get, RestController, GlobalScope, Param } from '@n8n/decorators';

import { WorkflowDependencyGraphService } from '@/services/workflow-dependency-graph.service';

@RestController('/dependency-graph')
export class WorkflowDependencyGraphController {
	constructor(private readonly workflowDependencyGraphService: WorkflowDependencyGraphService) {}

	/**
	 * GET /dependency-graph
	 * Returns the full dependency graph for visualization
	 */
	@Get('/')
	@GlobalScope('workflow:list')
	async getFullGraph() {
		return await this.workflowDependencyGraphService.buildFullDependencyGraph();
	}

	/**
	 * GET /dependency-graph/workflows/:id
	 * Returns detailed dependency information for a specific workflow
	 */
	@Get('/workflows/:id')
	@GlobalScope('workflow:read')
	async getWorkflowDependencies(@Param('id') workflowId: string) {
		return await this.workflowDependencyGraphService.getWorkflowDependencies(workflowId);
	}

	/**
	 * GET /dependency-graph/credentials/:id/usage
	 * Returns all workflows that use a specific credential
	 */
	@Get('/credentials/:id/usage')
	@GlobalScope('credential:read')
	async getCredentialUsage(@Param('id') credentialId: string) {
		return await this.workflowDependencyGraphService.getCredentialUsage(credentialId);
	}

	/**
	 * GET /dependency-graph/impact/:type/:id
	 * Analyzes the impact of deleting a resource
	 */
	@Get('/impact/:type/:id')
	@GlobalScope('workflow:read')
	async analyzeImpact(@Param('type') resourceType: string, @Param('id') resourceId: string) {
		if (resourceType !== 'credential' && resourceType !== 'workflow') {
			throw new Error('type must be either "credential" or "workflow"');
		}
		return await this.workflowDependencyGraphService.analyzeImpact(resourceType, resourceId);
	}
}
