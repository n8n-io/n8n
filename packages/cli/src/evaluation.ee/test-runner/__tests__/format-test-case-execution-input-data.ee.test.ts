import { readFileSync } from 'fs';
import { mock } from 'jest-mock-extended';
import path from 'path';

import type { TestCaseRunMetadata } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { formatTestCaseExecutionInputData } from '@/evaluation.ee/test-runner/utils.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

describe('formatTestCaseExecutionInputData', () => {
	test('should format the test case execution input data correctly', () => {
		const data = formatTestCaseExecutionInputData(
			executionDataJson.resultData.runData,
			wfUnderTestJson,
			executionDataJson.resultData.runData,
			wfUnderTestJson,
			mock<TestCaseRunMetadata>({
				pastExecutionId: 'exec-id',
				highlightedData: [],
				annotation: {
					vote: 'up',
					tags: [{ id: 'tag-id', name: 'tag-name' }],
				},
			}),
		);

		// Check data have all expected properties
		expect(data.json).toMatchObject({
			originalExecution: expect.anything(),
			newExecution: expect.anything(),
			annotations: expect.anything(),
		});

		// Check original execution contains all the expected nodes
		expect(data.json.originalExecution).toHaveProperty('72256d90-3a67-4e29-b032-47df4e5768af');
		expect(data.json.originalExecution).toHaveProperty('319f29bc-1dd4-4122-b223-c584752151a4');
		expect(data.json.originalExecution).toHaveProperty('d2474215-63af-40a4-a51e-0ea30d762621');

		// Check format of specific node data
		expect(data.json.originalExecution).toMatchObject({
			'72256d90-3a67-4e29-b032-47df4e5768af': {
				nodeName: 'When clicking ‘Test workflow’',
				runs: [
					{
						executionTime: 0,
						rootNode: true,
						output: {
							main: [
								[
									{
										query: 'First item',
									},
									{
										query: 'Second item',
									},
									{
										query: 'Third item',
									},
								],
							],
						},
					},
				],
			},
		});

		// Check annotations
		expect(data).toMatchObject({
			json: {
				annotations: {
					vote: 'up',
					tags: [{ id: 'tag-id', name: 'tag-name' }],
					highlightedData: {},
				},
			},
		});
	});
});
