/**
 * Reusable workflow fixtures for execution context propagation tests.
 * These fixtures create minimal workflow structures needed for testing.
 */

import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

/**
 * Creates a minimal child workflow with Execute Workflow Trigger.
 * This is the simplest sub-workflow that can be called by another workflow.
 */
export function createSubWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {
					workflowInputs: {
						values: [{ name: 'test' }],
					},
				},
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
		],
		connections: {},
		pinData: {},
	};
}

/**
 * Creates a workflow with Manual Trigger + Execute Workflow node.
 * This workflow can call another workflow (sub-workflow).
 */
export function createParentWorkflowFixture(childWorkflowId: string) {
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
					workflowId: {
						__rl: true,
						value: childWorkflowId,
						mode: 'list',
						cachedResultUrl: `/workflow/${childWorkflowId}`,
						cachedResultName: 'Child Workflow',
					},
					workflowInputs: {
						mappingMode: 'defineBelow',
						value: { test: 'test' },
						matchingColumns: ['level'],
						schema: [
							{
								id: 'test',
								displayName: 'test',
								required: false,
								defaultMatch: false,
								display: true,
								canBeUsedToMatch: true,
								type: 'string',
								removed: false,
							},
						],
						attemptToConvertTypes: false,
						convertFieldsToString: true,
					},
					options: {},
				},
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.3,
				position: [208, 0] as [number, number],
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

/**
 * Creates a middle-tier workflow with Execute Workflow Trigger + Execute Workflow node.
 * This workflow can be called by a parent and can call a child (for nested scenarios).
 */
export function createMiddleWorkflowFixture(childWorkflowId: string) {
	return {
		nodes: [
			{
				parameters: {
					workflowInputs: {
						values: [{ name: 'test' }],
					},
				},
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0] as [number, number],
				id: uuid(),
				name: 'Trigger',
			},
			{
				parameters: {
					workflowId: {
						__rl: true,
						value: childWorkflowId,
						mode: 'list',
						cachedResultUrl: `/workflow/${childWorkflowId}`,
						cachedResultName: 'Grandchild Workflow',
					},
					workflowInputs: {
						mappingMode: 'defineBelow',
						value: { test: 'test' },
						matchingColumns: ['level'],
						schema: [
							{
								id: 'test',
								displayName: 'test',
								required: false,
								defaultMatch: false,
								display: true,
								canBeUsedToMatch: true,
								type: 'string',
								removed: false,
							},
						],
						attemptToConvertTypes: false,
						convertFieldsToString: true,
					},
					options: {},
				},
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.3,
				position: [208, 0] as [number, number],
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

/**
 * Creates a simple workflow with just Manual Trigger.
 * Useful for testing context isolation.
 */
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

/**
 * Creates an error workflow with Error Trigger node.
 * This workflow gets executed when another workflow fails (if configured).
 */
export function createErrorWorkflowFixture() {
	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.errorTrigger',
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

/**
 * Creates a workflow that throws an error using DebugHelper node.
 * Useful for testing error workflow propagation.
 */
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

/**
 * Creates a workflow that fails and is configured to trigger an error workflow.
 * @param errorWorkflowId - The ID of the error workflow to trigger on failure
 */
export function createWorkflowWithErrorHandlerFixture(errorWorkflowId: string) {
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
					throwErrorMessage: 'Test error for error workflow',
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
		settings: {
			errorWorkflow: errorWorkflowId,
		},
		pinData: {},
	};
}
