/**
 * Regression test for GHC-6869
 * Bug: Chat UI crashes on second message with error "'type' must be 'output_text'"
 *
 * Root cause: When the Chat Hub loads message history to send to OpenAI-compatible APIs,
 * AI message content blocks are stored as { type: 'text', content: '...' } but the
 * OpenAI Responses API expects { type: 'output_text', text: '...' } for assistant messages.
 *
 * This test demonstrates the bug by showing that there is no conversion from Chat Hub's
 * internal format to OpenAI's Responses API format.
 */

import type { ChatMessageContentChunk } from '@n8n/api-types';

/**
 * This function SHOULD exist to convert Chat Hub message content to OpenAI Responses API format,
 * but it doesn't. This is the root cause of the bug.
 */
function convertChatHubContentToOpenAI(
	role: 'user' | 'assistant',
	content: ChatMessageContentChunk[],
): Array<{ type: string; text?: string; content?: string }> {
	// TODO: This conversion is missing in the codebase
	// For now, this just returns the content as-is (which causes the bug)
	return content as unknown as Array<{ type: string; text?: string; content?: string }>;
}

describe('GHC-6869: Chat Hub to OpenAI Responses API format conversion', () => {
	describe('User messages (input_text)', () => {
		it('should convert user text messages correctly', () => {
			const chatHubContent: ChatMessageContentChunk[] = [
				{ type: 'text', content: 'test for n8n' },
			];

			const converted = convertChatHubContentToOpenAI('user', chatHubContent);

			// For user messages, should convert to input_text
			expect(converted).toEqual([{ type: 'input_text', text: 'test for n8n' }]);
		});
	});

	describe('Assistant messages (output_text) - BUG HERE', () => {
		it('should convert assistant text messages to output_text format', () => {
			// This is what Chat Hub stores in the database
			const chatHubContent: ChatMessageContentChunk[] = [
				{
					type: 'text',
					content: "I understand you're testing something related to n8n...",
				},
			];

			const converted = convertChatHubContentToOpenAI('assistant', chatHubContent);

			// EXPECTED: Should convert to output_text for OpenAI Responses API
			const expected = [
				{
					type: 'output_text',
					text: "I understand you're testing something related to n8n...",
				},
			];

			// THIS WILL FAIL because the converter doesn't do the transformation
			expect(converted).toEqual(expected);
		});

		it('should handle artifact-create blocks in assistant messages', () => {
			const chatHubContent: ChatMessageContentChunk[] = [
				{ type: 'text', content: 'Let me create a guide for you:\n\n' },
				{
					type: 'artifact-create',
					content: '<command:artifact-create>...</command:artifact-create>',
					command: {
						title: 'n8n Workflow Automation Guide',
						type: 'md',
						content: '# n8n Guide\n...',
					},
					isIncomplete: false,
				},
				{ type: 'text', content: "\n\nI've created a basic n8n reference document." },
			];

			const converted = convertChatHubContentToOpenAI('assistant', chatHubContent);

			// EXPECTED: artifact-create blocks should either be:
			// 1. Converted to text representation
			// 2. Excluded entirely
			// 3. Merged with surrounding text

			// For OpenAI Responses API, we can only send output_text blocks
			// So we should convert ALL blocks to text or exclude non-text blocks
			const expected = [
				{
					type: 'output_text',
					text: 'Let me create a guide for you:\n\n',
				},
				// artifact-create should be excluded or converted
				{
					type: 'output_text',
					text: "\n\nI've created a basic n8n reference document.",
				},
			];

			// THIS WILL FAIL because artifact-create blocks are not handled
			expect(converted).toEqual(expected);
		});
	});

	describe('Multi-turn conversation - actual bug scenario', () => {
		it('should convert entire conversation history for second message', () => {
			// Turn 1: User sends "test for n8n"
			const turn1User: ChatMessageContentChunk[] = [{ type: 'text', content: 'test for n8n' }];

			// Turn 1: AI responds with text
			const turn1AI: ChatMessageContentChunk[] = [
				{
					type: 'text',
					content: "I understand you're testing something related to n8n...",
				},
			];

			// Turn 2: User sends "thank you!"
			// At this point, Chat Hub needs to send the history to OpenAI

			const historyForOpenAI = [
				{
					role: 'user' as const,
					content: convertChatHubContentToOpenAI('user', turn1User),
				},
				{
					role: 'assistant' as const,
					content: convertChatHubContentToOpenAI('assistant', turn1AI),
				},
			];

			// EXPECTED format for OpenAI Responses API:
			const expectedHistory = [
				{
					role: 'user',
					content: [{ type: 'input_text', text: 'test for n8n' }],
				},
				{
					role: 'assistant',
					content: [
						{
							type: 'output_text',
							text: "I understand you're testing something related to n8n...",
						},
					],
				},
			];

			// THIS WILL FAIL - the assistant message has wrong type
			expect(historyForOpenAI).toEqual(expectedHistory);
		});
	});
});
