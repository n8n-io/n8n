import { EVAL_PARALLEL_EXECUTION_FLAG, StartTestRunRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TestCaseExecutionRepository, TestRunRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Body, Delete, Get, Post, RestController } from '@n8n/decorators';
import { type Scope } from '@n8n/permissions';
import express from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { TestRunsRequest } from '@/evaluation.ee/test-runs.types.ee';
import { listQueryMiddleware } from '@/middlewares';
import { PostHogClient } from '@/posthog';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@RestController('/workflows')
export class TestRunsController {
	constructor(
		private readonly testRunRepository: TestRunRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly testCaseExecutionRepository: TestCaseExecutionRepository,
		private readonly testRunnerService: TestRunnerService,
		private readonly telemetry: Telemetry,
		private readonly postHogClient: PostHogClient,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolves the parallel-execution rollout flag for a user, defaulting to
	 * `false` (sequential) on any PostHog failure. Fail-open semantics: a
	 * PostHog outage degrades the rollout cohort to the legacy sequential
	 * behaviour rather than 500ing the test-run start.
	 */
	private async isParallelExecutionFlagEnabled(user: User): Promise<boolean> {
		try {
			const flags = await this.postHogClient.getFeatureFlags(user);
			return flags?.[EVAL_PARALLEL_EXECUTION_FLAG] === true;
		} catch (error) {
			this.logger.warn('Failed to resolve eval parallel-execution flag', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	private async assertUserHasAccessToWorkflow(
		workflowId: string,
		user: User,
		scopes: Scope[] = ['workflow:read'],
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, scopes);

		if (!workflow) {
			throw new NotFoundError('Workflow not found');
		}
	}

	/**
	 * Get the test run (or just check that it exists and the user has access to it).
	 *
	 * The lookup is scoped to the route's `workflowId` so a user with access
	 * to one workflow cannot reach another workflow's run by guessing IDs —
	 * absent or cross-workflow runs return the same 404.
	 *
	 * `scopes` defaults to `workflow:read`. Mutating endpoints should pass a
	 * stronger scope (e.g. `workflow:execute`) so a read-only user cannot
	 * trigger state changes through this controller.
	 */
	private async getTestRun(
		testRunId: string,
		workflowId: string,
		user: User,
		scopes: Scope[] = ['workflow:read'],
	) {
		await this.assertUserHasAccessToWorkflow(workflowId, user, scopes);

		const testRun = await this.testRunRepository.findOne({
			where: { id: testRunId, workflow: { id: workflowId } },
		});

		if (!testRun) throw new NotFoundError('Test run not found');

		return testRun;
	}

	@Get('/:workflowId/test-runs', { middlewares: listQueryMiddleware })
	async getMany(req: TestRunsRequest.GetMany) {
		const { workflowId } = req.params;

		await this.assertUserHasAccessToWorkflow(workflowId, req.user);

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

	@Post('/:workflowId/test-runs/:id/test-cases/:caseId/cancel')
	async cancelCase(req: TestRunsRequest.CancelCase) {
		const { caseId } = req.params;

		// Confirm the run exists + access first; this also surfaces 404 for an
		// invalid runId before we touch the case row. Requires
		// `workflow:execute` (not just `workflow:read`) because cancelling a
		// pending case mutates execution state — a read-only user must not be
		// able to reach this path. Cross-workflow / no-access lookups still
		// return 404 (same response shape as missing runs) so existence isn't
		// leaked.
		await this.getTestRun(req.params.id, req.params.workflowId, req.user, ['workflow:execute']);

		const cancelled = await this.testCaseExecutionRepository.cancelIfNew(req.params.id, caseId);
		if (!cancelled) {
			throw new ConflictError(
				`Test case "${caseId}" cannot be cancelled — it is not in a pending state`,
			);
		}

		this.telemetry.track('User cancelled a test case', {
			run_id: req.params.id,
			case_id: caseId,
		});

		return { success: true };
	}

	@Post('/:workflowId/test-runs/new')
	async create(
		req: TestRunsRequest.Create,
		res: express.Response,
		@Body payload: StartTestRunRequestDto,
	) {
		const { workflowId } = req.params;

		await this.assertUserHasAccessToWorkflow(workflowId, req.user);

		// Resolve the rollout flag for this user. Cached 10 min by PostHogClient
		// so the hot path is one outbound call per user per 10-min window at
		// most. Flag-off users are silently coerced to sequential — no error,
		// no flag-id in the response — so the cohort wall is invisible to
		// direct API callers and stale tabs. Fail-open on PostHog errors.
		const flagEnabledForUser = await this.isParallelExecutionFlagEnabled(req.user);

		const requestedConcurrency = payload.concurrency ?? 1;
		const concurrency = flagEnabledForUser ? requestedConcurrency : 1;

		// Await the synchronous setup (workflow find + test-run row insert) so
		// the response carries the new `testRunId` and the FE can route to the
		// detail view without polling. The actual case-by-case execution is
		// detached inside `startTestRun` and exposed as `finished`, which we
		// intentionally discard here — fire-and-forget for the long-running
		// part is preserved.
		const { testRun } = await this.testRunnerService.startTestRun(
			req.user,
			workflowId,
			concurrency,
			flagEnabledForUser,
		);

		res.status(202).json({ success: true, testRunId: testRun.id });
	}
}
