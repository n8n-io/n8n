import { runBinaryChecks } from '../binaryChecks/index';
import type { WorkflowResponse } from '../clients/n8n-client';

function workflowWebhookOnly(): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Webhook only',
		active: false,
		nodes: [
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} },
			{
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: { assignments: { assignments: [{ name: 'x', value: '1' }] } },
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
	};
}

describe('runBinaryChecks · applicability', () => {
	it("marks subject-based checks as N/A when the subject doesn't appear in the workflow", async () => {
		const { outcomes } = await runBinaryChecks(workflowWebhookOnly(), {
			prompt: 'Just a webhook + set',
		});

		const byName = new Map(outcomes.map((o) => [o.name, o]));

		expect(byName.get('agent_has_language_model')?.status).toBe('n_a');
		expect(byName.get('agent_has_dynamic_prompt')?.status).toBe('n_a');
		expect(byName.get('memory_properly_connected')?.status).toBe('n_a');
		expect(byName.get('memory_session_key_expression')?.status).toBe('n_a');
		expect(byName.get('vector_store_has_embeddings')?.status).toBe('n_a');
		expect(byName.get('switch_fallback_output_enabled')?.status).toBe('n_a');
		expect(byName.get('tools_have_parameters')?.status).toBe('n_a');
		expect(byName.get('http_generic_auth_type_matches_prompt')?.status).toBe('n_a');

		expect(byName.get('has_nodes')?.status).toBe('pass');
		expect(byName.get('has_trigger')?.status).toBe('pass');
		expect(byName.get('all_nodes_connected')?.status).toBe('pass');
	});

	it('excludes N/A outcomes from per-check Feedback but keeps them in the outcomes list', async () => {
		const { feedback, outcomes } = await runBinaryChecks(workflowWebhookOnly(), {
			prompt: 'Just a webhook + set',
		});

		const naNames = new Set(outcomes.filter((o) => o.status === 'n_a').map((o) => o.name));
		expect(naNames.size).toBeGreaterThan(0);

		const metricNames = new Set(feedback.filter((f) => f.kind === 'metric').map((f) => f.metric));
		for (const naName of naNames) {
			expect(metricNames.has(naName)).toBe(false);
		}
	});

	it('counts only non-N/A checks in the pass_rate denominator', async () => {
		const { feedback, outcomes } = await runBinaryChecks(workflowWebhookOnly(), {
			prompt: 'Just a webhook + set',
		});

		const passRate = feedback.find((f) => f.metric === 'pass_rate');
		expect(passRate).toBeDefined();

		const scored = outcomes.filter((o) => o.status !== 'n_a');
		const passes = scored.filter((o) => o.status === 'pass').length;
		const expected = scored.length > 0 ? passes / scored.length : 0;
		expect(passRate?.score).toBeCloseTo(expected, 5);
		expect(passRate?.comment).toMatch(/N\/A/);
	});
});
