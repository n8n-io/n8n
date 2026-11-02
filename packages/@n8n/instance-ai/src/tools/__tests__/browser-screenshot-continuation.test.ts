import { Agent } from '@n8n/agents';
import type { McpToolCallResult } from '@n8n/api-types';
import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

import { createToolsFromLocalMcpServer } from '../create-tools-from-mcp-server';

const SCREENSHOT_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
const SCREENSHOT_HINT = 'Screenshot of the current page';
const FINAL_REPLY = 'The page shows a blank image.';
const USAGE = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

describe('Browser Use tool continuation', () => {
	it.each([false, true])(
		'continues after browser_screenshot with image output: %s',
		async (includeImage) => {
			// NODE-6253: The next model call must not use assistant message prefill.
			const toolResult: McpToolCallResult = {
				content: [{ type: 'text', text: SCREENSHOT_HINT }],
			};
			if (includeImage) {
				toolResult.content.push({ type: 'image', data: SCREENSHOT_BASE64, mimeType: 'image/png' });
			}
			const callTool = vi.fn().mockResolvedValue(toolResult);
			const tools = createToolsFromLocalMcpServer({
				server: {
					getAvailableTools: () => [
						{
							name: 'browser_screenshot',
							description: 'Take a screenshot of the current page',
							inputSchema: { type: 'object', properties: {} },
						},
					],
					getToolsByCategory: () => [],
					callTool,
				},
				logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
			});
			const doGenerate = vi
				.fn<MockLanguageModelV3['doGenerate']>()
				.mockResolvedValueOnce({
					content: [
						{
							type: 'tool-call',
							toolCallId: 'screenshot-call',
							toolName: 'browser_screenshot',
							input: '{}',
						},
					],
					finishReason: { unified: 'tool-calls', raw: 'tool_use' },
					usage: USAGE,
					warnings: [],
				})
				.mockImplementation(async ({ prompt }) => {
					if (prompt.at(-1)?.role === 'assistant') {
						throw new APICallError({
							message:
								'This model does not support assistant message prefill. The conversation must end with a user message.',
							url: 'https://model.test/v1/messages',
							requestBodyValues: {},
							statusCode: 400,
							isRetryable: false,
						});
					}
					return {
						content: [{ type: 'text', text: FINAL_REPLY }],
						finishReason: { unified: 'stop', raw: 'end_turn' },
						usage: USAGE,
						warnings: [],
					};
				});
			const model = new MockLanguageModelV3({ doGenerate });
			const agent = new Agent('browser-screenshot-continuation')
				.model(model)
				.modelFetch(async () => Response.json({}))
				.instructions('Take a screenshot and describe the page.')
				.checkpoint('memory')
				.tool([...tools.values()]);

			const result = await agent.generate('Take a screenshot and tell me what it shows.', {
				maxIterations: 2,
			});

			expect(callTool).toHaveBeenCalledExactlyOnceWith(
				{ name: 'browser_screenshot', arguments: {} },
				{ abortSignal: expect.any(AbortSignal) },
			);
			expect(model.doGenerateCalls).toHaveLength(2);
			const nextPrompt = model.doGenerateCalls[1].prompt;
			const toolOutput = nextPrompt
				.filter((message) => message.role === 'tool')
				.flatMap((message) => message.content)
				.find((part) => part.type === 'tool-result' && part.toolCallId === 'screenshot-call');
			expect(toolOutput).toMatchObject({
				output: {
					type: 'content',
					value: expect.arrayContaining([
						{ type: 'text', text: expect.stringContaining(SCREENSHOT_HINT) },
						...(includeImage
							? [
									expect.objectContaining({
										type: 'file-data',
										data: SCREENSHOT_BASE64,
										mediaType: 'image/png',
									}),
								]
							: []),
					]),
				},
			});
			expect(result.error).toBeUndefined();
			expect(nextPrompt.at(-1)?.role).not.toBe('assistant');
			expect(result.finishReason).toBe('stop');
			expect(result.messages.at(-1)).toMatchObject({
				role: 'assistant',
				content: expect.arrayContaining([{ type: 'text', text: FINAL_REPLY }]),
			});
		},
	);
});
