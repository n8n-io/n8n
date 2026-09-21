import { describe, expect, it } from 'vitest';

import { choiceEntropy, resolveChoice, resolveNoul } from '../policy';
import { NONE_OF_THESE } from '../schemas';

describe('resolveChoice', () => {
	it('chooses a confident listed option', () => {
		const result = resolveChoice({
			allowed: ['upsert', 'create'],
			answer: {
				type: 'choice',
				choice: 'upsert',
				probabilities: { upsert: 0.93, create: 0.05, [NONE_OF_THESE]: 0.02 },
				confidence: 0.93,
			},
		});
		expect(result).toEqual({
			status: 'chosen',
			value: 'upsert',
			confidence: 0.93,
			source: 'decision',
		});
	});

	it('abstains with the best option as a hint when confidence is low', () => {
		const result = resolveChoice({
			allowed: ['upsert', 'create'],
			answer: {
				type: 'choice',
				choice: 'upsert',
				probabilities: { upsert: 0.55, create: 0.45 },
				confidence: 0.55,
			},
		});
		expect(result).toMatchObject({ status: 'abstain', reason: 'low_confidence', best: 'upsert' });
	});

	it('abstains on a confident none_of_these', () => {
		const result = resolveChoice({
			allowed: ['upsert', 'create'],
			answer: {
				type: 'choice',
				choice: NONE_OF_THESE,
				probabilities: { upsert: 0.1, create: 0.06, [NONE_OF_THESE]: 0.84 },
				confidence: 0.84,
			},
		});
		expect(result).toMatchObject({ status: 'abstain', reason: 'none_of_these', confidence: 0.84 });
	});

	it('fails closed on an option outside the allowed set', () => {
		const result = resolveChoice({
			allowed: ['upsert'],
			answer: { type: 'choice', choice: 'delete', probabilities: { delete: 1 }, confidence: 1 },
		});
		expect(result).toMatchObject({ status: 'abstain', reason: 'unavailable' });
	});

	it('falls back to a decisive prior when no answer is available', () => {
		const result = resolveChoice({
			allowed: ['a', 'b'],
			prior: { a: 9, b: 1 },
		});
		expect(result).toEqual({ status: 'chosen', value: 'a', confidence: 0.9, source: 'prior' });
	});

	it('abstains when the prior is not decisive', () => {
		const result = resolveChoice({ allowed: ['a', 'b'], prior: { a: 6, b: 4 } });
		expect(result).toMatchObject({ status: 'abstain', reason: 'low_confidence', best: 'a' });
	});

	it('picks the only option without a decision', () => {
		expect(resolveChoice({ allowed: ['only'] })).toEqual({
			status: 'chosen',
			value: 'only',
			confidence: 1,
			source: 'only_option',
		});
	});

	it('abstains when there are no options', () => {
		expect(resolveChoice({ allowed: [NONE_OF_THESE] })).toMatchObject({
			status: 'abstain',
			reason: 'no_options',
		});
	});
});

describe('resolveNoul', () => {
	it('maps probability mass to yes / no / uncertain', () => {
		expect(resolveNoul({ type: 'noul', noul: 0.95 })).toBe('yes');
		expect(resolveNoul({ type: 'noul', noul: 0.05 })).toBe('no');
		expect(resolveNoul({ type: 'noul', noul: 0.5 })).toBe('uncertain');
		expect(resolveNoul(undefined)).toBe('uncertain');
		expect(resolveNoul(null)).toBe('uncertain');
	});
});

describe('choiceEntropy', () => {
	it('is zero for a certain answer and maximal for a uniform one', () => {
		expect(
			choiceEntropy({ type: 'choice', choice: 'a', probabilities: { a: 1, b: 0 }, confidence: 1 }),
		).toBe(0);
		expect(
			choiceEntropy({
				type: 'choice',
				choice: 'a',
				probabilities: { a: 0.5, b: 0.5 },
				confidence: 0.5,
			}),
		).toBeCloseTo(1);
	});
});
