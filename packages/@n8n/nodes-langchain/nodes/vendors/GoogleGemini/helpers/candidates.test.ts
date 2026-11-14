import { OperationalError, UserError } from '@n8n/errors';

import { assertResponseHasCandidates } from './candidates';

describe('assertResponseHasCandidates', () => {
	it('returns when the response has candidates', () => {
		expect(() =>
			assertResponseHasCandidates({
				candidates: [{ content: { parts: [{ text: 'hello' }], role: 'model' } }],
			}),
		).not.toThrow();
	});

	it('throws a UserError with the block reason', () => {
		try {
			assertResponseHasCandidates({
				promptFeedback: {
					blockReason: 'PROHIBITED_CONTENT',
					blockReasonMessage: 'The prompt is not allowed',
				},
			});
			expect.unreachable('Expected the guard to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(UserError);
			expect((error as UserError).message).toBe(
				'Gemini blocked the prompt (reason: PROHIBITED_CONTENT)',
			);
			expect((error as UserError).description).toBe('The prompt is not allowed');
		}
	});

	it('throws the block reason when the candidates array is empty', () => {
		expect(() =>
			assertResponseHasCandidates({
				candidates: [],
				promptFeedback: { blockReason: 'SAFETY' },
			}),
		).toThrow('Gemini blocked the prompt (reason: SAFETY)');
	});

	it('throws an OperationalError for an empty response without a block reason', () => {
		expect(() => assertResponseHasCandidates({})).toThrow(OperationalError);
	});
});
