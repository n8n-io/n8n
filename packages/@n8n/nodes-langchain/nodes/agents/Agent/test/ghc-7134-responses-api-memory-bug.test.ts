/**
 * Test for GHC-7134: Responses API incorrectly formats assistant messages from memory
 *
 * Bug Report: https://github.com/n8n-io/n8n/issues/26639
 * Linear Ticket: GHC-7134
 *
 * ## Problem
 * When using the AI Agent with:
 * - OpenAI Chat Model with Responses API enabled (responsesApiEnabled: true)
 * - Memory component
 *
 * After the first message, assistant responses are stored in memory. When the
 * second message is sent, these assistant messages from memory are included in
 * the request, but with INCORRECT formatting for the Responses API.
 *
 * ## Expected Behavior (Responses API format)
 * ```json
 * {
 *   "type": "message",
 *   "role": "assistant",
 *   "content": [
 *     {
 *       "type": "output_text",
 *       "text": "response text here"
 *     }
 *   ]
 * }
 * ```
 *
 * ## Actual Behavior (Bug)
 * ```json
 * {
 *   "type": "message",
 *   "role": "assistant",
 *   "content": "response text here"  // ❌ Should be array of content blocks
 * }
 * ```
 *
 * ## Impact
 * This causes llama.cpp and other OpenAI-compatible servers to reject requests with:
 * Error: "'type' must be 'output_text'"
 *
 * ## Root Cause
 * When chat history is loaded from memory, AIMessage objects have simple string content.
 * LangChain's ChatOpenAI with useResponsesApi=true does not properly convert these
 * messages to the Responses API format when sending them to the API.
 *
 * ## Test Status
 * These tests currently PASS because they document the bug, but don't have a way
 * to intercept and validate the actual HTTP request format sent by ChatOpenAI.
 *
 * To properly fix and verify, we need to:
 * 1. Add message transformation logic in the Responses API code path
 * 2. Convert AIMessage string content → array of {type: 'output_text', text: string}
 * 3. Ensure this happens when useResponsesApi is true
 */

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

