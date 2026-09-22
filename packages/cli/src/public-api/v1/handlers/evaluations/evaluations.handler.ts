import { Container } from '@n8n/di';

import { toTestCaseExecutionDto, toTestRunSummaryDto } from './evaluations.mapper';
import type { TestRunRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	projectScope,
	publicApiScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EvaluationTestRunService } from '@/evaluation.ee/evaluation-test-run.service';

type EvaluationsHandlers = {
	getTestRun: PublicAPIEndpoint<TestRunRequest.GetOne>;
	getTestCases: PublicAPIEndpoint<TestRunRequest.GetCases>;
};

const evaluationsHandlers: EvaluationsHandlers = {
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
};

export = evaluationsHandlers;
