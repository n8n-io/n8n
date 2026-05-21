// ---------------------------------------------------------------------------
// Snapshot-flavour test for the LangSmith feedback extraction step: every
// `CheckOutcome` from a built workflow becomes one `check.<name>` Feedback,
// scored 1 for pass and 0 for fail. N/A outcomes are intentionally excluded
// so the per-experiment averages reduce to per-check pass-rate cleanly.
// ---------------------------------------------------------------------------

import type { CheckOutcome } from '../types';

interface Feedback {
	key: string;
	score: number;
	comment?: string;
}

function extractCheckFeedback(outcomes: CheckOutcome[] | undefined): Feedback[] {
	const out: Feedback[] = [];
	if (!outcomes) return out;
	for (const outcome of outcomes) {
		if (outcome.status === 'n_a') continue;
		out.push({
			key: `check.${outcome.name}`,
			score: outcome.status === 'pass' ? 1 : 0,
			...(outcome.comment ? { comment: outcome.comment } : {}),
		});
	}
	return out;
}

const sampleOutcomes: CheckOutcome[] = [
	{
		name: 'has_trigger',
		description: 'Workflow contains a trigger or start node',
		kind: 'deterministic',
		status: 'pass',
	},
	{
		name: 'agent_has_language_model',
		description: 'Agent nodes have a language model connected',
		kind: 'deterministic',
		status: 'n_a',
		comment: 'no agent nodes',
	},
	{
		name: 'valid_field_references',
		description: 'Expressions reference fields the upstream node emits',
		kind: 'deterministic',
		status: 'fail',
		comment: 'Set node references unknown field "user_email"',
	},
];

describe('CheckOutcome → LangSmith Feedback projection', () => {
	it('emits one Feedback per non-N/A outcome with score 1 (pass) or 0 (fail)', () => {
		const feedback = extractCheckFeedback(sampleOutcomes);
		expect(feedback).toEqual([
			{ key: 'check.has_trigger', score: 1 },
			{
				key: 'check.valid_field_references',
				score: 0,
				comment: 'Set node references unknown field "user_email"',
			},
		]);
	});

	it('returns no Feedback when outcomes is undefined', () => {
		expect(extractCheckFeedback(undefined)).toEqual([]);
	});

	it('returns no Feedback when every outcome is N/A', () => {
		const naOnly: CheckOutcome[] = [
			{
				name: 'memory_properly_connected',
				description: 'Memory nodes connected',
				kind: 'deterministic',
				status: 'n_a',
			},
		];
		expect(extractCheckFeedback(naOnly)).toEqual([]);
	});

	it('drops N/A even when comment is present (LangSmith averages exclude null scores)', () => {
		const single: CheckOutcome[] = [
			{
				name: 'response_matches_workflow_changes',
				description: 'LLM check',
				kind: 'llm',
				status: 'n_a',
				comment: 'Skipped: no agent text response',
			},
		];
		expect(extractCheckFeedback(single)).toEqual([]);
	});
});
