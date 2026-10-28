import type { WorkflowJSON } from '@n8n/workflow-sdk';

/**
 * The workflow the onboarding example route shows. The example card lists its nodes, and the host
 * saves it as it is when the user asks for it, with no model call. It needs no credentials, so the
 * user can run it at once. Each node needs a text in `ONBOARDING_OPENING.explore.explanations`.
 */
export const ONBOARDING_EXAMPLE_WORKFLOW: WorkflowJSON = {
	name: 'Daily BBC News digest',
	nodes: [
		{
			id: 'b6a1e0f2-6f3c-4d4e-9a51-0c2f6d1e7a01',
			name: 'Every day at 09:00',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [0, 0],
			parameters: { rule: { interval: [{ triggerAtHour: 9 }] } },
		},
		{
			id: 'b6a1e0f2-6f3c-4d4e-9a51-0c2f6d1e7a02',
			name: 'Read BBC News',
			type: 'n8n-nodes-base.rssFeedRead',
			typeVersion: 1.2,
			position: [220, 0],
			parameters: { url: 'https://feeds.bbci.co.uk/news/rss.xml', options: {} },
		},
		{
			id: 'b6a1e0f2-6f3c-4d4e-9a51-0c2f6d1e7a03',
			name: 'Keep the last 24 hours',
			type: 'n8n-nodes-base.filter',
			typeVersion: 2.2,
			position: [440, 0],
			parameters: {
				conditions: {
					options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
					conditions: [
						{
							id: 'c1',
							leftValue: '={{ $json.isoDate }}',
							rightValue: '={{ $now.minus({ hours: 24 }).toISO() }}',
							operator: { type: 'dateTime', operation: 'after' },
						},
					],
					combinator: 'and',
				},
				options: {},
			},
		},
		{
			id: 'b6a1e0f2-6f3c-4d4e-9a51-0c2f6d1e7a04',
			name: 'Take the top 5',
			type: 'n8n-nodes-base.limit',
			typeVersion: 1,
			position: [660, 0],
			parameters: { maxItems: 5 },
		},
		{
			id: 'b6a1e0f2-6f3c-4d4e-9a51-0c2f6d1e7a05',
			name: 'Write the digest',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [880, 0],
			parameters: {
				mode: 'manual',
				assignments: {
					assignments: [
						{ id: 'a1', name: 'title', value: '={{ $json.title }}', type: 'string' },
						{ id: 'a2', name: 'link', value: '={{ $json.link }}', type: 'string' },
					],
				},
				options: {},
			},
		},
	],
	connections: {
		'Every day at 09:00': { main: [[{ node: 'Read BBC News', type: 'main', index: 0 }]] },
		'Read BBC News': { main: [[{ node: 'Keep the last 24 hours', type: 'main', index: 0 }]] },
		'Keep the last 24 hours': { main: [[{ node: 'Take the top 5', type: 'main', index: 0 }]] },
		'Take the top 5': { main: [[{ node: 'Write the digest', type: 'main', index: 0 }]] },
	},
};
