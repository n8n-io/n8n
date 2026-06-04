import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { validateWorkflowCompleteness } from '../workflow-completeness';

describe('validateWorkflowCompleteness', () => {
	it('reports terminal branch, disconnected, and unreachable nodes', () => {
		const workflow = {
			nodes: [
				{ name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
				{ name: 'Any Emails?', type: 'n8n-nodes-base.if', parameters: {} },
				{ name: 'Send Digest', type: 'n8n-nodes-base.gmail', parameters: { operation: 'send' } },
			],
			connections: {
				Schedule: { main: [[{ node: 'Any Emails?', type: 'main', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;

		const result = validateWorkflowCompleteness(workflow);

		expect(result.valid).toBe(false);
		expect(result.issues.map((issue) => issue.code)).toEqual([
			'TERMINAL_BRANCH',
			'DISCONNECTED_NODES',
			'UNREACHABLE_NODES',
		]);
		expect(result.issues[1].message).toContain('Send Digest');
		expect(result.issues[2].message).toContain('Send Digest');
	});

	it('does not infer missing semantic stages from the build spec', () => {
		const workflow = {
			nodes: [
				{ name: 'Every Morning 07:00', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
				{ name: 'Get Last 24h Emails', type: 'n8n-nodes-base.gmail', parameters: {} },
				{ name: 'Aggregate Emails', type: 'n8n-nodes-base.aggregate', parameters: {} },
				{ name: 'Done', type: 'n8n-nodes-base.noOp', parameters: {} },
			],
			connections: {
				'Every Morning 07:00': {
					main: [[{ node: 'Get Last 24h Emails', type: 'main', index: 0 }]],
				},
				'Get Last 24h Emails': {
					main: [[{ node: 'Aggregate Emails', type: 'main', index: 0 }]],
				},
				'Aggregate Emails': {
					main: [[{ node: 'Done', type: 'main', index: 0 }]],
				},
			},
		} as unknown as WorkflowJSON;

		expect(validateWorkflowCompleteness(workflow)).toEqual({
			valid: true,
			issues: [],
		});
	});

	it('accepts a complete daily digest graph with both IF paths wired', () => {
		const workflow = {
			nodes: [
				{ name: 'Every Morning 07:00', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
				{ name: 'Get Last 24h Emails', type: 'n8n-nodes-base.gmail', parameters: {} },
				{ name: 'Any Emails?', type: 'n8n-nodes-base.if', parameters: {} },
				{ name: 'Extract & Prioritize', type: 'n8n-nodes-base.openAi', parameters: {} },
				{
					name: 'Send Digest Email',
					type: 'n8n-nodes-base.gmail',
					parameters: { operation: 'send' },
				},
				{ name: 'No Emails Today', type: 'n8n-nodes-base.noOp', parameters: {} },
			],
			connections: {
				'Every Morning 07:00': {
					main: [[{ node: 'Get Last 24h Emails', type: 'main', index: 0 }]],
				},
				'Get Last 24h Emails': {
					main: [[{ node: 'Any Emails?', type: 'main', index: 0 }]],
				},
				'Any Emails?': {
					main: [
						[{ node: 'Extract & Prioritize', type: 'main', index: 0 }],
						[{ node: 'No Emails Today', type: 'main', index: 0 }],
					],
				},
				'Extract & Prioritize': {
					main: [[{ node: 'Send Digest Email', type: 'main', index: 0 }]],
				},
			},
		} as unknown as WorkflowJSON;

		expect(validateWorkflowCompleteness(workflow)).toEqual({
			valid: true,
			issues: [],
		});
	});
});
