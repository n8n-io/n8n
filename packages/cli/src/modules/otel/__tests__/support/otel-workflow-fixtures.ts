import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

export function createMultiNodeWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: { category: 'doNothing' },
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [200, 0] as [number, number],
				id: uuid(),
				name: 'DebugHelper',
			},
		],
		connections: {
			Trigger: {
				main: [
					[
						{
							node: 'DebugHelper',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};
}

/** The wait is over the Wait node's 65-second threshold, so the execution always suspends. */
export function createWaitWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: { resume: 'timeInterval', amount: 10, unit: 'minutes' },
				type: 'n8n-nodes-base.wait',
				typeVersion: 1.1,
				position: [200, 0] as [number, number],
				id: uuid(),
				name: 'Wait',
			},
			{
				parameters: { category: 'doNothing' },
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [400, 0] as [number, number],
				id: uuid(),
				name: 'After Wait',
			},
		],
		connections: {
			Trigger: {
				main: [[{ node: 'Wait', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			Wait: {
				main: [[{ node: 'After Wait', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		},
		pinData: {},
	};
}

export function createFailingWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: {
					throwErrorType: 'Error',
					throwErrorMessage: 'Test error',
				},
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [208, 0] as [number, number],
				id: uuid(),
				name: 'DebugHelper',
			},
		],
		connections: {
			Trigger: {
				main: [
					[
						{
							node: 'DebugHelper',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};
}

export function createTracingMetadataWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: {},
				type: 'n8n-nodes-base.tracingTestNode',
				typeVersion: 1,
				position: [200, 0] as [number, number],
				id: uuid(),
				name: 'TracingTestNode',
			},
		],
		connections: {
			Trigger: {
				main: [
					[
						{
							node: 'TracingTestNode',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};
}

export function createSubWorkflowTriggerFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Execute Workflow Trigger',
			},
		],
		connections: {},
		pinData: {},
	};
}

export function createParentWithSubWorkflowFixture(childWorkflowId: string) {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: {
					source: 'database',
					workflowId: childWorkflowId,
				},
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				position: [200, 0] as [number, number],
				id: uuid(),
				name: 'Execute Workflow',
			},
		],
		connections: {
			Trigger: {
				main: [
					[
						{
							node: 'Execute Workflow',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};
}

export function createSimpleWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
		],
		connections: {},
		pinData: {},
	};
}
