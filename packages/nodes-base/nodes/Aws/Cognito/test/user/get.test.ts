import type { WorkflowTestData } from '@test/nodes/types';
import type { IDataObject, IHttpRequestOptions, INodeTypes } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '../../../../../test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '../../../../../test/nodes/Helpers';
import * as transport from '../../transport/index';

// Mock the AWS request
const makeAwsRequestSpy = jest.spyOn(transport, 'makeAwsRequest');

makeAwsRequestSpy.mockImplementation(async (opts: IHttpRequestOptions): Promise<IDataObject> => {
	if (opts.method === 'POST' && opts.baseURL?.includes('cognito-idp')) {
		return {
			Enabled: true,
			UserAttributes: [{ Name: 'sub', Value: 'a4583478-f091-7038-7681-b00374bc1ed4' }],
			UserCreateDate: 1741606219.979,
			UserLastModifiedDate: 1741606219.979,
			UserStatus: 'FORCE_CHANGE_PASSWORD',
			Username: 'this@mail.com',
		} as IDataObject;
	}

	return {};
});

describe('Test AWS Cognito - Get User', () => {
	const workflows = ['nodes/Aws/Cognito/test/user/get.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.resetAllMocks();
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(makeAwsRequestSpy).toHaveBeenCalledTimes(1);
		expect(makeAwsRequestSpy).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				method: 'POST',
				baseURL: expect.stringContaining('cognito-idp.us-east-1.amazonaws.com'),
				headers: expect.objectContaining({
					'Content-Type': 'application/x-amz-json-1.1',
				}),
			}),
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
