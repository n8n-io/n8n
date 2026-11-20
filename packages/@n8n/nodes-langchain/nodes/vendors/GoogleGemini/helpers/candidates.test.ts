import { OperationalError, UserError } from '@n8n/errors';

import { assertGenerateContentResponse, assertResponseHasCandidates } from './candidates';
import type { GenerateContentResponse } from './interfaces';

describe('assertGenerateContentResponse', () => {
	it.each([
		['an empty object', {}],
		[
			'a prompt feedback with a block reason, a message and other fields',
			{
				promptFeedback: {
					blockReason: 'SAFETY',
					blockReasonMessage: 'The prompt is not allowed',
					safetyRatings: [],
				},
			},
		],
		['a candidate without a role', { candidates: [{ content: { parts: [] } }] }],
		[
			'a candidate without content',
			{ candidates: [{ index: 0, finishReason: 'PROHIBITED_CONTENT', finishMessage: 'Filtered' }] },
		],
		[
			'unknown fields',
			{ usageMetadata: {}, candidates: [{ finishReason: 'STOP', content: { parts: [{ a: 1 }] } }] },
		],
	])('accepts %s', (_name, response) => {
		expect(() => assertGenerateContentResponse(response)).not.toThrow();
	});

	it.each([
		['a non-object', 'response'],
		['null', null],
		['candidates that are not an array', { candidates: 'invalid' }],
		['null candidates', { candidates: null }],
		['a candidate that is not an object', { candidates: ['invalid'] }],
		['a finish reason that is not a string', { candidates: [{ finishReason: 1 }] }],
		['content without parts', { candidates: [{ content: { role: 'model' } }] }],
		['parts that are not an array', { candidates: [{ content: { parts: 'invalid' } }] }],
		['a prompt feedback that is not an object', { promptFeedback: 'invalid' }],
		['a block reason that is not a string', { promptFeedback: { blockReason: 1 } }],
		[
			'a block reason message that is not a string',
			{ promptFeedback: { blockReasonMessage: null } },
		],
	])('rejects %s', (_name, response) => {
		expect(() => assertGenerateContentResponse(response)).toThrow(
			'Invalid response format from Gemini API',
		);
	});
});

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

	it('throws a UserError with the finish reason when no candidate has content', () => {
		try {
			assertResponseHasCandidates({
				candidates: [
					{ finishReason: 'PROHIBITED_CONTENT', finishMessage: 'The image was filtered' },
				],
			});
			expect.unreachable('Expected the guard to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(UserError);
			expect((error as UserError).message).toBe(
				'Gemini returned no content (finish reason: PROHIBITED_CONTENT)',
			);
			expect((error as UserError).description).toBe('The image was filtered');
		}
	});

	it('returns when at least one candidate has content', () => {
		expect(() =>
			assertResponseHasCandidates({
				candidates: [
					{ finishReason: 'SAFETY' },
					{ content: { parts: [{ text: 'hello' }], role: 'model' } },
				],
			}),
		).not.toThrow();
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

	it('does not accept candidates that are not an array', () => {
		const response = { candidates: 'invalid' } as unknown as GenerateContentResponse;

		expect(() => assertResponseHasCandidates(response)).toThrow(OperationalError);
	});
});
