import type { TestRunCancelDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { TestRunRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { projectScope, publicApiScope } from '../../shared/middlewares/global.middleware';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EvaluationTestRunService } from '@/evaluation.ee/evaluation-test-run.service';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';

type EvaluationsHandlers = {
	cancelTestRun: PublicAPIEndpoint<TestRunRequest.Cancel>;
};

// The quota doubles as the feature flag: 0 = disabled. Cheap in-memory gate.
function assertEvaluationsEnabled() {
	if (Container.get(LicenseState).getMaxWorkflowsWithEvaluations() === 0) {
		throw new ForbiddenError('Evaluations are not available on your plan');
	}
}

const evaluationsHandlers: EvaluationsHandlers = {
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
