import express from 'express';
import { InstanceSettings } from 'n8n-core';

import { TestCaseExecutionRepository } from '@/databases/repositories/test-case-execution.repository.ee';
import { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import { Delete, Get, Post, RestController } from '@/decorators';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NotImplementedError } from '@/errors/response-errors/not-implemented.error';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsRequest } from '@/evaluation.ee/test-runs.types.ee';
import { listQueryMiddleware } from '@/middlewares';
import { Telemetry } from '@/telemetry';

@RestController('/workflows')
export class TestRunsController {
	constructor(
		private readonly testRunRepository: TestRunRepository,
		private readonly testCaseExecutionRepository: TestCaseExecutionRepository,
		private readonly testRunnerService: TestRunnerService,
		private readonly instanceSettings: InstanceSettings,
		private readonly telemetry: Telemetry,
	) {}

	/**
	 * Get the test run (or just check that it exists and the user has access to it)
	 */
	private async getTestRun(
		req: TestRunsRequest.GetOne | TestRunsRequest.Delete | TestRunsRequest.Cancel,
	) {
		const { id: testRunId } = req.params;

		const testRun = await this.testRunRepository.findOne({
			where: { id: testRunId },
		});

		if (!testRun) throw new NotFoundError('Test run not found');

		return testRun;
	}

	@Get('/:workflowId/test-runs', { middlewares: listQueryMiddleware })
	async getMany(req: TestRunsRequest.GetMany) {
		const { workflowId } = req.params;

		return await this.testRunRepository.getMany(workflowId, req.listQueryOptions);
	}

	@Get('/:workflowId/test-runs/:id')
	async getOne(req: TestRunsRequest.GetOne) {
		const { id } = req.params;

		return await this.testRunRepository.getTestRunSummaryById(id);
	}

	@Get('/:workflowId/test-runs/:id/cases')
	async getTestCases(req: TestRunsRequest.GetCases) {
		await this.getTestRun(req);

		return await this.testCaseExecutionRepository.find({
			where: { testRun: { id: req.params.id } },
		});
	}

	@Delete('/:workflowId/test-runs/:id')
	async delete(req: TestRunsRequest.Delete) {
		const { id: testRunId } = req.params;

		// Check test run exist
		await this.getTestRun(req);

		await this.testRunRepository.delete({ id: testRunId });

		this.telemetry.track('User deleted a run', { run_id: testRunId });

		return { success: true };
	}

	@Post('/:workflowId/test-runs/:id/cancel')
	async cancel(req: TestRunsRequest.Cancel, res: express.Response) {
		if (this.instanceSettings.isMultiMain) {
			throw new NotImplementedError('Cancelling test runs is not yet supported in multi-main mode');
		}

		const { id: testRunId } = req.params;

		// Check test definition and test run exist
		const testRun = await this.getTestRun(req);

		if (this.testRunnerService.canBeCancelled(testRun)) {
			const message = `The test run "${testRunId}" cannot be cancelled`;
			throw new ConflictError(message);
		}

		await this.testRunnerService.cancelTestRun(testRunId);

		res.status(202).json({ success: true });
	}
}
