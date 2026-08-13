import type { IConnections, INodeParameters } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import { validateWebhookResponse } from './webhook-response';

interface WebhookNodeOptions {
	name?: string;
	id?: string;
	responseMode?: string;
}

interface RespondToWebhookNodeOptions {
	name?: string;
	id?: string;
}

function createWebhookNode(options: WebhookNodeOptions = {}): SimpleWorkflow['nodes'][0] {
	const { name = 'Webhook', id = '1', responseMode } = options;

	const parameters: Record<string, unknown> = {
		path: 'webhook-path',
		httpMethod: 'POST',
	};

	if (responseMode) {
		parameters.responseMode = responseMode;
	}

	return {
		id,
		name,
		type: 'n8n-nodes-base.webhook',
		parameters: parameters as INodeParameters,
		typeVersion: 2,
		position: [0, 0],
	};
}

function createRespondToWebhookNode(
	options: RespondToWebhookNodeOptions = {},
): SimpleWorkflow['nodes'][0] {
	const { name = 'Respond to Webhook', id = '2' } = options;

	return {
		id,
		name,
		type: 'n8n-nodes-base.respondToWebhook',
		parameters: {} as INodeParameters,
		typeVersion: 1,
		position: [200, 0],
	};
}

function createWorkflow(
	nodes: SimpleWorkflow['nodes'],
	connections: IConnections = {},
): SimpleWorkflow {
	return {
		name: 'Test Workflow',
		nodes,
		connections,
	} as SimpleWorkflow;
}

/**
 * Creates a connection from source node to target node
 */
function createConnection(sourceNode: string, targetNode: string): IConnections {
	return {
		[sourceNode]: {
			main: [[{ node: targetNode, type: 'main', index: 0 }]],
		},
	};
}

/**
 * Merges multiple connection objects
 */
function mergeConnections(...connectionsList: IConnections[]): IConnections {
	const merged: IConnections = {};
	for (const connections of connectionsList) {
		for (const [sourceNode, nodeConnections] of Object.entries(connections)) {
			if (!merged[sourceNode]) {
				merged[sourceNode] = { main: [] };
			}
			for (const [type, outputs] of Object.entries(nodeConnections)) {
				if (!merged[sourceNode][type]) {
					merged[sourceNode][type] = [];
				}
				for (let i = 0; i < outputs.length; i++) {
					merged[sourceNode][type][i] ??= [];
					const output = outputs[i];
					if (output) {
						merged[sourceNode][type][i] = [...(merged[sourceNode][type][i] ?? []), ...output];
					}
				}
			}
		}
	}
	return merged;
}

