import type { AgentJsonConfig } from '@n8n/api-types';

import { buildPromiseCheckPrompt, parsePromiseChecks, BASE_CHECK } from '../promise-checks';

const config: AgentJsonConfig = {
	name: 'Refund helper',
	model: 'anthropic/claude-sonnet-5-5',
	instructions:
		'You help shoppers with orders. Never promise a refund. Ask for the order number before you look up an order.',
};

const skills = [
	{
		name: 'Tone',
		description: 'How to write',
		instructions: 'Always answer in the language of the customer.',
	},
];

describe('buildPromiseCheckPrompt', () => {
	it('includes the instructions, skills, and tools, each inside its own data block', () => {
		const prompt = buildPromiseCheckPrompt({ config, skills, tools: [] });

		expect(prompt.user).toContain('Never promise a refund.');
		expect(prompt.user).toContain('Always answer in the language of the customer.');
		expect(prompt.user).toContain('<instructions>');
		expect(prompt.system).toContain('JSON');
	});
});

describe('parsePromiseChecks', () => {
	const sources = { instructions: config.instructions, skills };

	it('keeps a check whose quote is in the instructions', () => {
		const checks = parsePromiseChecks(
			JSON.stringify({
				checks: [
					{
						question: 'Did the agent avoid promising a refund?',
						reason: 'The instructions forbid refund promises.',
						quote: 'Never promise a refund.',
						appliesWhen: 'The person asks for money back.',
					},
				],
			}),
			sources,
		);

		expect(checks.kept).toEqual([
			expect.objectContaining({
				id: 'promise:1',
				kind: 'promise',
				question: 'Did the agent avoid promising a refund?',
				appliesWhen: 'The person asks for money back.',
				source: { field: 'instructions', quote: 'Never promise a refund.' },
			}),
		]);
	});

	it('marks a quote from a skill as coming from skills', () => {
		const checks = parsePromiseChecks(
			JSON.stringify({
				checks: [
					{
						question: 'Did the agent answer in the language of the customer?',
						reason: 'A skill says so.',
						quote: 'Always answer in the language of the customer.',
					},
				],
			}),
			sources,
		);

		expect(checks.kept[0].source.field).toBe('skills');
	});

	it('drops a check whose quote is not in any source, so a made-up rule never reaches the user', () => {
		const checks = parsePromiseChecks(
			JSON.stringify({
				checks: [
					{ question: 'Was the agent polite?', reason: 'Good manners.', quote: 'Be polite.' },
				],
			}),
			sources,
		);

		expect(checks.kept).toEqual([]);
		expect(checks.dropped).toEqual([expect.objectContaining({ why: 'quote-not-found' })]);
	});

	it('matches a quote across whitespace and letter case differences', () => {
		const checks = parsePromiseChecks(
			JSON.stringify({
				checks: [
					{
						question: 'Did the agent ask for the order number first?',
						reason: 'The instructions say so.',
						quote: 'ask for the order number  before you look up an order',
					},
				],
			}),
			sources,
		);

		expect(checks.kept).toHaveLength(1);
	});

	it('reads JSON inside a code fence', () => {
		const text =
			'```json\n{"checks":[{"question":"Q?","reason":"R","quote":"Never promise a refund."}]}\n```';
		expect(parsePromiseChecks(text, sources).kept).toHaveLength(1);
	});

	it('returns nothing for unreadable output', () => {
		expect(parsePromiseChecks('no json here', sources)).toEqual({
			kept: [],
			dropped: [],
			unreadable: true,
		});
	});

	it('keeps at most five checks', () => {
		const many = Array.from({ length: 8 }, (_, i) => ({
			question: `Q${i}?`,
			reason: 'R',
			quote: 'Never promise a refund.',
		}));
		expect(parsePromiseChecks(JSON.stringify({ checks: many }), sources).kept).toHaveLength(5);
	});
});

describe('BASE_CHECK', () => {
	it('is the same base check for every agent', () => {
		expect(BASE_CHECK).toEqual(
			expect.objectContaining({ id: 'base:task_done_honestly', kind: 'base' }),
		);
	});

	it('counts a refusal the rules require, or a clear reason, as doing the job', () => {
		expect(BASE_CHECK.question).toContain('or clearly told them why not');
	});
});
