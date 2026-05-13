import type { DependencyGraphResponse } from '@n8n/api-types';
import { GetResourceDependenciesDto, GetResourceDependencyCountsDto } from '@n8n/api-types';
import { WorkflowsConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

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

	@Get('/graph')
	async getDependencyGraph(req: AuthenticatedRequest): Promise<{ dot: string }> {
		this.assertIndexingEnabled();

		const dot = await this.workflowDependencyQueryService.getDependencyGraph(req.user, {
			layout: parseLayout((req.query as { layout?: unknown }).layout),
		});
		return { dot };
	}

	@Get('/graph.json')
	async getDependencyGraphJson(req: AuthenticatedRequest): Promise<DependencyGraphResponse> {
		this.assertIndexingEnabled();
		return await this.workflowDependencyQueryService.getDependencyGraphJson(req.user);
	}

	@Get('/graph.dot')
	async downloadDependencyGraph(req: AuthenticatedRequest, res: Response) {
		this.assertIndexingEnabled();

		const dot = await this.workflowDependencyQueryService.getDependencyGraph(req.user, {
			layout: parseLayout((req.query as { layout?: unknown }).layout),
		});
		res.setHeader('Content-Type', 'text/vnd.graphviz; charset=utf-8');
		res.setHeader('Content-Disposition', 'attachment; filename="workflow-dependencies.dot"');
		res.send(dot);
	}

	private assertIndexingEnabled() {
		if (!this.workflowsConfig.indexingEnabled) {
			throw new ServiceUnavailableError('Workflow dependency indexing is not enabled');
		}
	}
}

function parseLayout(value: unknown): 'lr' | 'tb' | undefined {
	return value === 'tb' || value === 'lr' ? value : undefined;
}
