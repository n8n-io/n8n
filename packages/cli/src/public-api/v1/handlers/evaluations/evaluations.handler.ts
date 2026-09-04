import type { TestRunCancelDto, TestRunDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { toTestCaseExecutionDto, toTestRunSummaryDto } from './evaluations.mapper';
import type { TestRunRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	projectScope,
	publicApiScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EvaluationTestRunService } from '@/evaluation.ee/evaluation-test-run.service';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

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

const evaluationsHandlers: EvaluationsHandlers = {
	getTestRuns: [
		publicApiScope('testRun:list'),
		projectScope('workflow:read', 'workflow'),
		validCursor,
		async (req, res) => {
			const { id: workflowId } = req.params;
			const { offset = 0, limit = 100, status } = req.query;

			const { testRuns, count } = await Container.get(EvaluationTestRunService).findManyAndCount(
				workflowId,
				{ offset, limit },
				status,
			);

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
			const summary = await Container.get(EvaluationTestRunService).findSummaryByWorkflowId(
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

			const result = await Container.get(EvaluationTestRunService).findTestCasesAndCount(
				runId,
				workflowId,
				{ offset, limit },
			);
			if (!result) throw new NotFoundError('Test run not found');

			const { testCases, count } = result;

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
			await Container.get(EvaluationTestRunService).assertEvaluationQuotaAvailable(workflowId);

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
			const testRun = await Container.get(EvaluationTestRunService).findOneByIdAndWorkflowId(
				runId,
				workflowId,
			);
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
