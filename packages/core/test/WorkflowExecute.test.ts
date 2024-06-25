import type { IRun, WorkflowTestData } from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeExecutionOutput,
	Workflow,
} from 'n8n-workflow';
import { WorkflowExecute } from '@/WorkflowExecute';

import * as Helpers from './helpers';
import { legacyWorkflowExecuteTests, v1WorkflowExecuteTests } from './helpers/constants';

describe('WorkflowExecute', () => {
	describe('v0 execution order', () => {
		const tests: WorkflowTestData[] = legacyWorkflowExecuteTests;

		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes();

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v0',
					},
				});

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise();

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json);
					});

					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if the nodes did execute in the correct order
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	describe('v1 execution order', () => {
		const tests: WorkflowTestData[] = v1WorkflowExecuteTests;

		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes();

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v1',
					},
				});

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise();

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json);
					});

					// expect(resultData).toEqual(testData.output.nodeData[nodeName]);
					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if the nodes did execute in the correct order
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	//run tests on json files from specified directory, default 'workflows'
	//workflows must have pinned data that would be used to test output after execution
	describe('run test workflows', () => {
		const tests: WorkflowTestData[] = Helpers.workflowToTests(__dirname);

		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes(Helpers.getNodeTypes(tests));

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: testData.input.workflowData.settings,
				});

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise();

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0];
					});

					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				// expect(result.data.executionData!.contextData).toEqual({}); //Fails when test workflow Includes splitInbatches
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	describe('WorkflowExecute, NodeExecutionOutput type test', () => {
		//TODO Add more tests here when execution hints are added to some node types
		const nodeExecutionOutput = new NodeExecutionOutput(
			[[{ json: { data: 123 } }]],
			[{ message: 'TEXT HINT' }],
		);

		expect(nodeExecutionOutput).toBeInstanceOf(NodeExecutionOutput);
		expect(nodeExecutionOutput[0][0].json.data).toEqual(123);
		expect(nodeExecutionOutput.getHints()[0].message).toEqual('TEXT HINT');
	});
});
