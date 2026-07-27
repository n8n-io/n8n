import { jsonParse } from 'n8n-workflow';
import { describe, it, expect } from 'vitest';

import { COMPILED_WORKFLOW_TRACE_RUN_NAME } from '../../tools/tool-ids';
import { GEN_AI_COMPLETION, redactLangSmithTelemetrySpan } from '../trace-payloads';

/** A compiled workflow the trace pipeline used to destroy: connections sat at the
 *  size sanitizer's depth cap; Switch conditions exceed the scrubber's depth-8 tier. */
function deepWorkflow() {
	return {
		name: 'Router',
		nodes: [
			{
				id: '0e0dd936-6a5c-4c40-b65c-8425f4ea0055',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'notify', options: {} },
			},
			{
				id: 'b7fdba3b-9506-4d76-90a1-6a482ac8f8e5',
				name: 'Route by Urgency',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.2,
				position: [200, 0],
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'high',
								conditions: {
									options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
									combinator: 'and',
									conditions: [
										{
											leftValue: '={{ $json.body.urgency }}',
											rightValue: 'high',
											operator: { type: 'string', operation: 'equals' },
										},
									],
								},
							},
						],
					},
					options: { fallbackOutput: 'extra' },
				},
			},
			{
				id: '0b1c7a68-1b2f-4e0a-a3ee-38f7e553d6f0',
				name: 'Fetch Posts',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.4,
				position: [400, 0],
				parameters: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts?userId=7' },
			},
			{
				id: '7f3f0a3c-52b5-4e2e-8b9e-2f6cfb1f4a20',
				name: 'Post to Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.5,
				position: [600, 0],
				parameters: { text: 'header was Bearer sk-ant-api03-aaaaaaaaaaaaaaaa oops' },
				credentials: { slackApi: { id: 'cred-1', name: 'Team Slack' } },
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Route by Urgency', type: 'main', index: 0 }]] },
			'Route by Urgency': {
				main: [
					[{ node: 'Fetch Posts', type: 'main', index: 0 }],
					[{ node: 'Post to Slack', type: 'main', index: 0 }],
				],
			},
		},
	} as const;
}

function exportSpan(rawPayload: boolean) {
	const span = redactLangSmithTelemetrySpan({
		name: COMPILED_WORKFLOW_TRACE_RUN_NAME,
		attributes: {
			// Producer-set flag (emitTraceOnlyChildRun with rawOutputs) — the deep
			// tier keys on this, not on the (claimable) span name.
			...(rawPayload ? { 'langsmith.metadata.raw_trace_payload': true } : {}),
			[GEN_AI_COMPLETION]: JSON.stringify({
				workflowId: 'wf-1',
				sourceHash: 'h1',
				workflow: deepWorkflow(),
			}),
		},
	}) as { attributes: Record<string, string> };
	return span.attributes[GEN_AI_COMPLETION];
}

describe('compiled-workflow trace payload fidelity through export scrubbing', () => {
	it('keeps full structure while still scrubbing secrets, credentials and URL values', () => {
		const completion = exportSpan(true);
		const parsed = jsonParse<{
			workflowId: string;
			sourceHash: string;
			workflow: ReturnType<typeof deepWorkflow>;
		}>(completion);
		const wf = parsed.workflow;

		// Consumer keying survives.
		expect(parsed.workflowId).toBe('wf-1');
		expect(parsed.sourceHash).toBe('h1');
		expect(wf.nodes[0].id).toBe('0e0dd936-6a5c-4c40-b65c-8425f4ea0055');

		// Connections survive as real arrays…
		expect(wf.connections.Webhook.main[0]?.[0]).toEqual({
			node: 'Route by Urgency',
			type: 'main',
			index: 0,
		});
		// …and Switch conditions (depth 9+) survive intact.
		expect(wf.nodes[1].parameters.rules.values[0].conditions.conditions[0]?.operator).toEqual({
			type: 'string',
			operation: 'equals',
		});

		// The URL keeps its routable identity; only the query value is redacted.
		expect(wf.nodes[2].parameters.url).toBe(
			'https://jsonplaceholder.typicode.com/posts?userId=REDACTED',
		);

		// Sensitive-named keys are still nuked wholesale…
		expect(wf.nodes[3].credentials).toBe('[redacted]');
		// …and secret patterns still fire inside ordinary strings.
		expect(wf.nodes[3].parameters.text).not.toContain('sk-ant-');
		expect(wf.nodes[3].parameters.text).toContain('[REDACTED]');

		// No structural placeholders anywhere in the payload.
		expect(completion).not.toMatch(/\[array\(\d+\)\]|\[object \d+ keys\]|\[redacted-depth-limit\]/);
	});

	it('keeps the default depth cap without the producer flag — even for a same-named span', () => {
		const completion = exportSpan(false);
		expect(completion).toContain('[redacted-depth-limit]');
	});
});
