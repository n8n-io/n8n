import type { InstanceAiCanvasContext } from '@n8n/api-types';

import { getSystemPrompt, formatCanvasContextSection } from '../system-prompt';

describe('getSystemPrompt', () => {
	it('includes canvas context section when canvasContext is provided', () => {
		const canvasContext: InstanceAiCanvasContext = {
			workflowId: 'wf-123',
			workflowName: 'My Workflow',
			nodeCount: 5,
			selectedNodes: [
				{
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: { url: 'https://example.com' },
				},
			],
		};

		const prompt = getSystemPrompt({ canvasContext });

		expect(prompt).toContain('## Current Canvas Context');
		expect(prompt).toContain('You are assisting with workflow "My Workflow" (ID: wf-123)');
		expect(prompt).toContain('5 nodes in the workflow');
		expect(prompt).toContain('### Selected Nodes');
		expect(prompt).toContain('- HTTP Request (n8n-nodes-base.httpRequest)');
		expect(prompt).toContain('Parameters: {"url":"https://example.com"}');
	});

	it('omits canvas context section when canvasContext is undefined', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).not.toContain('## Current Canvas Context');
		expect(prompt).not.toContain('### Selected Nodes');
	});
});

describe('formatCanvasContextSection', () => {
	it('formats a complete canvas context with selected nodes', () => {
		const ctx: InstanceAiCanvasContext = {
			workflowId: 'wf-456',
			workflowName: 'Test Workflow',
			nodeCount: 3,
			selectedNodes: [
				{
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					parameters: { channel: '#general', text: 'Hello' },
				},
				{
					name: 'Set',
					type: 'n8n-nodes-base.set',
				},
			],
		};

		const section = formatCanvasContextSection(ctx);

		expect(section).toContain('## Current Canvas Context');
		expect(section).toContain('You are assisting with workflow "Test Workflow" (ID: wf-456)');
		expect(section).toContain('3 nodes in the workflow');
		expect(section).toContain('### Selected Nodes');
		expect(section).toContain('- Slack (n8n-nodes-base.slack)');
		expect(section).toContain('Parameters: {"channel":"#general","text":"Hello"}');
		expect(section).toContain('- Set (n8n-nodes-base.set)');
		// Set has no parameters — should not include a Parameters line for it
		expect(section).not.toContain('- Set (n8n-nodes-base.set)\n  Parameters:');
	});

	it('omits selected nodes section when no nodes are selected', () => {
		const ctx: InstanceAiCanvasContext = {
			workflowId: 'wf-789',
			workflowName: 'Empty Selection',
			nodeCount: 2,
		};

		const section = formatCanvasContextSection(ctx);

		expect(section).toContain('## Current Canvas Context');
		expect(section).toContain('You are assisting with workflow "Empty Selection" (ID: wf-789)');
		expect(section).toContain('2 nodes in the workflow');
		expect(section).not.toContain('### Selected Nodes');
	});

	it('omits node count when not provided', () => {
		const ctx: InstanceAiCanvasContext = {
			workflowId: 'wf-000',
			workflowName: 'No Count',
		};

		const section = formatCanvasContextSection(ctx);

		expect(section).toContain('## Current Canvas Context');
		expect(section).not.toContain('nodes in the workflow');
	});

	it('omits parameters line when node has empty parameters', () => {
		const ctx: InstanceAiCanvasContext = {
			workflowId: 'wf-111',
			workflowName: 'Params Test',
			selectedNodes: [
				{
					name: 'NoOp',
					type: 'n8n-nodes-base.noOp',
					parameters: {},
				},
			],
		};

		const section = formatCanvasContextSection(ctx);

		expect(section).toContain('- NoOp (n8n-nodes-base.noOp)');
		expect(section).not.toContain('Parameters:');
	});
});
