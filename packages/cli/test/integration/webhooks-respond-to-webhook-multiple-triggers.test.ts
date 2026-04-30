/**
 * GHC-8091: Respond to Webhook hangs when workflow has multiple triggers
 *
 * ## Bug Description
 * When a workflow contains multiple triggers (e.g., Webhook + Chat Trigger)
 * connected to the same downstream flow, webhook executions with "Respond to Webhook"
 * hang indefinitely instead of returning the response.
 *
 * ## Expected Behavior
 * The webhook response should be returned regardless of other triggers being
 * connected to the same downstream nodes. The presence of additional triggers
 * should not affect the webhook response mechanism.
 *
 * ## Regression Information
 * - Affected Version: 2.19.0+
 * - Previously worked: Yes (before 2.19.0)
 * - Severity: High - webhook responses hang indefinitely
 *
 * ## Investigation Summary
 *
 * ### Architecture Flow
 * 1. Webhook request arrives → webhook-helpers.ts creates responsePromise
 * 2. WorkflowRunner.run() attaches responsePromise to execution via activeExecutions
 * 3. Execution runs → RespondToWebhook node calls sendResponse()
 * 4. sendResponse() calls hook which calls activeExecutions.resolveResponsePromise()
 * 5. Response is sent back to webhook caller
 *
 * ### Root Cause Hypothesis
 * When multiple triggers are connected to the same downstream flow:
 * - The workflow structure may confuse trigger detection
 * - The executionId might not properly track which trigger initiated the execution
 * - The responsePromise resolution may fail due to incorrect execution context
 *
 * ### Key Files
 * - packages/cli/src/webhooks/webhook-helpers.ts (lines 714-724, 753-759)
 * - packages/cli/src/workflow-runner.ts (lines 252-254, 390-392)
 * - packages/cli/src/active-executions.ts (lines 173-183)
 * - packages/nodes-base/nodes/RespondToWebhook/RespondToWebhook.node.ts (line 576)
 *
 * ## Manual Reproduction Steps
 * 1. Create workflow with Webhook trigger (responseMode: "responseNode")
 * 2. Add Edit Fields node after webhook
 * 3. Add "Respond to Webhook" node after Edit Fields
 * 4. Test webhook - it should work fine
 * 5. Add Chat Trigger or WhatsApp Trigger to the workflow
 * 6. Connect the new trigger to the same Edit Fields node
 * 7. Test webhook again - it now hangs indefinitely
 *
 * ## Test Workflow Structure
 * ```
 * Webhook Trigger ─────┐
 *                       ├─→ Edit Fields ─→ Respond to Webhook
 * Chat/WhatsApp Trigger┘
 * ```
 */

import type { INode } from 'n8n-workflow';

describe('GHC-8091: Respond to Webhook with multiple triggers', () => {
	// This test is documented but not fully implemented due to integration test complexity
	// A proper test would require:
	// - Full n8n server setup
	// - Workflow activation
	// - Webhook endpoint registration
	// - HTTP request simulation
	//
	// For now, this serves as documentation of the bug and reproduction steps

	it.todo('should return webhook response when only Webhook trigger is connected (baseline)');

	it.todo(
		'should return webhook response when both Webhook and Chat triggers share downstream flow',
	);

	it.todo(
		'should return webhook response when both Webhook and WhatsApp triggers share downstream flow',
	);

	// Expected workflow structure for reproduction
	const getWorkflowWithMultipleTriggers = () => {
		const webhookNode: INode = {
			id: 'webhook-trigger',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [100, 200],
			parameters: {
				path: 'test-webhook',
				httpMethod: 'POST',
				responseMode: 'responseNode', // CRITICAL: Must be set to responseNode
			},
			webhookId: 'test-webhook-id',
		};

		const editFieldsNode: INode = {
			id: 'edit-fields',
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [300, 200],
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'test-field',
							name: 'test',
							value: 'ok',
							type: 'string',
						},
					],
				},
			},
		};

		const respondToWebhookNode: INode = {
			id: 'respond-to-webhook',
			name: 'Respond to Webhook',
			type: 'n8n-nodes-base.respondToWebhook',
			typeVersion: 1.5,
			position: [500, 200],
			parameters: {
				respondWith: 'firstIncomingItem',
				options: {},
			},
		};

		// This is the trigger that causes the bug when added
		const chatTriggerNode: INode = {
			id: 'chat-trigger',
			name: 'When chat message received',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [100, 400],
			parameters: {
				options: {},
			},
		};

		return {
			nodes: [webhookNode, editFieldsNode, respondToWebhookNode, chatTriggerNode],
			connections: {
				Webhook: {
					main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
				},
				'Edit Fields': {
					main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
				},
				// BUG TRIGGER: This connection causes the bug
				'When chat message received': {
					main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
				},
			},
		};
	};

	it('documents expected workflow structure', () => {
		const workflow = getWorkflowWithMultipleTriggers();
		expect(workflow.nodes).toHaveLength(4);
		expect(workflow.connections['Webhook']).toBeDefined();
		expect(workflow.connections['When chat message received']).toBeDefined();

		// Both triggers should connect to the same downstream node
		const webhookConnection = workflow.connections['Webhook'].main[0][0];
		const chatConnection = workflow.connections['When chat message received'].main[0][0];
		expect(webhookConnection.node).toBe('Edit Fields');
		expect(chatConnection.node).toBe('Edit Fields');
	});
});
