import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import type { INodeType, INodeTypeDescription, IRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { NodeTypes } from '@/node-types';
import { WorkflowRunner } from '@/workflow-runner';

import { ExecuteNodeService } from '../execute-node.service';
import type { ExecuteNodeRequest } from '../execute-node.service';

const testNodeDescription: INodeTypeDescription = {
	displayName: 'Test',
	name: 'test',
	group: [],
	version: 1,
	description: '',
	defaults: { name: 'Test' },
	inputs: [],
	outputs: [],
	properties: [],
};

// Assign onto an empty mock instead of passing overrides to mock(): the latter
// deep-wraps nested objects in proxies. `description` must be a real object.
const mockNodeType = (overrides: object = {}) =>
	Object.assign(mock<INodeType>(), { description: testNodeDescription }, overrides);

const baseRequest = (overrides: Partial<ExecuteNodeRequest> = {}): ExecuteNodeRequest => ({
	type: 'n8n-nodes-base.set',
	version: 3,
	config: { parameters: {} },
	projectId: 'project-1',
	...overrides,
});

const successExecution = (runDataForNode: unknown) => ({
	data: { resultData: { runData: { Node: runDataForNode } } } as unknown as IRunExecutionData,
});

describe('ExecuteNodeService', () => {
	const nodeTypes = mockInstance(NodeTypes);
	const credentialsFinderService = mockInstance(CredentialsFinderService);
	const logger = mockInstance(Logger);
	const workflowRepository = mockInstance(WorkflowRepository);
	const workflowRunner = mockInstance(WorkflowRunner);
	const activeExecutions = mockInstance(ActiveExecutions);
	const executionPersistence = mockInstance(ExecutionPersistence);
	const instanceSettings = mockInstance(InstanceSettings);

	const service = new ExecuteNodeService(
		nodeTypes,
		credentialsFinderService,
		logger,
		workflowRepository,
		workflowRunner,
		activeExecutions,
		executionPersistence,
		instanceSettings,
	);

	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		vi.clearAllMocks();

		Object.defineProperty(instanceSettings, 'isMultiMain', { value: false, configurable: true });
		nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType());
		workflowRepository.createWorkflowWithOwner.mockImplementation(async (workflow) => {
			workflow.id = 'temp-wf-1';
			return await Promise.resolve(workflow);
		});
		workflowRunner.run.mockResolvedValue('exec-1');
		activeExecutions.has.mockReturnValue(true);
		activeExecutions.getPostExecutePromise.mockResolvedValue(undefined);
		executionPersistence.findSingleExecution.mockResolvedValue(
			successExecution([{ data: { main: [[{ json: { done: true } }]] } }]) as never,
		);
	});

	describe('pre-flight validation', () => {
		it('rejects an unknown node type before creating any workflow row', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('unknown');
			});

			await expect(service.run(user, baseRequest())).rejects.toThrow(BadRequestError);
			expect(workflowRepository.createWorkflowWithOwner).not.toHaveBeenCalled();
		});

		it('rejects a trigger/webhook-only node before creating any workflow row', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(mockNodeType({ execute: undefined }));

			await expect(service.run(user, baseRequest())).rejects.toThrow(BadRequestError);
			expect(workflowRepository.createWorkflowWithOwner).not.toHaveBeenCalled();
		});

		it('accepts a declarative node without execute (requestDefaults present)', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mockNodeType({
					execute: undefined,
					description: { ...testNodeDescription, requestDefaults: { baseURL: 'https://x' } },
				}),
			);

			const result = await service.run(user, baseRequest());

			expect(result.status).toBe('success');
		});

		it('rejects a credential reference without id', async () => {
			await expect(
				service.run(
					user,
					baseRequest({
						config: { parameters: {}, credentials: { slackApi: { id: null, name: 'Slack' } } },
					}),
				),
			).rejects.toThrow(BadRequestError);
			expect(workflowRepository.createWorkflowWithOwner).not.toHaveBeenCalled();
		});

		it('rejects a credential the user cannot read', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(
				service.run(
					user,
					baseRequest({
						config: { parameters: {}, credentials: { slackApi: { id: 'cred-1', name: 'Slack' } } },
					}),
				),
			).rejects.toThrow(ForbiddenError);
			expect(workflowRepository.createWorkflowWithOwner).not.toHaveBeenCalled();
		});

		it('forces id null on managed credentials and skips the access check for them', async () => {
			await service.run(
				user,
				baseRequest({
					config: {
						parameters: {},
						credentials: {
							aiGateway: { id: 'stale-id', name: 'Managed', __aiGatewayManaged: true },
						},
					},
				}),
			);

			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			const runData = workflowRunner.run.mock.calls[0][0];
			expect(runData.workflowData.nodes[0].credentials).toEqual({
				aiGateway: { id: null, name: 'Managed', __aiGatewayManaged: true },
			});
		});
	});

	describe('engine execution', () => {
		it('creates an archived single-node workflow owned by the requested project', async () => {
			await service.run(user, baseRequest({ timeoutMs: 10_000 }));

			const savedWorkflow = workflowRepository.createWorkflowWithOwner.mock.calls[0][0];
			expect(savedWorkflow.isArchived).toBe(true);
			expect(savedWorkflow.active).toBe(false);
			expect(savedWorkflow.nodes).toHaveLength(1);
			expect(savedWorkflow.connections).toEqual({});
			expect(savedWorkflow.settings).toEqual(
				expect.objectContaining({
					saveManualExecutions: true,
					saveDataSuccessExecution: 'all',
					saveDataErrorExecution: 'all',
					executionTimeout: 10,
				}),
			);
			expect(workflowRepository.createWorkflowWithOwner).toHaveBeenCalledWith(
				savedWorkflow,
				'project-1',
			);
		});

		it('clamps the timeout to the maximum', async () => {
			await service.run(user, baseRequest({ timeoutMs: 120_000 }));

			const savedWorkflow = workflowRepository.createWorkflowWithOwner.mock.calls[0][0];
			expect(savedWorkflow.settings?.executionTimeout).toBe(60);
		});

		it('runs through WorkflowRunner in manual mode with a seeded execution stack', async () => {
			const input = [{ json: { text: 'hi' } }];
			await service.run(user, baseRequest({ input }));

			const runData = workflowRunner.run.mock.calls[0][0];
			expect(runData.executionMode).toBe('manual');
			expect(runData.userId).toBe('user-1');
			expect(runData.workflowData.id).toBe('temp-wf-1');
			expect(runData.executionData?.manualData).toEqual({ userId: 'user-1' });
			const stack = runData.executionData?.executionData?.nodeExecutionStack;
			expect(stack).toHaveLength(1);
			expect(stack?.[0]).toEqual(
				expect.objectContaining({
					node: expect.objectContaining({ name: 'Node', type: 'n8n-nodes-base.set' }),
					data: { main: [input] },
					source: null,
				}),
			);
		});

		it('defaults to a single empty input item', async () => {
			await service.run(user, baseRequest());

			const runData = workflowRunner.run.mock.calls[0][0];
			expect(runData.executionData?.executionData?.nodeExecutionStack[0].data).toEqual({
				main: [[{ json: {} }]],
			});
		});

		it('maps the persisted output of the last node run, reducing binary to metadata', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				successExecution([
					{ data: { main: [[{ json: { attempt: 1 } }]] } },
					{
						data: {
							main: [
								[
									{
										json: { attempt: 2 },
										binary: {
											file: {
												data: 'x'.repeat(1000),
												fileName: 'a.pdf',
												mimeType: 'application/pdf',
												fileSize: '1 kB',
											},
										},
									},
								],
							],
						},
					},
				]) as never,
			);

			const result = await service.run(user, baseRequest());

			expect(result).toEqual({
				status: 'success',
				output: [
					[
						{
							json: { attempt: 2 },
							binary: {
								file: { fileName: 'a.pdf', mimeType: 'application/pdf', fileSize: '1 kB' },
							},
						},
					],
				],
			});
		});

		it('maps an execution error to an error result', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue({
				data: {
					resultData: {
						runData: {},
						error: { message: 'boom', description: 'details', name: 'NodeOperationError' },
					},
				},
			} as never);

			const result = await service.run(user, baseRequest());

			expect(result).toEqual({
				status: 'error',
				error: { message: 'boom', description: 'details', nodeErrorType: 'NodeOperationError' },
			});
		});

		it('returns an error result when the execution entered a wait state', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue({
				status: 'waiting',
				...successExecution([{ data: { main: [[{ json: {} }]] } }]),
			} as never);

			const result = await service.run(user, baseRequest());

			expect(result).toEqual({
				status: 'error',
				error: { message: expect.stringContaining('wait state') },
			});
			expect(workflowRepository.delete).toHaveBeenCalledWith('temp-wf-1');
		});

		it('returns an error result when the node produced no output', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				successExecution(undefined) as never,
			);

			const result = await service.run(user, baseRequest());

			expect(result).toEqual({
				status: 'error',
				error: { message: expect.stringContaining('produced no output') },
			});
		});

		it('deletes the temporary workflow after a successful run', async () => {
			await service.run(user, baseRequest());

			expect(workflowRepository.delete).toHaveBeenCalledWith('temp-wf-1');
		});

		it('deletes the temporary workflow when the launch fails and returns an error result', async () => {
			workflowRunner.run.mockRejectedValue(new Error('launch failed'));

			const result = await service.run(user, baseRequest());

			expect(result).toEqual({ status: 'error', error: { message: 'launch failed' } });
			expect(workflowRepository.delete).toHaveBeenCalledWith('temp-wf-1');
		});

		it('cancels the execution and reports a timeout when it never settles', async () => {
			vi.useFakeTimers();
			try {
				activeExecutions.getPostExecutePromise.mockReturnValue(new Promise(() => {}));

				const promise = service.run(user, baseRequest({ timeoutMs: 5_000 }));
				await vi.advanceTimersByTimeAsync(7_000);
				const result = await promise;

				expect(result).toEqual({
					status: 'error',
					error: { message: 'Execution timed out after 5000ms and was cancelled' },
				});
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith('exec-1', expect.any(Error));
				expect(workflowRepository.delete).toHaveBeenCalledWith('temp-wf-1');
			} finally {
				vi.useRealTimers();
			}
		});

		it('polls the execution row instead of the post-execute promise on multi-main', async () => {
			Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });
			vi.useFakeTimers();
			try {
				executionPersistence.findSingleExecution
					.mockResolvedValueOnce({ status: 'running' } as never)
					.mockResolvedValueOnce({ status: 'success' } as never);

				const promise = service.run(user, baseRequest());
				await vi.advanceTimersByTimeAsync(1_500);
				const result = await promise;

				expect(activeExecutions.getPostExecutePromise).not.toHaveBeenCalled();
				expect(executionPersistence.findSingleExecution).toHaveBeenCalledTimes(3);
				expect(result).toEqual({ status: 'success', output: [[{ json: { done: true } }]] });
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
