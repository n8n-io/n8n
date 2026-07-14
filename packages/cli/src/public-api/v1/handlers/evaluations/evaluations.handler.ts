import type { TestRunCancelDto, TestRunDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { TestCaseExecutionRepository, TestRunRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PaymentRequiredError } from '@/errors/response-errors/payment-required.error';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { toTestCaseExecutionDto, toTestRunSummaryDto } from './evaluations.mapper';
import type { TestRunRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	projectScope,
	publicApiScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type EvaluationsHandlers = {
	getTestRuns: PublicAPIEndpoint<TestRunRequest.GetMany>;
	getTestRun: PublicAPIEndpoint<TestRunRequest.GetOne>;
	getTestCases: PublicAPIEndpoint<TestRunRequest.GetCases>;
	createTestRun: PublicAPIEndpoint<TestRunRequest.Create>;
	cancelTestRun: PublicAPIEndpoint<TestRunRequest.Cancel>;
};

// The quota doubles as the feature flag: 0 = disabled. Cheap in-memory gate.
function assertEvaluationsEnabled() {
	if (Container.get(LicenseState).getMaxWorkflowsWithEvaluations() === 0) {
		throw new ForbiddenError('Evaluations are not available on your plan');
	}
}

/**
 * Quota: at most N distinct workflows may have test runs (`-1` = unlimited); a
 * workflow that already has runs re-runs freely. Assumes evaluations are enabled
 * (checked separately), so exhausting the quota is 402 (upgrade), not 403.
 */
async function assertEvaluationQuotaAvailable(workflowId: string) {
	const limit = Container.get(LicenseState).getMaxWorkflowsWithEvaluations();
	if (limit === UNLIMITED_LICENSE_QUOTA) return;

	// Re-running an already-counted workflow never consumes a new slot.
	const alreadyCounts = (await Container.get(TestRunRepository).countByWorkflowId(workflowId)) > 0;
	if (alreadyCounts) return;

	const used = await Container.get(WorkflowRepository).getWorkflowsWithEvaluationCount();
	if (used >= limit) {
		throw new PaymentRequiredError(
			`Evaluation quota exceeded: ${used}/${limit} workflows already have evaluations`,
		);
	}
}

const evaluationsHandlers: EvaluationsHandlers = {
	getTestRuns: [
		publicApiScope('testRun:list'),
		projectScope('workflow:read', 'workflow'),
		validCursor,
		async (req, res) => {
			const { id: workflowId } = req.params;
			const { offset = 0, limit = 100, status } = req.query;

			const testRunRepository = Container.get(TestRunRepository);
			const [testRuns, count] = await Promise.all([
				testRunRepository.getMany(workflowId, { skip: offset, take: limit }, status),
				testRunRepository.countByWorkflowId(workflowId, status),
			]);

			return res.json({
				data: testRuns.map(toTestRunSummaryDto),
				nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
			});
		},
	],
	getTestRun: [
		publicApiScope('testRun:read'),
		projectScope('workflow:read', 'workflow'),
		async (req, res) => {
			const { id: workflowId, runId } = req.params;

			// Scoped lookup: a run from another workflow returns null (→ 404), so a
			// caller can't reach another workflow's runs by guessing ids.
			const summary = await Container.get(TestRunRepository).getTestRunSummaryByWorkflowId(
				runId,
				workflowId,
			);

			if (!summary) throw new NotFoundError('Test run not found');

			return res.json(
				toTestRunSummaryDto({
					...summary,
					testCaseCount: summary.testCaseExecutions?.length ?? 0,
				}),
			);
		},
	],
	getTestCases: [
		publicApiScope('testRun:read'),
		projectScope('workflow:read', 'workflow'),
		validCursor,
		async (req, res) => {
			const { id: workflowId, runId } = req.params;
			const { offset = 0, limit = 100 } = req.query;

			// Relation-free existence check so we don't load the run's (possibly
			// large) case set just to authorize before paginating.
			if (!(await Container.get(TestRunRepository).existsInWorkflow(runId, workflowId))) {
				throw new NotFoundError('Test run not found');
			}

			const testCaseExecutionRepository = Container.get(TestCaseExecutionRepository);
			const [testCases, count] = await Promise.all([
				testCaseExecutionRepository.getManyByTestRunId(runId, { skip: offset, take: limit }),
				testCaseExecutionRepository.countByTestRunId(runId),
			]);

			return res.json({
				data: testCases.map(toTestCaseExecutionDto),
				nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
			});
		},
	],
	createTestRun: [
		publicApiScope('testRun:create'),
		// Starting a run triggers real executions — require workflow:execute.
		projectScope('workflow:execute', 'workflow'),
		async (req, res) => {
			const { id: workflowId } = req.params;
			const testRunnerService = Container.get(TestRunnerService);

			assertEvaluationsEnabled();

			// Reject a workflow with no evaluation trigger up-front (409). Deeper
			// validation still happens async in the run, matching the internal path.
			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
				workflowId,
				req.user,
				['workflow:execute'],
			);
			if (!workflow) throw new NotFoundError('Workflow not found');

			const hasTrigger = workflow.nodes.some((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE);
			if (!hasTrigger) {
				throw new ConflictError('Workflow has no evaluation trigger');
			}

			// Count query runs last, after the cheaper 403/404/409 checks.
			await assertEvaluationQuotaAvailable(workflowId);

			// Case execution runs detached; guard `finished` so an unexpected
			// rejection isn't left unhandled (the server has no global handler).
			const { testRun, finished } = await testRunnerService.startTestRun(req.user, workflowId, 1, {
				via: 'public-api',
			});
			void finished.catch((error) => Container.get(ErrorReporter).error(error));

			const body: TestRunDto = {
				id: testRun.id,
				status: testRun.status,
				createdAt: testRun.createdAt.toISOString(),
			};
			return res.status(201).json(body);
		},
	],
	cancelTestRun: [
		publicApiScope('testRun:cancel'),
		// Cancelling mutates execution state — require workflow:execute.
		projectScope('workflow:execute', 'workflow'),
		async (req, res) => {
			const { id: workflowId, runId } = req.params;

			assertEvaluationsEnabled();

			// Scoped lookup: a run from another workflow returns null (→ 404), so a
			// caller can't reach another workflow's runs by guessing ids.
			const testRunnerService = Container.get(TestRunnerService);
			const testRun = await Container.get(TestRunRepository).findOne({
				where: { id: runId, workflow: { id: workflowId } },
			});
			if (!testRun) throw new NotFoundError('Test run not found');

			// `canBeCancelled` returns true when the run is in a terminal state.
			if (testRunnerService.canBeCancelled(testRun)) {
				throw new ConflictError(`The test run "${runId}" cannot be cancelled`);
			}

			await testRunnerService.cancelTestRun(runId);

			const body: TestRunCancelDto = { id: runId, status: 'cancelled' };
			return res.status(202).json(body);
		},
	],
};

export = evaluationsHandlers;