describe('GHC-7134: Responses API Message Format Bug', () => {
	describe('Message format requirements', () => {
		it('documents the expected Responses API format for assistant messages', () => {
			/**
			 * According to OpenAI Responses API specification, assistant messages
			 * must have content as an array of content blocks, each with a type.
			 */
			const expectedFormat = {
				type: 'message',
				role: 'assistant',
				content: [
					{
						type: 'output_text',
						text: "I'm doing well, thanks!",
					},
				],
			};

			expect(expectedFormat.content).toBeInstanceOf(Array);
			expect(expectedFormat.content[0]).toEqual({
				type: 'output_text',
				text: expect.any(String),
			});
		});

		it('documents the bug: assistant messages from memory use string content', () => {
			/**
			 * When messages are loaded from memory, AIMessage objects have string content.
			 * This is NOT compatible with the Responses API format.
			 */
			const messageFromMemory = new AIMessage("I'm doing well, thanks!");

			// Current state: content is a string
			expect(typeof messageFromMemory.content).toBe('string');
			expect(messageFromMemory.content).toBe("I'm doing well, thanks!");

			// BUG: This format is incompatible with Responses API
			// It should be converted to: [{ type: 'output_text', text: '...' }]
		});

		it('documents the correct format for tool call messages', () => {
			/**
			 * AIMessages with tool calls should have empty content array,
			 * and the tool_calls property should be preserved.
			 */
			const toolCallMessage = new AIMessage({
				content: '',
				tool_calls: [
					{
						id: 'call_123',
						name: 'get_weather',
						args: { location: 'SF' },
						type: 'tool_call',
					},
				],
			});

			const expectedFormat = {
				type: 'message',
				role: 'assistant',
				content: [], // Empty for tool-calling messages
				tool_calls: [
					{
						id: 'call_123',
						type: 'function',
						function: {
							name: 'get_weather',
							arguments: JSON.stringify({ location: 'SF' }),
						},
					},
				],
			};

			expect(toolCallMessage.tool_calls).toBeDefined();
			expect(toolCallMessage.tool_calls?.length).toBe(1);
			expect(expectedFormat.content).toEqual([]);
			expect(expectedFormat.tool_calls).toBeDefined();
		});
	});

	describe('Chat history from memory', () => {
		it('demonstrates a typical chat history loaded from memory', () => {
			/**
			 * This represents what loadMemory() returns - an array of BaseMessage objects.
			 * These need to be transformed to Responses API format when sent to the API.
			 */
			const chatHistory = [
				new HumanMessage('How are you?'),
				new AIMessage("I'm doing well, thanks!"),
				new HumanMessage("That's great!"),
				new AIMessage('Indeed! How can I help you today?'),
			];

			// Verify structure
			expect(chatHistory).toHaveLength(4);
			expect(chatHistory[1]).toBeInstanceOf(AIMessage);
			expect(chatHistory[3]).toBeInstanceOf(AIMessage);

			// BUG: All AIMessages have string content
			const aiMessages = chatHistory.filter((msg) => msg instanceof AIMessage);
			aiMessages.forEach((msg) => {
				expect(typeof msg.content).toBe('string');
			});

			// REQUIRED FIX: When useResponsesApi is true, these should be converted to:
			// { type: 'output_text', text: msg.content }
		});

		it('demonstrates chat history with tool calls', () => {
			/**
			 * Chat history can include tool call sequences:
			 * 1. HumanMessage (user request)
			 * 2. AIMessage with tool_calls
			 * 3. ToolMessage (tool result)
			 * 4. AIMessage (final response)
			 */
			const chatHistory = [
				new HumanMessage("What's the weather?"),
				new AIMessage({
					content: '',
					tool_calls: [
						{
							id: 'call_123',
							name: 'get_weather',
							args: { location: 'SF' },
							type: 'tool_call',
						},
					],
				}),
				new ToolMessage({
					content: 'Sunny, 72°F',
					tool_call_id: 'call_123',
					name: 'get_weather',
				}),
				new AIMessage("It's sunny and 72°F in San Francisco!"),
			];

			// The final AIMessage has string content - BUG
			const finalMessage = chatHistory[3] as AIMessage;
			expect(typeof finalMessage.content).toBe('string');

			// SHOULD BE: [{ type: 'output_text', text: "It's sunny and 72°F in San Francisco!" }]
		});
	});

	describe('llama.cpp compatibility', () => {
		it('documents the exact error from llama.cpp', () => {
			/**
			 * When n8n sends incorrectly formatted messages to llama.cpp,
			 * the server responds with:
			 *
			 * {
			 *   "error": {
			 *     "code": 400,
			 *     "message": "'type' must be 'output_text'",
			 *     "type": "invalid_request_error"
			 *   }
			 * }
			 *
			 * This error occurs because llama.cpp validates that content blocks
			 * in assistant messages have type === 'output_text'.
			 */

			const invalidFormat = {
				type: 'message',
				role: 'assistant',
				content: 'response text', // ❌ llama.cpp expects array
			};

			const validFormat = {
				type: 'message',
				role: 'assistant',
				content: [
					{
						type: 'output_text', // ✅ This is what llama.cpp validates
						text: 'response text',
					},
				],
			};

			expect(typeof invalidFormat.content).toBe('string');
			expect(Array.isArray(validFormat.content)).toBe(true);
			expect(validFormat.content[0].type).toBe('output_text');
		});

		it('documents a complete request that would be rejected by llama.cpp', () => {
			/**
			 * This is the actual request format from the bug report.
			 * llama.cpp rejects this because assistant message content is a string.
			 */
			const rejectedRequest = {
				input: [
					{
						type: 'message',
						role: 'user',
						content: 'wassup',
					},
					{
						type: 'message',
						role: 'assistant',
						content: 'Not much, just here and ready to help! How\'s it going with you?', // ❌ BUG
					},
					{
						type: 'message',
						role: 'user',
						content: 'test',
					},
				],
				model: 'gpt-5-mini',
			};

			// This request will fail with llama.cpp
			const assistantMsg = rejectedRequest.input[1];
			expect(typeof assistantMsg.content).toBe('string'); // BUG
		});

		it('documents the correct request format for llama.cpp', () => {
			/**
			 * This is how the request should be formatted to work with llama.cpp
			 * and other OpenAI-compatible servers using the Responses API.
			 */
			const correctRequest = {
				input: [
					{
						type: 'message',
						role: 'user',
						content: [
							{
								type: 'input_text',
								text: 'wassup',
							},
						],
					},
					{
						type: 'message',
						role: 'assistant',
						content: [
							{
								type: 'output_text', // ✅ Required for llama.cpp
								text: 'Not much, just here and ready to help! How\'s it going with you?',
							},
						],
					},
					{
						type: 'message',
						role: 'user',
						content: [
							{
								type: 'input_text',
								text: 'test',
							},
						],
					},
				],
				model: 'gpt-5-mini',
			};

			// Verify correct format
			const assistantMsg = correctRequest.input[1];
			expect(Array.isArray(assistantMsg.content)).toBe(true);
			expect(assistantMsg.content[0].type).toBe('output_text');
		});
	});

	describe('Fix requirements', () => {
		it('documents where the fix should be implemented', () => {
			/**
			 * The fix should be implemented in one of these locations:
			 *
			 * 1. In LangChain's ChatOpenAI class when useResponsesApi is true
			 *    - Convert AIMessage.content (string) → [{type: 'output_text', text: string}]
			 *    - This should happen before sending to the API
			 *
			 * 2. In n8n's message preparation code
			 *    - Add a transformation step for messages loaded from memory
			 *    - Apply transformation only when Responses API is enabled
			 *
			 * 3. In the memory loading function (loadMemory)
			 *    - Transform messages as they're loaded
			 *    - But this would require knowing if Responses API is enabled
			 *
			 * Option 1 is preferred as it keeps the fix in the LangChain integration.
			 */

			// Pseudocode for the fix:
			const transformMessageForResponsesApi = (message: AIMessage) => {
				if (typeof message.content === 'string' && message.content !== '') {
					return {
						...message,
						content: [
							{
								type: 'output_text',
								text: message.content,
							},
						],
					};
				}
				return message;
			};

			// Test the transformation logic
			const input = new AIMessage('test response');
			const expected = {
				content: [{ type: 'output_text', text: 'test response' }],
			};

			const result = transformMessageForResponsesApi(input);
			expect(result.content).toEqual(expected.content);
		});
	});
});
