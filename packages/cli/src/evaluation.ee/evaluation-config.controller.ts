import { upsertEvaluationConfigSchema } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { TestRunRepository } from '@n8n/db';
import { Delete, Get, Post, Put, RestController } from '@n8n/decorators';
import express from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EvaluationConfigValidator } from '@/evaluation.ee/evaluation-config-validator';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { WorkflowCompilerService } from '@/evaluation.ee/test-runner/workflow-compiler.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EvaluationConfigService } from './evaluation-config.service';

type WorkflowParam = { workflowId: string };
type ConfigParam = { workflowId: string; configId: string };

@RestController('/workflows')
export class EvaluationConfigController {
	constructor(
		private readonly service: EvaluationConfigService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly testRunRepository: TestRunRepository,
		private readonly testRunnerService: TestRunnerService,
		private readonly validator: EvaluationConfigValidator,
		private readonly compiler: WorkflowCompilerService,
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

	@Post('/:workflowId/evaluation-configs/:configId/test-runs')
	async dispatch(req: AuthenticatedRequest<ConfigParam>, res: express.Response) {
		const { workflowId, configId } = req.params;

		const workflow = await this.assertWorkflowAccess(workflowId, req.user, 'workflow:update');

		const config = await this.service.get(workflowId, configId);
		if (!config) throw new NotFoundError('Evaluation config not found');
		if (config.status === 'invalid') {
			throw new ConflictError(
				`Configuration is invalid${config.invalidReason ? `: ${config.invalidReason}` : ''}`,
			);
		}

		// Re-validate at dispatch — the workflow may have drifted since the config was saved.
		const errors = await this.validator.validate({ workflow, config, user: req.user });
		if (errors.length > 0) {
			const first = errors[0];
			throw new BadRequestError(`${first.code}: ${first.message}`);
		}

		let compiledWorkflow;
		try {
			compiledWorkflow = this.compiler.compile(workflow, config);
		} catch (error) {
			throw new BadRequestError(
				`COMPILATION_FAILED: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		const testRun = await this.testRunRepository.createTestRun(workflowId);

		void this.testRunnerService.runTest(req.user, workflowId, 1, false, {
			existingTestRunId: testRun.id,
			compiledWorkflow,
		});

		res.status(202).json({ testRunId: testRun.id });
	}
}
