import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { getWorkflowInfo } from './GenericFunctions';

describe('ExecuteWorkflow node - GenericFunctions', () => {
	let executeFunctionsMock: DeepMockProxy<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		executeFunctionsMock = mockDeep<IExecuteFunctions>();
		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
	});

	describe('getWorkflowInfo', () => {
		describe('when source is a removed source', () => {
			it.each(['localFile', 'url'])(
				'should throw a NodeOperationError when source is %s',
				async (source) => {
					await expect(getWorkflowInfo.call(executeFunctionsMock, source, 0)).rejects.toThrow(
						NodeOperationError,
					);
					await expect(getWorkflowInfo.call(executeFunctionsMock, source, 0)).rejects.toThrow(
						'source was removed',
					);
				},
			);
		});

		describe('when source is parameter', () => {
			it('should return the parsed workflow JSON as code', async () => {
				const workflow = { nodes: [], connections: {} };
				executeFunctionsMock.getNodeParameter.mockReturnValue(JSON.stringify(workflow));

				const result = await getWorkflowInfo.call(executeFunctionsMock, 'parameter', 0);

				expect(result).toEqual({ code: workflow });
			});

			it('should throw when the workflow JSON is invalid', async () => {
				executeFunctionsMock.getNodeParameter.mockReturnValue('non-json data');

				await expect(getWorkflowInfo.call(executeFunctionsMock, 'parameter', 0)).rejects.toThrow();
			});
		});

		describe('when source is database', () => {
			it('should return the workflow ID from the plain parameter on version 1', async () => {
				executeFunctionsMock.getNodeParameter.mockReturnValue('42');

				const result = await getWorkflowInfo.call(executeFunctionsMock, 'database', 0);

				expect(result).toEqual({ id: '42' });
			});

			it('should return the workflow ID from the resource locator on newer versions', async () => {
				executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1.2 } as INode);
				executeFunctionsMock.getNodeParameter.mockReturnValue({ mode: 'list', value: '42' });

				const result = await getWorkflowInfo.call(executeFunctionsMock, 'database', 0);

				expect(result).toEqual({ id: '42' });
			});
		});
	});
});
