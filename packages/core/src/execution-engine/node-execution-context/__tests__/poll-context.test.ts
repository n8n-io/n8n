import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecutionContext,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeType,
	INodeTypes,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	WorkflowExpression,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow as WorkflowClass } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { PollContext } from '../poll-context';

describe('PollContext', () => {
	const testCredentialType = 'testCredential';
	const nodeType = mock<INodeType>({
		description: {
			credentials: [
				{
					name: testCredentialType,
					required: true,
				},
			],
			properties: [
				{
					name: 'testParameter',
					required: true,
				},
			],
		},
	});
	const nodeTypes = mock<INodeTypes>();
	const expression = mock<WorkflowExpression>();
	const workflow = mock<Workflow>({ expression, nodeTypes });
	const node = mock<INode>({
		credentials: {
			[testCredentialType]: {
				id: 'testCredentialId',
			},
		},
	});
	node.parameters = {
		testParameter: 'testValue',
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		credentialsHelper,
		executionContext: undefined,
	});
	const mode: WorkflowExecuteMode = 'manual';
	const activation: WorkflowActivateMode = 'init';

	const pollContext = new PollContext(workflow, node, additionalData, mode, activation);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getActivationMode', () => {
		it('should return the activation property', () => {
			const result = pollContext.getActivationMode();
			expect(result).toBe(activation);
		});
	});

	describe('getPollBudgetMs', () => {
		it('returns a five-minute default when the engine provided no budget', () => {
			expect(pollContext.getPollBudgetMs()).toBe(300_000);
		});

		it('returns the budget provided by the engine', () => {
			const context = new PollContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				() => 36_000,
			);
			expect(context.getPollBudgetMs()).toBe(36_000);
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			const credentials =
				await pollContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});

		it('should identify credentials requested by a polling trigger', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			await pollContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				expect.anything(),
				testCredentialType,
				mode,
				expect.objectContaining({ node }),
				false,
				undefined,
				{ credentialUsage: 'trigger' },
			);
		});

		it("should preserve the entry point's execution context", async () => {
			const executionContext: IExecutionContext = {
				version: 1,
				establishedAt: 1,
				source: 'manual',
				credentials: 'sealed-credential-context',
			};
			const additionalDataWithContext = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
			additionalDataWithContext.executionContext = executionContext;
			const context = new PollContext(workflow, node, additionalDataWithContext, mode, activation);
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			await context.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				expect.objectContaining({ executionContext }),
				expect.anything(),
				testCredentialType,
				mode,
				expect.objectContaining({ node }),
				false,
				undefined,
				{ credentialUsage: 'trigger' },
			);
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = pollContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = pollContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});

	describe('getNodeParameter with expression context options', () => {
		const pollNode: INode = {
			id: 'poll-node-id',
			name: 'Poll',
			type: 'test.pollTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				itemId: '={{ $json.id }}',
				next: '={{ $response.body.x }}',
				executionMode: '={{ $execution.mode }}',
			},
		};
		const realNodeTypes = mock<INodeTypes>();
		realNodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				properties: ['itemId', 'next', 'executionMode'].map((name) => ({
					displayName: name,
					name,
					type: 'string',
					default: '',
				})),
			},
		} as unknown as INodeType);
		const realWorkflow = new WorkflowClass({
			nodes: [pollNode],
			connections: {},
			active: false,
			nodeTypes: realNodeTypes,
		});
		const context = new PollContext(
			realWorkflow,
			pollNode,
			mock<IWorkflowExecuteAdditionalData>({ executionContext: undefined, variables: {} }),
			'trigger',
			'init',
		);

		it('resolves $json against the given input data', () => {
			const value = context.getNodeParameter('itemId', undefined, {
				inputData: [{ json: { id: 42 } }],
			});

			expect(value).toBe(42);
		});

		it('resolves keys from the given additional keys', () => {
			const value = context.getNodeParameter('next', undefined, {
				additionalKeys: { $response: { body: { x: 'cursor-2' } } },
			});

			expect(value).toBe('cursor-2');
		});

		it('keeps resolving the memoised additional keys when extra keys are given', () => {
			const value = context.getNodeParameter('executionMode', undefined, {
				additionalKeys: { $response: { body: { x: 'cursor-2' } } },
			});

			expect(value).toBe('production');
		});

		it('resolves without the context options as before', () => {
			expect(() => context.getNodeParameter('itemId')).toThrow("Node 'Poll' hasn't been executed");
			expect(context.getNodeParameter('executionMode')).toBe('production');
		});
	});

	describe('getInputConnectionData', () => {
		const pollNode: INode = {
			id: 'poll-node-id',
			name: 'Poll',
			type: 'test.pollTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const toolNode: INode = {
			id: 'tool-node-id',
			name: 'Fetch Page',
			type: 'test.fetchTool',
			typeVersion: 1,
			position: [0, 0],
			parameters: { url: "={{ 'https://example.com/?page=' + $fromAI('page_number') }}" },
		};
		const pollNodeType = {
			description: {
				inputs: [{ type: NodeConnectionTypes.AiTool, maxConnections: 1, required: false }],
				outputs: [NodeConnectionTypes.Main],
				properties: [],
			},
		} as unknown as INodeType;
		const toolNodeType = {
			description: {
				name: 'fetchTool',
				description: 'Fetches a page',
				inputs: [],
				outputs: [NodeConnectionTypes.AiTool],
				properties: [{ displayName: 'URL', name: 'url', type: 'string', default: '' }],
			},
			async execute(this: IExecuteFunctions) {
				return [[{ json: { url: this.getNodeParameter('url', 0) } }]];
			},
		} as unknown as INodeType;
		const toolNodeTypes = mock<INodeTypes>();
		toolNodeTypes.getByNameAndVersion.mockImplementation((type) =>
			type === toolNode.type ? toolNodeType : pollNodeType,
		);
		const buildContext = (connected: boolean) =>
			new PollContext(
				new WorkflowClass({
					nodes: [pollNode, toolNode],
					connections: connected
						? {
								[toolNode.name]: {
									[NodeConnectionTypes.AiTool]: [
										[{ node: pollNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
									],
								},
							}
						: {},
					active: false,
					nodeTypes: toolNodeTypes,
				}),
				pollNode,
				mock<IWorkflowExecuteAdditionalData>({ executionContext: undefined, variables: {} }),
				'trigger',
				'init',
			);

		it('returns the connected node as a tool that resolves $fromAI from its arguments', async () => {
			const tool = (await buildContext(true).getInputConnectionData(
				NodeConnectionTypes.AiTool,
				0,
			)) as { invoke: (args: IDataObject) => Promise<string> };

			const output = await tool.invoke({ page_number: '3' });

			expect(JSON.parse(output)).toEqual([{ url: 'https://example.com/?page=3' }]);
		});

		it('returns undefined when no tool is connected', async () => {
			await expect(
				buildContext(false).getInputConnectionData(NodeConnectionTypes.AiTool, 0),
			).resolves.toBeUndefined();
		});
	});

	describe('getExecutionContext', () => {
		it('should return undefined', () => {
			expect(pollContext.getExecutionContext()).toBeUndefined();
		});
	});

	describe('default getWorkflowStaticData', () => {
		it("should resolve 'node' to the workflow's real static data", () => {
			const nodeStaticData: IDataObject = { lastItemId: 'a' };
			const cursorWorkflow = mock<Workflow>({ expression, nodeTypes });
			cursorWorkflow.getStaticData.mockReturnValue(nodeStaticData);
			const context = new PollContext(cursorWorkflow, node, additionalData, mode, activation);

			expect(context.getWorkflowStaticData('node')).toBe(nodeStaticData);
			expect(cursorWorkflow.getStaticData).toHaveBeenCalledWith('node', node);
		});

		it("should resolve 'global' to the workflow's real static data, not the node resolver", () => {
			const globalStaticData: IDataObject = { lastRun: 'x' };
			const cursorWorkflow = mock<Workflow>({ expression, nodeTypes });
			cursorWorkflow.getStaticData.mockReturnValue(globalStaticData);
			const context = new PollContext(cursorWorkflow, node, additionalData, mode, activation);

			expect(context.getWorkflowStaticData('global')).toBe(globalStaticData);
			expect(cursorWorkflow.getStaticData).toHaveBeenCalledWith('global', node);
		});
	});

	describe('default __commitCursor and __runPoll', () => {
		it('should resolve __commitCursor to undefined', async () => {
			const context = new PollContext(workflow, node, additionalData, mode, activation);

			await expect(context.__commitCursor()).resolves.toBeUndefined();
		});

		it('should run the poll and return its result', async () => {
			const context = new PollContext(workflow, node, additionalData, mode, activation);

			await expect(context.__runPoll(async () => 'polled')).resolves.toBe('polled');
		});
	});

	describe('injected cursor hooks', () => {
		const buildContext = (overrides: {
			commitCursor: IPollFunctions['__commitCursor'];
			runPoll?: IPollFunctions['__runPoll'];
			resolveNodeStaticData?: () => IDataObject;
		}) =>
			new PollContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				undefined,
				undefined,
				overrides.commitCursor,
				overrides.runPoll,
				overrides.resolveNodeStaticData,
			);

		it('should delegate __commitCursor to the injected implementation', async () => {
			const commitCursor = vi.fn().mockResolvedValue(undefined);
			const context = buildContext({ commitCursor });

			await context.__commitCursor();

			expect(commitCursor).toHaveBeenCalledTimes(1);
		});

		it('should delegate __runPoll to the injected implementation', async () => {
			let runPollCalls = 0;
			const runPoll: IPollFunctions['__runPoll'] = async (poll) => {
				runPollCalls++;
				return await poll();
			};
			const context = buildContext({ commitCursor: vi.fn().mockResolvedValue(undefined), runPoll });

			await expect(context.__runPoll(async () => 'polled')).resolves.toBe('polled');
			expect(runPollCalls).toBe(1);
		});

		it("should resolve 'node' static data through the injected resolver instead of the workflow", () => {
			const snapshot: IDataObject = { lastItemId: 'from-injected' };
			const context = buildContext({
				commitCursor: vi.fn().mockResolvedValue(undefined),
				resolveNodeStaticData: () => snapshot,
			});

			expect(context.getWorkflowStaticData('node')).toBe(snapshot);
		});

		it("should still resolve 'global' to the workflow's real static data, ignoring the injected node resolver", () => {
			const globalStaticData: IDataObject = { lastRun: 'x' };
			const cursorWorkflow = mock<Workflow>({ expression, nodeTypes });
			cursorWorkflow.getStaticData.mockReturnValue(globalStaticData);
			const context = new PollContext(
				cursorWorkflow,
				node,
				additionalData,
				mode,
				activation,
				undefined,
				undefined,
				vi.fn().mockResolvedValue(undefined),
				undefined,
				() => ({ lastItemId: 'from-injected' }),
			);

			expect(context.getWorkflowStaticData('global')).toBe(globalStaticData);
		});
	});
});
