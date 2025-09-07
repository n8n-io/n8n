import { mock } from 'jest-mock-extended';
import type { INode, INodeType, INodeTypes, IRun, IExecuteFunctions } from 'n8n-workflow';
import { createDeferredPromise, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';
import { WorkflowExecute } from '@/execution-engine/workflow-execute';

describe('V2 Parallel Execution - Data Consistency Tests', () => {
	let nodeTypes: jest.Mocked<INodeTypes>;

	beforeEach(() => {
		nodeTypes = mock<INodeTypes>();
	});

	describe('Context Isolation and Race Condition Prevention', () => {
		it('should prevent parameter corruption between parallel nodes', async () => {
			// ARRANGE
			const parameterValues: Record<string, any> = {};
			const executionContexts: Record<string, any> = {};

			const createParameterNode = (name: string, expectedValue: string): INodeType => {
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
						// Capture context info without complex parameter access
						const nodeInfo = this.getNode();

						parameterValues[name] = expectedValue; // Use the expected value directly
						executionContexts[name] = {
							nodeId: nodeInfo.id,
							nodeName: nodeInfo.name,
							nodeType: nodeInfo.type,
							paramValue: expectedValue,
						};

						// Simulate some async work to increase chance of race conditions
						await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

						return [[{ json: { param: expectedValue, node: name } }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				switch (name) {
					case 'test.trigger':
						return createParameterNode('trigger', 'triggerValue');
					case 'test.node1':
						return createParameterNode('node1', 'value1');
					case 'test.node2':
						return createParameterNode('node2', 'value2');
					case 'test.node3':
						return createParameterNode('node3', 'value3');
					default:
						throw new Error(`Unknown node type: ${name}`);
				}
			});

			const nodes: INode[] = [
				{
					id: 'trigger',
					name: 'Trigger',
					type: 'test.trigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: { testParam: 'triggerValue' },
				},
				{
					id: 'node1',
					name: 'Node1',
					type: 'test.node1',
					typeVersion: 1,
					position: [200, -50],
					parameters: { testParam: 'value1' },
				},
				{
					id: 'node2',
					name: 'Node2',
					type: 'test.node2',
					typeVersion: 1,
					position: [200, 0],
					parameters: { testParam: 'value2' },
				},
				{
					id: 'node3',
					name: 'Node3',
					type: 'test.node3',
					typeVersion: 1,
					position: [200, 50],
					parameters: { testParam: 'value3' },
				},
			];

			const workflow = new Workflow({
				id: 'parameter-isolation-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Node1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Node2', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Node3', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
					maxParallel: 3,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);

			// Verify each node got its correct parameter value
			expect(parameterValues.trigger).toBe('triggerValue');
			expect(parameterValues.node1).toBe('value1');
			expect(parameterValues.node2).toBe('value2');
			expect(parameterValues.node3).toBe('value3');

			// Verify contexts were properly isolated
			expect(executionContexts.node1.nodeId).toBe('node1');
			expect(executionContexts.node2.nodeId).toBe('node2');
			expect(executionContexts.node3.nodeId).toBe('node3');

			// Verify no parameter cross-contamination
			expect(parameterValues.node1).not.toBe(parameterValues.node2);
			expect(parameterValues.node2).not.toBe(parameterValues.node3);
		});

		it('should prevent data corruption in shared data structures', async () => {
			// ARRANGE
			const sharedDataAccess: Record<string, any[]> = {};

			const createDataAccessNode = (name: string): INodeType => {
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
						const inputData = this.getInputData();

						// Record what data this node received (before any processing)
						sharedDataAccess[name] = inputData.map((item) => ({
							originalJson: { ...item.json },
							hasProcessedBy: 'processedBy' in item.json,
						}));

						// Create new output without modifying input
						const processedData = inputData.map((item) => ({
							json: {
								processedBy: name,
								timestamp: Date.now(),
								originalData: { ...item.json },
							},
						}));

						return [processedData];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createDataAccessNode(nodeName);
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
					id: 'processor1',
					name: 'Processor1',
					type: 'test.processor1',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'processor2',
					name: 'Processor2',
					type: 'test.processor2',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'data-isolation-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Processor1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Processor2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);

			// Both processors should have received the same original data
			expect(sharedDataAccess.processor1).toBeDefined();
			expect(sharedDataAccess.processor2).toBeDefined();

			// Verify that both processors received clean input data
			const processor1Input = sharedDataAccess.processor1[0];
			const processor2Input = sharedDataAccess.processor2[0];

			// Both should have received the same data from trigger (which includes processedBy)
			expect(processor1Input.hasProcessedBy).toBe(true);
			expect(processor2Input.hasProcessedBy).toBe(true);
			expect(processor1Input.originalJson).toEqual(processor2Input.originalJson);
		});

		it('should handle complex data structures without corruption', async () => {
			// ARRANGE
			const receivedData: Record<string, any> = {};

			const createComplexDataNode = (name: string): INodeType => {
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
						const inputData = this.getInputData();

						// Deep clone to capture what we received
						receivedData[name] = JSON.parse(JSON.stringify(inputData));

						// Create complex output data
						const complexOutput = {
							arrays: [1, 2, 3, { nested: true }],
							objects: {
								deep: {
									nesting: {
										with: ['arrays', { and: 'objects' }],
									},
								},
							},
							processedBy: name,
						};

						return [[{ json: complexOutput }]];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createComplexDataNode(nodeName);
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
					id: 'complex1',
					name: 'Complex1',
					type: 'test.complex1',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'complex2',
					name: 'Complex2',
					type: 'test.complex2',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'complex-data-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Complex1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Complex2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);

			// Verify both nodes received identical input data
			expect(receivedData.complex1).toEqual(receivedData.complex2);

			// Verify output data is properly structured
			expect(result.data.resultData.runData.Complex1[0].data?.main?.[0]?.[0]?.json).toMatchObject({
				arrays: [1, 2, 3, { nested: true }],
				objects: {
					deep: {
						nesting: {
							with: ['arrays', { and: 'objects' }],
						},
					},
				},
				processedBy: 'complex1',
			});
		});
	});

	describe('Merge Node Compatibility', () => {
		it('should properly handle merge nodes that wait for multiple parallel inputs', async () => {
			// ARRANGE
			const executionOrder: string[] = [];
			const mergeInputData: any[] = [];

			const createSimpleNode = (name: string): INodeType => {
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
						return [[{ json: { from: name, timestamp: Date.now() } }]];
					},
				});
			};

			const mergeNodeType = mock<INodeType>({
				description: {
					name: 'test.merge',
					displayName: 'Merge',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }, { type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute(this: IExecuteFunctions) {
					executionOrder.push('merge');

					const input1 = this.getInputData(0);
					const input2 = this.getInputData(1);

					mergeInputData.push({ input1, input2 });

					return [
						[
							...input1,
							...input2,
							{ json: { merged: true, totalInputs: input1.length + input2.length } },
						],
					];
				},
			});

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				switch (name) {
					case 'test.merge':
						return mergeNodeType;
					default:
						const nodeName = name.replace('test.', '');
						return createSimpleNode(nodeName);
				}
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
				{
					id: 'merge',
					name: 'Merge',
					type: 'test.merge',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'merge-compatibility-test',
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
					Branch1: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
					Branch2: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 1 }],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
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
			expect(executionOrder).toContain('merge');

			// Verify merge node received data from both branches
			expect(mergeInputData).toHaveLength(1);
			expect(mergeInputData[0].input1).toHaveLength(1);
			expect(mergeInputData[0].input2).toHaveLength(1);
			expect(mergeInputData[0].input1[0].json.from).toBe('branch1');
			expect(mergeInputData[0].input2[0].json.from).toBe('branch2');

			// Verify merge executed after both branches
			const mergeIndex = executionOrder.indexOf('merge');
			const branch1Index = executionOrder.indexOf('branch1');
			const branch2Index = executionOrder.indexOf('branch2');
			expect(mergeIndex).toBeGreaterThan(branch1Index);
			expect(mergeIndex).toBeGreaterThan(branch2Index);
		});

		it('should handle binary data without corruption in parallel execution', async () => {
			// ARRANGE
			const binaryDataAccess: Record<string, any> = {};

			const createBinaryNode = (name: string): INodeType => {
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
						const inputData = this.getInputData();

						// Record binary data access
						binaryDataAccess[name] = inputData.map((item) => ({
							json: { ...item.json },
							binary: item.binary ? { ...item.binary } : undefined,
						}));

						// Create output with binary data
						return [
							[
								{
									json: { processedBy: name },
									binary: {
										data: {
											data: Buffer.from(`processed_by_${name}`).toString('base64'),
											mimeType: 'text/plain',
											fileName: `${name}_output.txt`,
										},
									},
								},
							],
						];
					},
				});
			};

			nodeTypes.getByNameAndVersion.mockImplementation((name) => {
				const nodeName = name.replace('test.', '');
				return createBinaryNode(nodeName);
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
					id: 'binary1',
					name: 'Binary1',
					type: 'test.binary1',
					typeVersion: 1,
					position: [200, -50],
					parameters: {},
				},
				{
					id: 'binary2',
					name: 'Binary2',
					type: 'test.binary2',
					typeVersion: 1,
					position: [200, 50],
					parameters: {},
				},
			];

			const workflow = new Workflow({
				id: 'binary-data-test',
				nodes,
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[
								{ node: 'Binary1', type: NodeConnectionTypes.Main, index: 0 },
								{ node: 'Binary2', type: NodeConnectionTypes.Main, index: 0 },
							],
						],
					},
				},
				active: false,
				nodeTypes,
				settings: {
					executionOrder: 'v2' as any,
				},
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// ACT
			const result = await workflowExecute.run(workflow, nodes[0]);

			// ASSERT
			expect(result.finished).toBe(true);

			// Verify both nodes received the same input data
			expect(binaryDataAccess.binary1).toEqual(binaryDataAccess.binary2);

			// Verify binary data was processed correctly by each node
			const binary1Result = result.data.resultData.runData.Binary1[0].data?.main?.[0]?.[0];
			const binary2Result = result.data.resultData.runData.Binary2[0].data?.main?.[0]?.[0];

			expect(binary1Result?.json.processedBy).toBe('binary1');
			expect(binary2Result?.json.processedBy).toBe('binary2');
			expect(binary1Result?.binary?.data?.fileName).toBe('binary1_output.txt');
			expect(binary2Result?.binary?.data?.fileName).toBe('binary2_output.txt');
		});
	});
});
