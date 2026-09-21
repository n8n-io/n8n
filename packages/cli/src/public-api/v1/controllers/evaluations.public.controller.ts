import {
	CreatedTestRunPublicDto,
	ListTestRunsQueryPublicDto,
	TestRunListPublicDto,
	TestRunSummaryPublicDto,
	workflowIdParamSchema,
} from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { AuthenticatedRequest, TestRun } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EvaluationTestRunService } from '@/evaluation.ee/evaluation-test-run.service';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const tags = ['Evaluation'];

// The list omits `testCaseExecutions` and the single-run summary carries the count, so both
// repository shapes fit this `Pick` without loading the full entity.
type TestRunSummarySource = Pick<
	TestRun,
	| 'id'
	| 'status'
	| 'runAt'
	| 'completedAt'
	| 'metrics'
	| 'errorCode'
	| 'errorDetails'
	| 'createdAt'
	| 'updatedAt'
> & { finalResult: TestRun['finalResult']; testCaseCount: number };

const toTestRunSummaryPublicDto = (run: TestRunSummarySource): TestRunSummaryPublicDto => ({
	id: run.id,
	status: run.status,
	runAt: run.runAt?.toISOString() ?? null,
	completedAt: run.completedAt?.toISOString() ?? null,
	metrics: run.metrics ?? null,
	errorCode: run.errorCode ?? null,
	errorDetails: run.errorDetails ?? null,
	finalResult: run.finalResult ?? null,
	testCaseCount: run.testCaseCount,
	createdAt: run.createdAt.toISOString(),
	updatedAt: run.updatedAt.toISOString(),
});

@PublicApiController('/workflows/:workflowId/test-runs')
export class EvaluationsPublicController {
	constructor(
		private readonly evaluationTestRunService: EvaluationTestRunService,
		private readonly testRunnerService: TestRunnerService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly licenseState: LicenseState,
		private readonly errorReporter: ErrorReporter,
	) {}

	@Get('/')
	@ApiKeyScope('testRun:list')
	@ProjectScope('workflow:read')
	@ApiSummary('Retrieve test runs')
	@ApiDescription('Retrieve the evaluation test runs of a workflow.')
	@ApiTags(tags)
	@ApiResponse(200, TestRunListPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async getTestRuns(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId', workflowIdParamSchema) workflowId: string,
		@Query query: ListTestRunsQueryPublicDto,
	): Promise<TestRunListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { testRuns, count } = await this.evaluationTestRunService.findManyAndCount(
			workflowId,
			{ offset, limit },
			query.status,
		);

		return {
			data: testRuns.map(toTestRunSummaryPublicDto),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/')
	@ApiKeyScope('testRun:create')
	@ProjectScope('workflow:execute')
	@ApiSummary('Trigger a test run')
	@ApiDescription(
		'Start a new evaluation test run for a workflow. The workflow must contain a configured ' +
			'evaluation trigger. Requires the `workflow:execute` project scope in addition to the ' +
			'`testRun:create` API key scope.',
	)
	@ApiTags(tags)
	@ApiResponse(201, CreatedTestRunPublicDto)
	@ApiErrorResponse(402)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async createTestRun(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId', workflowIdParamSchema) workflowId: string,
	): Promise<CreatedTestRunPublicDto> {
		this.assertEvaluationsEnabled();

		// Reject a workflow with no evaluation trigger up-front (409). Deeper validation still
		// happens asynchronously in the run, matching the internal path.
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:execute',
		]);
		if (!workflow) throw new NotFoundError('Workflow not found');

		const hasTrigger = workflow.nodes.some((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE);
		if (!hasTrigger) {
			throw new ConflictError('Workflow has no evaluation trigger');
		}

		// The count query runs last, after the cheaper 403/404/409 checks.
		await this.evaluationTestRunService.assertEvaluationQuotaAvailable(workflowId);

		// Case execution runs detached; guard `finished` so an unexpected rejection is not left
		// unhandled (the server has no global handler).
		const { testRun, finished } = await this.testRunnerService.startTestRun(
			req.user,
			workflowId,
			1,
			{ via: 'public-api' },
		);
		void finished.catch((error) => this.errorReporter.error(error));

		return {
			id: testRun.id,
			status: testRun.status,
			createdAt: testRun.createdAt.toISOString(),
		};
	}

	// The quota doubles as the feature flag: 0 = disabled. Cheap in-memory gate.
	private assertEvaluationsEnabled() {
		if (this.licenseState.getMaxWorkflowsWithEvaluations() === 0) {
			throw new ForbiddenError('Evaluations are not available on your plan');
		}
	}
}
