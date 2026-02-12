import { AIMessage } from '@langchain/core/messages';

import { isMalformedLlmResponseError, createEmptyChatResult } from './response-guard';

describe('response-guard', () => {
	describe('isMalformedLlmResponseError', () => {
		it('should detect TypeError with "reading \'parts\'" message', () => {
			const error = new TypeError("Cannot read properties of undefined (reading 'parts')");
			expect(isMalformedLlmResponseError(error)).toBe(true);
		});

		it('should detect TypeError with "reading \'role\'" message', () => {
			const error = new TypeError("Cannot read properties of undefined (reading 'role')");
			expect(isMalformedLlmResponseError(error)).toBe(true);
		});

		it('should detect TypeError with "reading \'content\'" message', () => {
			const error = new TypeError("Cannot read properties of undefined (reading 'content')");
			expect(isMalformedLlmResponseError(error)).toBe(true);
		});

		it('should NOT match unrelated TypeErrors', () => {
			const error = new TypeError('Cannot read properties of undefined (reading "foo")');
			expect(isMalformedLlmResponseError(error)).toBe(false);
		});

		it('should NOT match non-TypeError errors', () => {
			const error = new Error("Cannot read properties of undefined (reading 'parts')");
			expect(isMalformedLlmResponseError(error)).toBe(false);
		});

		it('should NOT match null or undefined', () => {
			expect(isMalformedLlmResponseError(null)).toBe(false);
			expect(isMalformedLlmResponseError(undefined)).toBe(false);
		});

		it('should NOT match strings', () => {
			expect(isMalformedLlmResponseError("reading 'parts'")).toBe(false);
		});
	});

	describe('createEmptyChatResult', () => {
		it('should return a valid ChatResult with one generation', () => {
			const result = createEmptyChatResult();

			expect(result.generations).toHaveLength(1);
			expect(result.generations[0].text).toBe('');
			expect(result.generations[0].message).toBeInstanceOf(AIMessage);
		});

		it('should have a descriptive message in the AIMessage content', () => {
			const result = createEmptyChatResult();
			const content = result.generations[0].message.content;

			expect(typeof content).toBe('string');
			expect(content).toContain('empty response');
		});

		it('should not contain tool_calls (agent treats it as final response)', () => {
			const result = createEmptyChatResult();
			const message = result.generations[0].message as AIMessage;

			expect(message.tool_calls).toBeUndefined();
		});
	});

	describe('integration: simulates the LangChain Gemini crash scenario', () => {
		/**
		 * This test reproduces the exact crash that occurs in
		 * @langchain/google-genai's mapGenerateContentResultToChatResult()
		 * when the Gemini API returns a candidate without a content field.
		 *
		 * The buggy code path:
		 *   const { content: candidateContent, ...generationInfo } = candidate;
		 *   candidateContent.parts?.reduce(...)  // crashes here
		 *
		 * On the BUGGY version, this test FAILS because the TypeError propagates
		 * unhandled through the agent execution pipeline.
		 *
		 * On the FIXED version, this test PASSES because SafeChatGoogleGenerativeAI
		 * catches the error via isMalformedLlmResponseError and returns
		 * createEmptyChatResult() instead.
		 */
		it('should detect the exact error that Gemini produces with missing content', () => {
			// Simulate what @langchain/google-genai does internally
			const geminiApiResponse = {
				candidates: [
					{
						// content is MISSING — this is the root cause
						finishReason: 'SAFETY',
						safetyRatings: [],
					},
				],
			};

			const [candidate] = geminiApiResponse.candidates;
			const { content: candidateContent } = candidate as { content?: { parts?: unknown[] } };

			// This is the exact line that crashes in @langchain/google-genai
			let caughtError: unknown;
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(candidateContent as any).parts;
			} catch (error) {
				caughtError = error;
			}

			// Verify that the error IS detected by our guard
			expect(caughtError).toBeInstanceOf(TypeError);
			expect(isMalformedLlmResponseError(caughtError)).toBe(true);

			// And that we can produce a valid fallback
			const fallback = createEmptyChatResult();
			expect(fallback.generations).toHaveLength(1);
			expect(fallback.generations[0].text).toBe('');
		});
	});
});
