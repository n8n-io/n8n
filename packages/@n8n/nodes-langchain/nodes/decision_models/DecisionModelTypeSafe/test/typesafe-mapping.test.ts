import type { DecisionRequest } from '@n8n/ai-utilities';

import { toDecisionResponse, toTypeSafeQuestion, toTypeSafeQuestions } from '../typesafe-mapping';

describe('toTypeSafeQuestion', () => {
	it('should map a choice question to a criteria map', () => {
		expect(
			toTypeSafeQuestion({
				type: 'choice',
				instructions: 'Which team should handle this request?',
				options: [
					{ value: 'billing', description: 'Payments, invoices, and refunds' },
					{ value: 'other' },
				],
			}),
		).toEqual({
			type: 'choice',
			instructions: 'Which team should handle this request?',
			criteria: {
				billing: 'Payments, invoices, and refunds',
				// TypeSafe accepts null for an option that needs no rubric
				other: null,
			},
		});
	});

	it('should map a score question to an ordered criteria array', () => {
		expect(
			toTypeSafeQuestion({
				type: 'score',
				instructions: 'How severe is the customer impact?',
				levels: ['Low impact', 'Material impact', 'Critical business impact'],
			}),
		).toEqual({
			type: 'score',
			instructions: 'How severe is the customer impact?',
			criteria: ['Low impact', 'Material impact', 'Critical business impact'],
		});
	});

	it('should map a boolean probability question to a noul', () => {
		expect(
			toTypeSafeQuestion({
				type: 'booleanProbability',
				instructions: 'This request requires urgent attention',
			}),
		).toEqual({
			type: 'noul',
			instructions: 'This request requires urgent attention',
		});
	});

	it('should pass boolean probability criteria through to the noul', () => {
		expect(
			toTypeSafeQuestion({
				type: 'booleanProbability',
				instructions: 'This request requires urgent attention',
				criteria: { true: 'Time-sensitive', false: 'Can wait' },
			}),
		).toEqual({
			type: 'noul',
			instructions: 'This request requires urgent attention',
			criteria: { true: 'Time-sensitive', false: 'Can wait' },
		});
	});

	it('should map every question of a request by ID', () => {
		const questions: DecisionRequest['questions'] = {
			department: { type: 'choice', instructions: 'Which team?', options: [{ value: 'billing' }] },
			urgency: { type: 'booleanProbability', instructions: 'Urgent?' },
		};

		expect(toTypeSafeQuestions(questions)).toEqual({
			department: { type: 'choice', instructions: 'Which team?', criteria: { billing: null } },
			urgency: { type: 'noul', instructions: 'Urgent?' },
		});
	});
});

describe('toDecisionResponse', () => {
	it('should map a choice answer, keeping probabilities and confidence', () => {
		const response = toDecisionResponse({
			model: 'jev-latest',
			answers: {
				department: {
					type: 'choice',
					choice: 'billing',
					probabilities: { billing: 0.96, technical: 0.02, sales: 0.01, other: 0.01 },
					confidence: 0.92,
				},
			},
		});

		expect(response.decisions.department).toEqual({
			type: 'choice',
			value: 'billing',
			confidence: 0.92,
			probabilities: { billing: 0.96, technical: 0.02, sales: 0.01, other: 0.01 },
		});
		expect(response.model).toBe('jev-latest');
	});

	it('should map a score answer, keeping the legend', () => {
		const response = toDecisionResponse({
			answers: {
				frustration: {
					type: 'score',
					score: 1.6,
					legend: { '0': 'Calm', '1': 'Frustrated', '2': 'Very angry' },
					probabilities: { '0': 0.05, '1': 0.3, '2': 0.65 },
					confidence: 0.78,
				},
			},
		});

		expect(response.decisions.frustration).toEqual({
			type: 'score',
			value: 1.6,
			confidence: 0.78,
			probabilities: { '0': 0.05, '1': 0.3, '2': 0.65 },
			legend: { '0': 'Calm', '1': 'Frustrated', '2': 'Very angry' },
		});
	});

	it.each([
		[0.88, true],
		[0.5, true],
		[0.49, false],
		[0, false],
	])('should resolve a noul of %s to %s', (noul, value) => {
		const response = toDecisionResponse({ answers: { urgency: { type: 'noul', noul } } });

		expect(response.decisions.urgency).toEqual({
			type: 'booleanProbability',
			value,
			probability: noul,
		});
	});

	it('should normalize usage', () => {
		const response = toDecisionResponse({
			answers: {},
			usage: { input_tokens: 312, output_tokens: 48 },
		});

		expect(response.usage).toEqual({ inputTokens: 312, outputTokens: 48 });
	});

	it('should omit usage the provider did not report', () => {
		expect(toDecisionResponse({ answers: {} }).usage).toBeUndefined();
	});

	it('should keep the raw answers, including TypeSafe wording, as provider metadata', () => {
		const answers = { urgency: { type: 'noul' as const, noul: 0.88 } };

		expect(toDecisionResponse({ answers }).providerMetadata).toEqual({ answers });
	});

	it('should skip an answer type it does not know', () => {
		const response = toDecisionResponse({
			answers: {
				urgency: { type: 'noul', noul: 0.88 },
				mystery: { type: 'quantum' } as never,
			},
		});

		expect(Object.keys(response.decisions)).toEqual(['urgency']);
	});

	it('should tolerate a response without answers', () => {
		expect(toDecisionResponse({}).decisions).toEqual({});
	});
});
