import { GetResourceDependenciesDto, GetResourceDependencyCountsDto } from '@n8n/api-types';
import { WorkflowsConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

import { WorkflowDependencyQueryService } from './workflow-dependency-query.service';

@RestController('/workflow-dependencies')
export class WorkflowDependencyController {
	constructor(
		private readonly workflowDependencyQueryService: WorkflowDependencyQueryService,
		private readonly workflowsConfig: WorkflowsConfig,
	) {}

	@Post('/counts')
	async getResourceDependencyCounts(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: GetResourceDependencyCountsDto,
	) {
		this.assertIndexingEnabled();

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
		this.assertIndexingEnabled();

		return await this.workflowDependencyQueryService.getResourceDependencies(
			body.resourceIds,
			body.resourceType,
			req.user,
		);
	}

	private assertIndexingEnabled() {
		if (!this.workflowsConfig.indexingEnabled) {
			throw new ServiceUnavailableError('Workflow dependency indexing is not enabled');
		}
	}
}
