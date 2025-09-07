import { mock } from 'jest-mock-extended';
import type { INode, INodeType, INodeTypes, IRun, IExecuteFunctions } from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';
import { WorkflowExecute } from '@/execution-engine/workflow-execute';

describe('V2 Parallel Execution - Backward Compatibility Tests', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	describe('Breaking Changes Prevention', () => {
		it('should execute v0 workflows exactly the same as before', async () => {
			// ARRANGE
			const executionOrder: string[] = [];

			const createNode = (name: string): INodeType => {
				return mock<INodeType>({
					description: {
						name: `test.${name.toLowerCase()}`,
						displayName: name,
						defaultVersion: 1,
						properties: [],
						inputs: [{ type: NodeConnectionTypes.Main }],
						outputs: [{ type: NodeConnectionTypes.Main }],
					},
					async execute(this: IExecuteFunctions) {
						executionOrder.push(name);
						return [[{ json: { result: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createNode(nodeName);
			});

			// Create a workflow that would behave differently in parallel vs sequential
			const nodes: INode[] = [
				{
					id: 'trigger',
					name: 'Trigger',
					type: 'test.trigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'first',
					name: 'First',
					type: 'test.first',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'second',
					name: 'Second',
					type: 'test.second',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'v0-compatibility-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'First', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					First: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'Second', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v0', // Legacy mode
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);
			// V0 should execute in exact sequential order
			expect(executionOrder).toEqual(['trigger', 'first', 'second']);
		});

		it('should execute v1 workflows exactly the same as before', async () => {
			// ARRANGE
			const executionOrder: string[] = [];

			const createNode = (name: string): INodeType => {
				return mock<INodeType>({
					description: {
						name: `test.${name.toLowerCase()}`,
						displayName: name,
						defaultVersion: 1,
						properties: [],
						inputs: [{ type: NodeConnectionTypes.Main }],
						outputs: [{ type: NodeConnectionTypes.Main }],
					},
					async execute(this: IExecuteFunctions) {
						executionOrder.push(name);
						return [[{ json: { result: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createNode(nodeName);
			});

			const nodes: INode[] = [
				{
					id: 'trigger',
					name: 'Trigger',
					type: 'test.trigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'branch1',
					name: 'Branch1',
					type: 'test.branch1',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'branch2',
					name: 'Branch2',
					type: 'test.branch2',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'v1-compatibility-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Branch1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Branch2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v1', // Current recommended mode
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);
			expect(executionOrder).toContain('trigger');
			expect(executionOrder).toContain('branch1');
			expect(executionOrder).toContain('branch2');
			// V1 executes in depth-first order
			expect(executionOrder.indexOf('trigger')).toBe(0);
		});

		it('should not change behavior when no executionOrder is specified', async () => {
			// ARRANGE
			const executionOrder: string[] = [];

			const createNode = (name: string): INodeType => {
				return mock<INodeType>({
					description: {
						name: `test.${name.toLowerCase()}`,
						displayName: name,
						defaultVersion: 1,
						properties: [],
						inputs: [{ type: NodeConnectionTypes.Main }],
						outputs: [{ type: NodeConnectionTypes.Main }],
					},
					async execute() {
						executionOrder.push(name);
						return [[{ json: { result: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createNode(nodeName);
			});

			const simpleNode: INode = {
				id: 'simple',
				name: 'Simple',
				type: 'test.simple',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const workflow = new Workflow({
				id: 'default-settings-test',
				nodes: [simpleNode],
				connections: {},
				active: false,
				nodeTypes,
				// No settings specified - should work exactly as before
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, simpleNode);

			// ASSERT
			expect(result.finished).toBe(true);
			expect(result.data.resultData.runData.Simple).toBeDefined();
			expect(result.data.resultData.runData.Simple[0].data?.main?.[0]?.[0]?.json).toEqual({
				result: 'simple',
			});
		});
	});

	describe('API Compatibility', () => {
		it('should not change the structure of execution results', async () => {
			// ARRANGE
			const nodeType = mock<INodeType>({
				description: {
					name: 'test.api',
					displayName: 'API Test',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					return [
						[
							{
								json: {
									id: 1,
									name: 'test',
									nested: { value: 'data' },
								},
								pairedItem: { item: 0 },
							},
						],
					];
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const testNode: INode = {
				id: 'test',
				name: 'Test',
				type: 'test.api',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			// Test both v1 and v2 modes
			const modes = ['v1', 'v2'] as const;

			for (const executionOrder of modes) {
				const workflow = new Workflow({
					id: `api-compatibility-${executionOrder}`,
					nodes: [testNode],
					connections: {},
					active: false,
					nodeTypes,
					settings: { executionOrder },
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
				const workflowExecute = new WorkflowExecute(additionalData, 'manual');

				// ACT
				const result = await workflowExecute.run(workflow, testNode);

				// ASSERT - Both modes should produce identical result structure
				expect(result.finished).toBe(true);
				expect(result.data.resultData.runData.Test).toBeDefined();
				expect(result.data.resultData.runData.Test[0]).toMatchObject({
					executionTime: expect.any(Number),
					executionStatus: 'success',
					data: {
						main: [
							[
								{
									json: {
										id: 1,
										name: 'test',
										nested: { value: 'data' },
									},
									pairedItem: { item: 0 },
								},
							],
						],
					},
				});
			}
		});

		it('should maintain the same error structure and handling', async () => {
			// ARRANGE
			const errorNodeType = mock<INodeType>({
				description: {
					name: 'test.error',
					displayName: 'Error Test',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					throw new Error('Test error message');
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(errorNodeType);

			const errorNode: INode = {
				id: 'error',
				name: 'Error',
				type: 'test.error',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			// Test both modes handle errors the same way
			const modes = ['v1', 'v2'] as const;

			for (const executionOrder of modes) {
				const workflow = new Workflow({
					id: `error-compatibility-${executionOrder}`,
					nodes: [errorNode],
					connections: {},
					active: false,
					nodeTypes,
					settings: { executionOrder },
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
				const workflowExecute = new WorkflowExecute(additionalData, 'manual');

				// ACT
				const result = await workflowExecute.run(workflow, errorNode);

				// ASSERT - Both modes should handle errors the same way
				expect(result.data.resultData.error).toBeDefined();
				expect(result.data.resultData.error?.message).toBe('Test error message');
				expect(result.data.resultData.runData.Error[0].error).toBeDefined();
				expect(result.data.resultData.runData.Error[0].executionStatus).toBe('error');
			}
		});
	});
});
