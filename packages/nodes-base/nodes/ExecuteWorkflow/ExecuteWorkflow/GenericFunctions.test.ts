import { readFile as fsReadFile } from 'fs/promises';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { getWorkflowInfo } from './GenericFunctions';

jest.mock('fs/promises', () => ({ readFile: jest.fn() }));

const mockReadFile = jest.mocked(fsReadFile);
const enoentError = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });

describe('ExecuteWorkflow node - GenericFunctions', () => {
	let executeFunctionsMock: DeepMockProxy<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		executeFunctionsMock = mockDeep<IExecuteFunctions>();
		executeFunctionsMock.helpers.resolvePath.mockResolvedValue('path/to/file' as never);
	});

	describe('getWorkflowInfo', () => {
		describe('when source is localFile', () => {
			it('should throw an error without the file content when the file is not json', async () => {
				executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
				executeFunctionsMock.getNodeParameter.mockReturnValue('path/to/file');
				mockReadFile.mockResolvedValueOnce('non-json data');

				await expect(getWorkflowInfo.call(executeFunctionsMock, 'localFile', 0)).rejects.toThrow(
					'The file content is not valid JSON',
				);
			});

			it('should throw an error when the file is in a blocked path', async () => {
				executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
				executeFunctionsMock.getNodeParameter.mockReturnValue('path/to/file');
				executeFunctionsMock.helpers.isFilePathBlocked.mockReturnValue(true);

				await expect(getWorkflowInfo.call(executeFunctionsMock, 'localFile', 0)).rejects.toThrow(
					'Access to the workflow file path is not allowed',
				);
			});

			it('should throw a friendly error when the parent directory does not exist', async () => {
				executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
				executeFunctionsMock.getNodeParameter.mockReturnValue('/nonexistent/dir/file.json');
				executeFunctionsMock.helpers.resolvePath.mockRejectedValue(enoentError());

				await expect(getWorkflowInfo.call(executeFunctionsMock, 'localFile', 0)).rejects.toThrow(
					'The file "/nonexistent/dir/file.json" could not be found, [item 0]',
				);
			});

			it('should throw a friendly error when the file does not exist', async () => {
				executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
				executeFunctionsMock.getNodeParameter.mockReturnValue('/existing/dir/missing.json');
				mockReadFile.mockRejectedValueOnce(enoentError());

				await expect(getWorkflowInfo.call(executeFunctionsMock, 'localFile', 0)).rejects.toThrow(
					'The file "/existing/dir/missing.json" could not be found, [item 0]',
				);
			});
		});
	});
});
