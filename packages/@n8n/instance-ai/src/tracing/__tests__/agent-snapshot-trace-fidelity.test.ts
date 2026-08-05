import { jsonParse } from 'n8n-workflow';
import { describe, it, expect } from 'vitest';

import { AGENT_SNAPSHOT_TRACE_RUN_NAME } from '../../tools/tool-ids';
import { GEN_AI_COMPLETION, redactLangSmithTelemetrySpan } from '../trace-payloads';

/** A config nested past the sanitizer's depth cap: a node tool's parameters sit
 *  at depth 5+ under the payload root, and its filter conditions at depth 9+. */
function deepAgentConfig() {
	return {
		name: 'Support Triage',
		model: 'anthropic/claude-sonnet-4-5',
		credential: 'cred-anthropic-1',
		instructions:
			'Escalate anything a customer marks as production-down to the ops rota before replying. Older key sk-ant-api03-aaaaaaaaaaaaaaaa was rotated.',
		tools: [
			{
				type: 'node',
				name: 'send_reply',
				node: {
					nodeType: 'n8n-nodes-base.gmail',
					nodeTypeVersion: 2.1,
					nodeParameters: {
						resource: 'message',
						options: {
							filters: {
								conditions: [
									{
										leftValue: '={{ $json.priority }}',
										rightValue: 'urgent',
										operator: { type: 'string', operation: 'equals' },
									},
								],
							},
						},
					},
					credentials: { gmailOAuth2: { id: 'cred-2', name: 'Support Inbox' } },
				},
			},
		],
	} as const;
}

function deepSkills() {
	return {
		skill_triage_rules: {
			name: 'Triage rules',
			description: 'How to grade an inbound ticket.',
			instructions:
				'Assign every ticket exactly one severity, and never downgrade one a customer raised.',
			references: [
				// `agentSkillReferenceSchema` requires a markdown path under `references/`,
				// so a fixture using anything else isn't the shape a real snapshot carries.
				{
					path: 'references/severity.md',
					content: 'Sev1 means the product is unusable for everyone.',
				},
			],
		},
	} as const;
}

function exportSpan(rawPayload: boolean) {
	const span = redactLangSmithTelemetrySpan({
		name: AGENT_SNAPSHOT_TRACE_RUN_NAME,
		attributes: {
			// Producer-set flag (emitTraceOnlyChildRun with rawOutputs) — the deep
			// tier keys on this, not on the (claimable) span name.
			...(rawPayload ? { 'langsmith.metadata.raw_trace_payload': true } : {}),
			[GEN_AI_COMPLETION]: JSON.stringify({
				agentId: 'TrIaGe1234567890',
				projectId: 'proj-1',
				configHash: 'h1',
				reason: 'config-updated',
				config: deepAgentConfig(),
				skills: deepSkills(),
			}),
		},
	}) as { attributes: Record<string, string> };
	return span.attributes[GEN_AI_COMPLETION];
}

type ExportedSnapshot = {
	agentId: string;
	configHash: string;
	config: Omit<ReturnType<typeof deepAgentConfig>, 'credential' | 'tools'> & {
		credential: string;
		tools: [{ node: Omit<ReturnType<typeof deepAgentConfig>['tools'][0]['node'], 'credentials'> }];
	};
	skills: ReturnType<typeof deepSkills>;
};

describe('agent-snapshot trace payload fidelity through export scrubbing', () => {
	it('keeps the config and skill bodies while still scrubbing secrets and credentials', () => {
		const completion = exportSpan(true);
		const parsed = jsonParse<ExportedSnapshot>(completion);

		// Consumer keying survives.
		expect(parsed.agentId).toBe('TrIaGe1234567890');
		expect(parsed.configHash).toBe('h1');

		// The node tool's parameters survive intact, conditions (depth 9+) included.
		expect(
			parsed.config.tools[0].node.nodeParameters.options.filters.conditions[0]?.operator,
		).toEqual({ type: 'string', operation: 'equals' });

		// Authored prose is NOT scrubbed — a seed carries it, so a case built from
		// one has to go through the scrub recipe.
		expect(parsed.config.instructions).toContain('production-down to the ops rota');
		expect(parsed.skills.skill_triage_rules.instructions).toContain('never downgrade one');
		expect(parsed.skills.skill_triage_rules.references[0].content).toContain('unusable for');

		// Sensitive-named keys go WHOLESALE, not value-by-value: a consumer gets no
		// credential id or name back, only the marker.
		expect(parsed.config.credential).toBe('[redacted]');
		expect(parsed.config.tools[0].node).not.toHaveProperty('credentials.gmailOAuth2');
		expect((parsed.config.tools[0].node as { credentials?: unknown }).credentials).toBe(
			'[redacted]',
		);

		// Secret patterns still fire inside ordinary prose.
		expect(parsed.config.instructions).not.toContain('sk-ant-');
		expect(parsed.config.instructions).toContain('[REDACTED]');

		// No structural placeholders anywhere in the payload.
		expect(completion).not.toMatch(/\[array\(\d+\)\]|\[object \d+ keys\]|\[redacted-depth-limit\]/);
	});

	it('keeps the default depth cap without the producer flag — even for a same-named span', () => {
		// Without the flag the config is destroyed at depth 5, which is the node
		// tool's parameters: the flag is load-bearing, not decorative.
		expect(exportSpan(false)).toContain('[redacted-depth-limit]');
	});
});
