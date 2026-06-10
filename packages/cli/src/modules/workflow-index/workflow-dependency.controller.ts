import { GetResourceDependenciesDto, GetResourceDependencyCountsDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { WorkflowDependencyQueryService } from './workflow-dependency-query.service';

@RestController('/workflow-dependencies')
export class WorkflowDependencyController {
	constructor(private readonly workflowDependencyQueryService: WorkflowDependencyQueryService) {}

	@Post('/counts')
	async getResourceDependencyCounts(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: GetResourceDependencyCountsDto,
	) {
		return await this.workflowDependencyQueryService.getDependencyCounts(
			body.resourceIds,
			body.resourceType,
			req.user,
		);
	}

	@Post('/details')
	async getResourceDependencies(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: GetResourceDependenciesDto,
	) {
		return await this.workflowDependencyQueryService.getResourceDependencies(
			body.resourceIds,
			body.resourceType,
			req.user,
		);
	}
}
