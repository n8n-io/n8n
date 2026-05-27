import type { CheckOutcome } from '../binaryChecks/types';

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
			key: `evals.workflows.${outcome.dimension}.${outcome.name}`,
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
		dimension: 'structure',
		status: 'pass',
	},
	{
		name: 'agent_has_language_model',
		description: 'Agent nodes have a language model connected',
		kind: 'deterministic',
		dimension: 'ai_nodes',
		status: 'n_a',
		comment: 'no agent nodes',
	},
	{
		name: 'valid_field_references',
		description: 'Expressions reference fields the upstream node emits',
		kind: 'deterministic',
		dimension: 'parameter_correctness',
		status: 'fail',
		comment: 'Set node references unknown field "user_email"',
	},
];

describe('CheckOutcome → LangSmith Feedback projection', () => {
	it('emits Feedback keys in `evals.workflows.<dimension>.<name>` form', () => {
		const feedback = extractCheckFeedback(sampleOutcomes);
		expect(feedback).toEqual([
			{ key: 'evals.workflows.structure.has_trigger', score: 1 },
			{
				key: 'evals.workflows.parameter_correctness.valid_field_references',
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
				dimension: 'ai_nodes',
				status: 'n_a',
			},
		];
		expect(extractCheckFeedback(naOnly)).toEqual([]);
	});

	it('drops N/A even when comment is present', () => {
		const single: CheckOutcome[] = [
			{
				name: 'response_matches_workflow_changes',
				description: 'LLM check',
				kind: 'llm',
				dimension: 'nodes_craftsmanship',
				status: 'n_a',
				comment: 'Skipped: no agent text response',
			},
		];
		expect(extractCheckFeedback(single)).toEqual([]);
	});
});
