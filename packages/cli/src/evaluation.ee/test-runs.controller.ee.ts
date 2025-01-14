import express from 'express';
import { InstanceSettings } from 'n8n-core';

import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { Delete, Get, Post, RestController } from '@/decorators';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NotImplementedError } from '@/errors/response-errors/not-implemented.error';
import { TestRunsRequest } from '@/evaluation.ee/test-definitions.types.ee';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';

import { TestDefinitionService } from './test-definition.service.ee';

@RestController('/evaluation/test-definitions')
export class TestRunsController {
	constructor(
		private readonly testDefinitionService: TestDefinitionService,
		private readonly testRunRepository: TestRunRepository,
		private readonly testRunnerService: TestRunnerService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * This method is used in multiple places in the controller to get the test definition
	 * (or just check that it exists and the user has access to it).
	 */
	private async getTestDefinition(
		req: TestRunsRequest.GetOne | TestRunsRequest.GetMany | TestRunsRequest.Delete,
	) {
		const { testDefinitionId } = req.params;

		const userAccessibleWorkflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		const testDefinition = await this.testDefinitionService.findOne(
			testDefinitionId,
			userAccessibleWorkflowIds,
		);

		if (!testDefinition) throw new NotFoundError('Test definition not found');

		return testDefinition;
	}

	/**
	 * Get the test run (or just check that it exists and the user has access to it)
	 */
	private async getTestRun(
		req: TestRunsRequest.GetOne | TestRunsRequest.Delete | TestRunsRequest.Cancel,
	) {
		const { id: testRunId, testDefinitionId } = req.params;

		const testRun = await this.testRunRepository.findOne({
			where: { id: testRunId, testDefinition: { id: testDefinitionId } },
		});

		if (!testRun) throw new NotFoundError('Test run not found');

		return testRun;
	}

	@Get('/:testDefinitionId/runs', { middlewares: listQueryMiddleware })
	async getMany(req: TestRunsRequest.GetMany) {
		const { testDefinitionId } = req.params;

		await this.getTestDefinition(req);

		return await this.testRunRepository.getMany(testDefinitionId, req.listQueryOptions);
	}

	@Get('/:testDefinitionId/runs/:id')
	async getOne(req: TestRunsRequest.GetOne) {
		await this.getTestDefinition(req);

		return await this.getTestRun(req);
	}

	@Delete('/:testDefinitionId/runs/:id')
	async delete(req: TestRunsRequest.Delete) {
		const { id: testRunId } = req.params;

		// Check test definition and test run exist
		await this.getTestDefinition(req);
		await this.getTestRun(req);

		await this.testRunRepository.delete({ id: testRunId });

		return { success: true };
	}

	@Post('/:testDefinitionId/runs/:id/cancel')
	async cancel(req: TestRunsRequest.Cancel, res: express.Response) {
		if (this.instanceSettings.isMultiMain) {
			throw new NotImplementedError('Cancelling test runs is not yet supported in multi-main mode');
		}

		const { id: testRunId } = req.params;

		// Check test definition and test run exist
		await this.getTestDefinition(req);
		const testRun = await this.getTestRun(req);

		if (this.testRunnerService.canBeCancelled(testRun)) {
			const message = `The test run "${testRunId}" cannot be cancelled`;
			throw new ConflictError(message);
		}

		await this.testRunnerService.cancelTestRun(testRunId);

		res.status(202).json({ success: true });
	}
}
