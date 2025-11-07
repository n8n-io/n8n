import { TestCaseExecutionRepository, TestRunRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Delete, Get, Post, RestController } from '@n8n/decorators';
import express from 'express';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NotImplementedError } from '@/errors/response-errors/not-implemented.error';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsRequest } from '@/evaluation.ee/test-runs.types.ee';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@RestController('/workflows')
export class TestRunsController {
	constructor(
		private readonly testRunRepository: TestRunRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly testCaseExecutionRepository: TestCaseExecutionRepository,
		private readonly testRunnerService: TestRunnerService,
		private readonly instanceSettings: InstanceSettings,
		private readonly telemetry: Telemetry,
	) {}

	/**
	 * Get the test run (or just check that it exists and the user has access to it)
	 */
	private async getTestRun(testRunId: string, workflowId: string, user: User) {
		const sharedWorkflowsIds = await getSharedWorkflowIds(user, ['workflow:read']);

		if (!sharedWorkflowsIds.includes(workflowId)) {
			throw new NotFoundError('Test run not found');
		}

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

		try {
			await this.getTestRun(req.params.id, req.params.workflowId, req.user); // FIXME: do not fetch test run twice
			return await this.testRunRepository.getTestRunSummaryById(id);
		} catch (error) {
			if (error instanceof UnexpectedError) throw new NotFoundError(error.message);
			throw error;
		}
	}

	@Get('/:workflowId/test-runs/:id/test-cases')
	async getTestCases(req: TestRunsRequest.GetCases) {
		await this.getTestRun(req.params.id, req.params.workflowId, req.user);

		return await this.testCaseExecutionRepository.find({
			where: { testRun: { id: req.params.id } },
		});
	}

	@Delete('/:workflowId/test-runs/:id')
	async delete(req: TestRunsRequest.Delete) {
		const { id: testRunId } = req.params;

		// Check test run exist
		await this.getTestRun(req.params.id, req.params.workflowId, req.user);

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
		const testRun = await this.getTestRun(req.params.id, req.params.workflowId, req.user);

		if (this.testRunnerService.canBeCancelled(testRun)) {
			const message = `The test run "${testRunId}" cannot be cancelled`;
			throw new ConflictError(message);
		}

		await this.testRunnerService.cancelTestRun(testRunId);

		res.status(202).json({ success: true });
	}

	@Post('/:workflowId/test-runs/new')
	async create(req: TestRunsRequest.Create, res: express.Response) {
		const { workflowId } = req.params;

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:read',
		]);

		if (!workflow) {
			// user trying to access a workflow they do not own
			// and was not shared to them
			// Or does not exist.
			return res.status(404).json({ message: 'Not Found' });
		}

		// We do not await for the test run to complete
		void this.testRunnerService.runTest(req.user, workflow.id);

		return res.status(202).json({ success: true });
	}
}
