import { TestCaseExecutionRepository, TestRunRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { toTestCaseExecutionDto, toTestRunSummaryDto } from './evaluations.mapper';
import type { TestRunRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	evaluationsLicensed,
	projectScope,
	publicApiScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type EvaluationsHandlers = {
	getTestRuns: PublicAPIEndpoint<TestRunRequest.GetMany>;
	getTestRun: PublicAPIEndpoint<TestRunRequest.GetOne>;
	getTestCases: PublicAPIEndpoint<TestRunRequest.GetCases>;
};

const evaluationsHandlers: EvaluationsHandlers = {
	getTestRuns: [
		publicApiScope('testRun:list'),
		evaluationsLicensed,
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
		evaluationsLicensed,
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
		evaluationsLicensed,
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
};

export = evaluationsHandlers;
