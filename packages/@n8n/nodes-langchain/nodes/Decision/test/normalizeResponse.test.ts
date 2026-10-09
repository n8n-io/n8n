import type { DecisionRequest } from '@n8n/ai-utilities';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { buildDecisionOutput } from '../normalizeResponse';

const node = mock<INode>({ name: 'Decision', type: 'decision' });

const request: DecisionRequest = {
	state: 'Charged twice',
	questions: {
		department: {
			type: 'choice',
			instructions: 'Which team?',
			options: [{ value: 'billing' }, { value: 'technical' }],
		},
		severity: {
			type: 'score',
			instructions: 'How severe?',
			levels: ['Low', 'Material', 'Critical'],
		},
		urgency: { type: 'booleanProbability', instructions: 'Is it urgent?' },
	},
};

const response = {
	decisions: {
		department: {
			type: 'choice',
			value: 'billing',
			confidence: 0.92,
			probabilities: { billing: 0.96, technical: 0.04 },
		},
		severity: { type: 'score', value: 1.7, confidence: 0.79 },
		urgency: { type: 'booleanProbability', value: true, probability: 0.88 },
	},
	model: 'jev-latest',
	usage: { inputTokens: 300, outputTokens: 50 },
};

describe('buildDecisionOutput', () => {
	it('should return every decision keyed by question ID', () => {
		expect(buildDecisionOutput(response, request, node, 0)).toEqual({
			decisions: response.decisions,
			model: 'jev-latest',
			usage: { inputTokens: 300, outputTokens: 50 },
		});
	});

	it('should keep provider metadata when present', () => {
		const output = buildDecisionOutput(
			{ ...response, providerMetadata: { answers: { urgency: { type: 'noul', noul: 0.88 } } } },
			request,
			node,
			0,
		);

		expect(output.providerMetadata).toEqual({
			answers: { urgency: { type: 'noul', noul: 0.88 } },
		});
	});

	it('should omit optional fields the provider did not report', () => {
		const output = buildDecisionOutput({ decisions: response.decisions }, request, node, 0);

		expect(output).not.toHaveProperty('model');
		expect(output).not.toHaveProperty('usage');
		expect(output).not.toHaveProperty('confidenceThreshold');
	});

	describe('confidence threshold', () => {
		it('should annotate answers that report confidence', () => {
			const output = buildDecisionOutput(response, request, node, 0, 0.8);

			expect(output).toMatchObject({
				confidenceThreshold: 0.8,
				decisions: {
					department: { meetsConfidenceThreshold: true },
					severity: { meetsConfidenceThreshold: false },
				},
			});
		});

		it('should not annotate answers without confidence', () => {
			const output = buildDecisionOutput(response, request, node, 0, 0.8);

			expect(output.decisions).toMatchObject({ urgency: { probability: 0.88 } });
			expect((output.decisions as Record<string, object>).urgency).not.toHaveProperty(
				'meetsConfidenceThreshold',
			);
		});

		it('should not annotate anything when no threshold is configured', () => {
			const output = buildDecisionOutput(response, request, node, 0);

			expect((output.decisions as Record<string, object>).department).not.toHaveProperty(
				'meetsConfidenceThreshold',
			);
		});
	});

	describe('malformed provider responses', () => {
		it.each([undefined, null, 'nope', {}, { decisions: 'nope' }])(
			'should reject %s',
			(malformed) => {
				expect(() => buildDecisionOutput(malformed, request, node, 0)).toThrow(
					'The Decision Model returned a malformed response',
				);
			},
		);

		it('should reject a missing answer', () => {
			const { urgency, ...decisions } = response.decisions;
			expect(() => buildDecisionOutput({ decisions }, request, node, 0)).toThrow(
				'The Decision Model answered no questions',
			);
			expect(urgency).toBeDefined();
		});

		it('should report every missing answer', () => {
			expect(() =>
				buildDecisionOutput(
					{ decisions: { department: response.decisions.department } },
					request,
					node,
					0,
				),
			).toThrow('The Decision Model answered not all questions');
		});

		it('should reject an answer of the wrong type', () => {
			expect(() =>
				buildDecisionOutput(
					{
						decisions: {
							...response.decisions,
							urgency: { type: 'choice', value: 'billing' },
						},
					},
					request,
					node,
					0,
				),
			).toThrow('The model answered question “urgency” with type “choice”');
		});

		it('should reject a choice that was never offered', () => {
			expect(() =>
				buildDecisionOutput(
					{
						decisions: {
							...response.decisions,
							department: { type: 'choice', value: 'sales' },
						},
					},
					request,
					node,
					0,
				),
			).toThrow(
				'The model chose “sales” for question “department”, which is not one of its options',
			);
		});

		it('should reject a score that is not a number', () => {
			expect(() =>
				buildDecisionOutput(
					{ decisions: { ...response.decisions, severity: { type: 'score', value: 'high' } } },
					request,
					node,
					0,
				),
			).toThrow('The model returned no score for question “severity”');
		});

		it('should reject a boolean probability without a probability', () => {
			expect(() =>
				buildDecisionOutput(
					{
						decisions: {
							...response.decisions,
							urgency: { type: 'booleanProbability', value: true },
						},
					},
					request,
					node,
					0,
				),
			).toThrow('The model returned no probability for question “urgency”');
		});
	});
});
