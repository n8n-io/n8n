import { readFile as fsReadFile } from 'fs/promises';
import { ExecuteContext } from 'n8n-core';
import { mock, mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';

import { ExecuteWorkflow } from './ExecuteWorkflow.node';
import { getWorkflowInfo } from './GenericFunctions';

vi.mock('fs/promises', () => ({ readFile: vi.fn() }));

const mockReadFile = vi.mocked(fsReadFile);
const enoentError = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });

describe('ExecuteWorkflow node - GenericFunctions', () => {
	let executeFunctionsMock: DeepMockProxy<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
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

		describe('when source is parameter', () => {
			it('should use the workflow object from the parameter', async () => {
				const workflow = { name: 'Sub-workflow', nodes: [], connections: {} };
				executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
				executeFunctionsMock.getNodeParameter.mockReturnValue(workflow);

				await expect(getWorkflowInfo.call(executeFunctionsMock, 'parameter', 0)).resolves.toEqual({
					code: workflow,
				});
			});

			it.each([
				{
					case: 'a JSON string',
					workflowJson: '{"name": "Sub-workflow", "nodes": [], "connections": {}}',
				},
				{
					case: 'an expression',
					workflowJson: '={{ { "name": "Sub-workflow", "nodes": [], "connections": {} } }}',
				},
			])('should read the workflow from $case through core', async ({ workflowJson }) => {
				const node: INode = {
					id: 'execute-workflow',
					name: 'Execute Workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.4,
					position: [0, 0],
					parameters: { source: 'parameter', workflowJson },
				};
				const nodeTypes = mock<INodeTypes>();
				nodeTypes.getByNameAndVersion.mockReturnValue(new ExecuteWorkflow());
				const workflow = new Workflow({ nodes: [node], connections: {}, active: false, nodeTypes });
				const context = new ExecuteContext(
					workflow,
					node,
					mock<IWorkflowExecuteAdditionalData>({
						webhookWaitingBaseUrl: 'https://example.com/webhook-waiting',
						formWaitingBaseUrl: 'https://example.com/form-waiting',
					}),
					'manual',
					createRunExecutionData(),
					0,
					[],
					{ main: [[{ json: {} }]] },
					{ node, data: {}, source: null },
					[],
				);

				await expect(getWorkflowInfo.call(context, 'parameter', 0)).resolves.toEqual({
					code: { name: 'Sub-workflow', nodes: [], connections: {} },
				});
			});
		});
	});
});
