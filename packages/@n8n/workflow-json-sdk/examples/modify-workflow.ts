/**
 * Modify Existing Workflow Example
 *
 * This example demonstrates how to load an existing workflow,
 * modify it by adding nodes and connections, and export it back to JSON.
 */

import { fromJSON, type WorkflowJSON } from '../src/index';

// Simulated existing workflow (this would typically come from an API or file)
const existingWorkflowJSON: WorkflowJSON = {
	name: 'Customer Data Processing',
	meta: {
		instanceId: 'existing-instance-id',
	},
	nodes: [
		{
			id: 'trigger-1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			position: [100, 200],
			parameters: {
				path: 'customer-data',
				httpMethod: 'POST',
			},
			typeVersion: 1,
		},
		{
			id: 'set-1',
			name: 'Transform Data',
			type: 'n8n-nodes-base.set',
			position: [300, 200],
			parameters: {
				values: {
					string: [
						{ name: 'customer_name', value: '={{ $json.name }}' },
						{ name: 'customer_email', value: '={{ $json.email }}' },
					],
				},
			},
			typeVersion: 1,
		},
	],
	connections: {
		Webhook: {
			main: [[{ node: 'Transform Data', type: 'main', index: 0 }]],
		},
	},
};

// Load the existing workflow
const wf = fromJSON(existingWorkflowJSON);

console.log('Original workflow loaded with nodes:', existingWorkflowJSON.nodes.length);

// Add a new email notification node
const emailNode = wf
	.node('Send Email Notification')
	.type('n8n-nodes-base.emailSend')
	.position(500, 200)
	.parameters({
		fromEmail: 'notifications@company.com',
		toEmail: 'admin@company.com',
		subject: 'New Customer Registration',
		text: `New customer: {{ $json.customer_name }} ({{ $json.customer_email }})`,
	})
	.version(2);

// Add a database node to store the data
const dbNode = wf
	.node('Save to Database')
	.type('n8n-nodes-base.postgres')
	.position(500, 300)
	.parameters({
		operation: 'insert',
		schema: 'public',
		table: 'customers',
		columns: 'customer_name,customer_email',
		options: {},
	})
	.version(2);

// Add a Slack notification node
const slackNode = wf
	.node('Notify Slack')
	.type('n8n-nodes-base.slack')
	.position(700, 250)
	.parameters({
		operation: 'post',
		channel: '#new-customers',
		text: 'New customer registered: {{ $json.customer_name }}',
	})
	.version(2);

// Get reference to the existing Transform Data node
// Note: We need to reference it by creating a node with the same name
// The SDK will recognize it as an existing node
const transformNode = wf.node('Transform Data');

// Connect the new nodes
// Transform Data -> Email Notification
wf.connection().from(transformNode).to(emailNode).build();

// Transform Data -> Database
wf.connection().from(transformNode).to(dbNode).build();

// Email Notification -> Slack
wf.connection().from(emailNode).to(slackNode).build();

// Database -> Slack
wf.connection().from(dbNode).to(slackNode).build();

// Add workflow settings
wf.settings({
	executionOrder: 'v1',
	saveManualExecutions: true,
	saveDataSuccessExecution: 'all',
	saveDataErrorExecution: 'all',
});

// Mark as active
wf.active(true);

// Export the modified workflow
const modifiedWorkflowJSON = wf.toJSON();

console.log('\nModified workflow now has nodes:', modifiedWorkflowJSON.nodes.length);
console.log('Added nodes:');
console.log('- Send Email Notification');
console.log('- Save to Database');
console.log('- Notify Slack');
console.log('\nNew connections created:');
console.log('- Transform Data → Send Email Notification');
console.log('- Transform Data → Save to Database');
console.log('- Send Email Notification → Notify Slack');
console.log('- Save to Database → Notify Slack');

// Output the full modified workflow JSON
console.log('\n=== Modified Workflow JSON ===\n');
console.log(JSON.stringify(modifiedWorkflowJSON, null, 2));

// Example: Saving back to API
// await fetch('/api/workflows/123', {
//   method: 'PUT',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(modifiedWorkflowJSON)
// });
