import { itemFlowIndependentSourceExecuteOnce } from './item-flow-independent-source-execute-once';
import { itemFlowPairedItemReferences } from './item-flow-paired-item-references';
import type { WorkflowResponse } from '../../clients/n8n-client';
import { runBinaryChecks } from '../index';

function pairedEventWorkflow(eventIdExpression: string): WorkflowResponse {
	return {
		id: 'workflow-1',
		versionId: 'version-1',
		name: 'Paired calendar event workflow',
		active: false,
		nodes: [
			{ name: 'Gmail Trigger', type: 'n8n-nodes-base.gmailTrigger', parameters: {} },
			{
				name: 'Extract Event ID',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [
							{ name: 'eventId', value: '={{ $json.body.match(/event:([^\\s]+)/)[1] }}' },
							{ name: 'messageId', value: '={{ $json.id }}' },
						],
					},
				},
			},
			{
				name: 'Archive Gmail Invite',
				type: 'n8n-nodes-base.gmail',
				parameters: {
					operation: 'addLabels',
					messageId: "={{ $('Extract Event ID').item.json.messageId }}",
				},
			},
			{
				name: 'Get Calendar Event',
				type: 'n8n-nodes-base.googleCalendar',
				parameters: { operation: 'get', eventId: eventIdExpression },
			},
		],
		connections: {
			'Gmail Trigger': { main: [[{ node: 'Extract Event ID', type: 'main', index: 0 }]] },
			'Extract Event ID': { main: [[{ node: 'Archive Gmail Invite', type: 'main', index: 0 }]] },
			'Archive Gmail Invite': { main: [[{ node: 'Get Calendar Event', type: 'main', index: 0 }]] },
		},
	};
}

function releaseDigestWorkflow(releaseExecuteOnce?: boolean): WorkflowResponse {
	return {
		id: 'workflow-2',
		versionId: 'version-1',
		name: 'Release digest workflow',
		active: false,
		nodes: [
			{ name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', parameters: {} },
			{
				name: 'Fetch Launch Tasks',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://ops.example.com/api/launch-tasks' },
			},
			{
				name: 'Filter Due Tasks',
				type: 'n8n-nodes-base.filter',
				parameters: { conditions: { options: {}, conditions: [] } },
			},
			{
				name: 'Fetch Current Product Releases',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://ops.example.com/api/releases' },
				...(releaseExecuteOnce === undefined ? {} : { executeOnce: releaseExecuteOnce }),
			},
			{
				name: 'Post Slack Digest',
				type: 'n8n-nodes-base.slack',
				parameters: { text: '={{ "Release readiness" }}' },
			},
		],
		connections: {
			'Schedule Trigger': { main: [[{ node: 'Fetch Launch Tasks', type: 'main', index: 0 }]] },
			'Fetch Launch Tasks': { main: [[{ node: 'Filter Due Tasks', type: 'main', index: 0 }]] },
			'Filter Due Tasks': {
				main: [[{ node: 'Fetch Current Product Releases', type: 'main', index: 0 }]],
			},
			'Fetch Current Product Releases': {
				main: [[{ node: 'Post Slack Digest', type: 'main', index: 0 }]],
			},
		},
	};
}

describe('item-flow binary checks', () => {
	it('fails when paired item prompts use the first extracted event id for every item', async () => {
		const result = await itemFlowPairedItemReferences.run(
			pairedEventWorkflow("={{ $('Extract Event ID').first().json.eventId }}"),
			{
				prompt:
					'There can be multiple emails in one execution. Use the paired item relationship and do not use .first() for the event ID.',
			},
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Get Calendar Event');
		expect(result.comment).toContain('$("...").first()');
	});

	it('fails when a calendar lookup reads eventId from current $json after a replacing Gmail archive node', async () => {
		const result = await itemFlowPairedItemReferences.run(
			pairedEventWorkflow('={{ $json.eventId }}'),
			{
				prompt:
					'After the archive step the Gmail node output no longer contains the extracted event ID. Do not use the current $json after the Gmail archive output to read eventId; reference the upstream extraction step explicitly.',
			},
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('current $json');
		expect(result.comment).toContain('upstream extraction');
	});

	it('passes when a calendar lookup uses the paired upstream extraction item', async () => {
		const result = await itemFlowPairedItemReferences.run(
			pairedEventWorkflow("={{ $('Extract Event ID').item.json.eventId }}"),
			{
				prompt:
					'Archive the corresponding Gmail message only when the same paired Calendar event has declined. Use the paired item relationship.',
			},
		);

		expect(result).toEqual({ pass: true });
	});

	it('fails when an independent release fetch would multiply across filtered task items', async () => {
		const result = await itemFlowIndependentSourceExecuteOnce.run(releaseDigestWorkflow(), {
			prompt:
				'The release list is shared context for the digest and must be fetched only once, not once for each launch task.',
		});

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Fetch Current Product Releases');
		expect(result.comment).toContain('executeOnce');
	});

	it('passes when the independent release fetch is configured to execute once', async () => {
		const result = await itemFlowIndependentSourceExecuteOnce.run(releaseDigestWorkflow(true), {
			prompt:
				'The release list is shared context for the digest and must be fetched only once, not once for each launch task.',
		});

		expect(result).toEqual({ pass: true });
	});

	it('surfaces the item-flow failures through the binary-check runner', async () => {
		const { outcomes } = await runBinaryChecks(
			pairedEventWorkflow("={{ $('Extract Event ID').first().json.eventId }}"),
			{
				prompt:
					'There can be multiple emails in one execution. Use the paired item relationship and do not use .first() for the event ID.',
			},
			{ only: ['item_flow_paired_item_references'] },
		);

		expect(outcomes).toEqual([
			expect.objectContaining({
				name: 'item_flow_paired_item_references',
				status: 'fail',
			}),
		]);
	});
});
