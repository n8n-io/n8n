/**
 * Basic Workflow Example
 *
 * This example demonstrates how to create a simple workflow with a manual trigger
 * and a few Set nodes connected together.
 */

import { workflow } from '../src/index';

// Create a new workflow
const wf = workflow({ name: 'Basic Workflow Example' });

// Add metadata
wf.meta({
	instanceId: 'example-instance-id',
	templateCredsSetupCompleted: true,
});

// Create a manual trigger node
const manualTrigger = wf
	.node('Manual Trigger')
	.type('n8n-nodes-base.manualTrigger')
	.position(100, 200)
	.parameters({});

// Create Set nodes
const setA = wf
	.node('Set A')
	.type('n8n-nodes-base.set')
	.position(300, 150)
	.parameters({
		values: {
			string: [{ name: 'status', value: 'processing' }],
		},
		options: {},
	});

const setB = wf
	.node('Set B')
	.type('n8n-nodes-base.set')
	.position(300, 250)
	.parameters({
		values: {
			string: [{ name: 'status', value: 'queued' }],
		},
		options: {},
	});

const setC = wf
	.node('Set C')
	.type('n8n-nodes-base.set')
	.position(500, 200)
	.parameters({
		values: {
			string: [{ name: 'status', value: 'completed' }],
		},
		options: {},
	});

// Create connections
// Connect trigger to both Set A and Set B
wf.connection().from(manualTrigger).to([setA, setB]).build();

// Connect Set A to Set C
wf.connection().from(setA).to(setC).build();

// Connect Set B to Set C
wf.connection().from(setB).to(setC).build();

// Export to JSON
const workflowJSON = wf.toJSON();

// Output the workflow JSON
console.log(JSON.stringify(workflowJSON, null, 2));
