import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { getWorkflowInfo } from './GenericFunctions';

jest.mock('fs/promises', () => ({
	readFile: jest.fn().mockResolvedValue('sensitive data'),
}));

describe('ExecuteWorkflow node - GenericFunctions', () => {
	let executeFunctionsMock: DeepMockProxy<ILoadOptionsFunctions | IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		executeFunctionsMock = mockDeep<ILoadOptionsFunctions | IExecuteFunctions>();
	});

	describe('getWorkflowInfo', () => {
		it('should throw an error without the file content when source is localFile and the file is not json', async () => {
			executeFunctionsMock.getNode.mockReturnValue({
				typeVersion: 1,
			} as INode);
			executeFunctionsMock.getNodeParameter.mockReturnValue('path/to/file');

			await expect(getWorkflowInfo.call(executeFunctionsMock, 'localFile', 0)).rejects.toThrow(
				'The file content is not valid JSON',
			);
		});
	});
});
