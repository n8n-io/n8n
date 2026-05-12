import { upsertEvaluationConfigSchema } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Delete, Get, Post, Put, RestController } from '@n8n/decorators';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EvaluationConfigService } from './evaluation-config.service';

type WorkflowParam = { workflowId: string };
type ConfigParam = { workflowId: string; configId: string };

@RestController('/workflows')
export class EvaluationConfigController {
	constructor(
		private readonly service: EvaluationConfigService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	private async assertWorkflowAccess(
		workflowId: string,
		user: User,
		scope: 'workflow:read' | 'workflow:update',
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			scope,
		]);
		if (!workflow) throw new NotFoundError('Workflow not found');
		return workflow;
	}

	@Get('/:workflowId/evaluation-configs')
	async list(req: AuthenticatedRequest<WorkflowParam>) {
		await this.assertWorkflowAccess(req.params.workflowId, req.user, 'workflow:read');
		return await this.service.list(req.params.workflowId);
	}

	@Get('/:workflowId/evaluation-configs/:configId')
	async get(req: AuthenticatedRequest<ConfigParam>) {
		await this.assertWorkflowAccess(req.params.workflowId, req.user, 'workflow:read');
		const config = await this.service.get(req.params.workflowId, req.params.configId);
		if (!config) throw new NotFoundError('Evaluation config not found');
		return config;
	}

	@Post('/:workflowId/evaluation-configs')
	async create(req: AuthenticatedRequest<WorkflowParam>) {
		const workflow = await this.assertWorkflowAccess(
			req.params.workflowId,
			req.user,
			'workflow:update',
		);
		const dto = upsertEvaluationConfigSchema.parse(req.body);
		return await this.service.create(req.params.workflowId, workflow, req.user, dto);
	}

	@Put('/:workflowId/evaluation-configs/:configId')
	async update(req: AuthenticatedRequest<ConfigParam>) {
		const workflow = await this.assertWorkflowAccess(
			req.params.workflowId,
			req.user,
			'workflow:update',
		);
		const dto = upsertEvaluationConfigSchema.parse(req.body);
		return await this.service.update(
			req.params.workflowId,
			req.params.configId,
			workflow,
			req.user,
			dto,
		);
	}

	@Delete('/:workflowId/evaluation-configs/:configId')
	async delete(req: AuthenticatedRequest<ConfigParam>) {
		await this.assertWorkflowAccess(req.params.workflowId, req.user, 'workflow:update');
		await this.service.delete(req.params.workflowId, req.params.configId);
		return { success: true };
	}
}