describe('validateWebhookResponse', () => {
	describe('webhook-response-mode-missing-respond-node', () => {
		it('should flag webhook with responseMode=responseNode but no connected RespondToWebhook', () => {
			const workflow = createWorkflow([createWebhookNode({ responseMode: 'responseNode' })]);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(1);
			expect(violations[0]).toMatchObject({
				name: 'webhook-response-mode-missing-respond-node',
				type: 'critical',
				pointsDeducted: 50,
			});
		});

		it('should flag when RespondToWebhook exists but is not connected to webhook', () => {
			const workflow = createWorkflow([
				createWebhookNode({ responseMode: 'responseNode' }),
				createRespondToWebhookNode(),
			]);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(1);
			expect(violations[0].name).toBe('webhook-response-mode-missing-respond-node');
		});

		it('should not flag when RespondToWebhook is connected downstream', () => {
			const workflow = createWorkflow(
				[createWebhookNode({ responseMode: 'responseNode' }), createRespondToWebhookNode()],
				createConnection('Webhook', 'Respond to Webhook'),
			);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});

		it.each(['onReceived', 'lastNode', 'streaming', undefined])(
			'should not flag webhook with responseMode=%s and no RespondToWebhook',
			(responseMode) => {
				const workflow = createWorkflow([createWebhookNode({ responseMode })]);

				const violations = validateWebhookResponse(workflow);

				expect(violations).toHaveLength(0);
			},
		);
	});

	describe('webhook-response-mode-mismatch', () => {
		it.each([
			['onReceived', 'onReceived'],
			['lastNode', 'lastNode'],
			['streaming', 'streaming'],
			[undefined, 'undefined'],
		])(
			'should flag when RespondToWebhook is connected but webhook has responseMode=%s',
			(responseMode, expectedInDescription) => {
				const workflow = createWorkflow(
					[createWebhookNode({ responseMode }), createRespondToWebhookNode()],
					createConnection('Webhook', 'Respond to Webhook'),
				);

				const violations = validateWebhookResponse(workflow);

				expect(violations).toHaveLength(1);
				expect(violations[0]).toMatchObject({
					name: 'webhook-response-mode-mismatch',
					type: 'critical',
					pointsDeducted: 50,
				});
				expect(violations[0].description).toContain(`responseMode='${expectedInDescription}'`);
			},
		);

		it('should not flag when RespondToWebhook exists but is not connected', () => {
			const workflow = createWorkflow([
				createWebhookNode({ responseMode: 'onReceived' }),
				createRespondToWebhookNode(),
			]);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});

		it('should not flag when RespondToWebhook is connected and responseMode=responseNode', () => {
			const workflow = createWorkflow(
				[createWebhookNode({ responseMode: 'responseNode' }), createRespondToWebhookNode()],
				createConnection('Webhook', 'Respond to Webhook'),
			);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		it('should handle empty workflow', () => {
			const workflow = createWorkflow([]);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});

		it('should handle workflow with no nodes', () => {
			const workflow = {
				name: 'Test Workflow',
				nodes: undefined as unknown as SimpleWorkflow['nodes'],
				connections: {},
			} as SimpleWorkflow;

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});

		it('should flag only the webhook without connected RespondToWebhook when multiple webhooks exist', () => {
			const workflow = createWorkflow(
				[
					createWebhookNode({ id: '1', name: 'Webhook 1', responseMode: 'responseNode' }),
					createWebhookNode({ id: '2', name: 'Webhook 2', responseMode: 'responseNode' }),
					createRespondToWebhookNode({ id: '3', name: 'Respond to Webhook' }),
				],
				createConnection('Webhook 1', 'Respond to Webhook'),
			);

			const violations = validateWebhookResponse(workflow);

			// Only Webhook 2 should be flagged since Webhook 1 is connected to RespondToWebhook
			expect(violations).toHaveLength(1);
			expect(violations[0].name).toBe('webhook-response-mode-missing-respond-node');
			expect(violations[0].metadata?.webhookNodeName).toBe('Webhook 2');
		});

		it('should handle RespondToWebhook connected through intermediate nodes', () => {
			const workflow = createWorkflow(
				[
					createWebhookNode({ responseMode: 'responseNode' }),
					{
						id: '2',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {} as INodeParameters,
						typeVersion: 1,
						position: [100, 0],
					},
					createRespondToWebhookNode({ id: '3' }),
				],
				mergeConnections(
					createConnection('Webhook', 'Set'),
					createConnection('Set', 'Respond to Webhook'),
				),
			);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});

		it('should handle workflow with only RespondToWebhook node (no webhook)', () => {
			const workflow = createWorkflow([createRespondToWebhookNode()]);

			const violations = validateWebhookResponse(workflow);

			expect(violations).toHaveLength(0);
		});

		it('should handle workflow with undefined connections', () => {
			const workflow = {
				name: 'Test Workflow',
				nodes: [createWebhookNode({ responseMode: 'responseNode' }), createRespondToWebhookNode()],
				connections: undefined as unknown as IConnections,
			} as SimpleWorkflow;

			const violations = validateWebhookResponse(workflow);

			// Should flag because connections is undefined, so no RespondToWebhook is connected
			expect(violations).toHaveLength(1);
			expect(violations[0].name).toBe('webhook-response-mode-missing-respond-node');
		});
	});
});
