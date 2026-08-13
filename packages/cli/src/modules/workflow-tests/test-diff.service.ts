import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import type { IRunData } from 'n8n-workflow';

import { sanitizeBranches } from './capture.service';
import type {
	NodeExpectation,
	WorkflowTestNodeResult,
	WorkflowTestRunResult,
} from './workflow-tests.types';

export interface DiffInput {
	testId: string;
	testName: string;
	executionId: string | null;
	expectations: NodeExpectation[];
	actualRunData: IRunData;
	runError?: { message: string } | undefined;
}

@Service()
export class TestDiffService {
	diff(input: DiffInput): WorkflowTestRunResult {
		const { testId, testName, executionId, expectations, actualRunData, runError } = input;

		const nodeResults: WorkflowTestNodeResult[] = [];
		let firstFailedNode: string | undefined;

		for (const expectation of expectations) {
			const result = this.diffNode(expectation, actualRunData);
			nodeResults.push(result);
			if (result.status !== 'passed' && firstFailedNode === undefined) {
				firstFailedNode = result.nodeName;
			}
		}

		const status = runError ? 'error' : firstFailedNode !== undefined ? 'failed' : 'passed';

		return {
			testId,
			testName,
			executionId,
			status,
			...(runError ? { errorMessage: runError.message } : {}),
			...(firstFailedNode !== undefined ? { firstFailedNode } : {}),
			nodeResults,
			completedAt: new Date().toISOString(),
		};
	}

	private diffNode(expectation: NodeExpectation, actualRunData: IRunData): WorkflowTestNodeResult {
		const task = actualRunData[expectation.nodeName]?.[0];

		if (!task) {
			return {
				nodeName: expectation.nodeName,
				status: 'not-executed',
				expected: JSON.stringify(expectation.outputs, null, 2),
				actual: JSON.stringify(null, null, 2),
			};
		}

		const actualOutputs = sanitizeBranches(task.data?.main ?? []);

		if (isEqual(actualOutputs, expectation.outputs)) {
			return { nodeName: expectation.nodeName, status: 'passed' };
		}

		return {
			nodeName: expectation.nodeName,
			status: 'failed',
			expected: JSON.stringify(expectation.outputs, null, 2),
			actual: JSON.stringify(actualOutputs, null, 2),
		};
	}
}
