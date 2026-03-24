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
					issues: { parameters: ['URL is required'] },
				},
			],
		};

		const prompt = getSystemPrompt({ canvasContext });

		expect(prompt).toContain('## Current Canvas Context');
		expect(prompt).toContain('You are assisting with workflow "My Workflow" (ID: wf-123)');
		expect(prompt).toContain('5 nodes in the workflow');
		expect(prompt).toContain('### Selected Nodes');
		expect(prompt).toContain('- HTTP Request (n8n-nodes-base.httpRequest)');
		expect(prompt).toContain('Issues:');
	});

	it('omits canvas context section when canvasContext is undefined', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).not.toContain('## Current Canvas Context');
		expect(prompt).not.toContain('### Selected Nodes');
	});

	describe('license hints', () => {
		it('includes License Limitations section when hints are provided', () => {
			const prompt = getSystemPrompt({
				licenseHints: ['**Feature A** — requires Pro plan.'],
			});

			expect(prompt).toContain('## License Limitations');
			expect(prompt).toContain('**Feature A** — requires Pro plan.');
			expect(prompt).toContain('require a license upgrade');
		});

		it('renders multiple hints as a list', () => {
			const prompt = getSystemPrompt({
				licenseHints: [
					'**Feature A** — requires Pro plan.',
					'**Feature B** — requires Enterprise plan.',
				],
			});

			expect(prompt).toContain('- **Feature A** — requires Pro plan.');
			expect(prompt).toContain('- **Feature B** — requires Enterprise plan.');
		});

		it('omits License Limitations section when hints array is empty', () => {
			const prompt = getSystemPrompt({ licenseHints: [] });

			expect(prompt).not.toContain('License Limitations');
		});

		it('omits License Limitations section when hints are not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('License Limitations');
		});
	});
});

describe('formatCanvasContextSection', () => {
	it('formats a complete canvas context with selected nodes, issues, and connections', () => {
		const ctx: InstanceAiCanvasContext = {
			workflowId: 'wf-456',
			workflowName: 'Test Workflow',
			nodeCount: 3,
			selectedNodes: [
				{
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					issues: { credentials: ['No credentials set'] },
					incomingConnections: ['Set'],
					outgoingConnections: ['Email'],
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
		expect(section).toContain('Issues:');
		expect(section).toContain('Incoming: Set');
		expect(section).toContain('Outgoing: Email');
		expect(section).toContain('- Set (n8n-nodes-base.set)');
		expect(section).toContain('Use `get-workflow` or `get-workflow-as-code`');
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

	it('omits issues/connections lines when node has none', () => {
		const ctx: InstanceAiCanvasContext = {
			workflowId: 'wf-111',
			workflowName: 'Clean Node',
			selectedNodes: [
				{
					name: 'NoOp',
					type: 'n8n-nodes-base.noOp',
				},
			],
		};

		const section = formatCanvasContextSection(ctx);

		expect(section).toContain('- NoOp (n8n-nodes-base.noOp)');
		expect(section).not.toContain('Issues:');
		expect(section).not.toContain('Incoming:');
		expect(section).not.toContain('Outgoing:');
	});
});
