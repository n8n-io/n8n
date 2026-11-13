import { BufferMemory } from '@langchain/classic/memory';
import { DynamicStructuredTool } from '@langchain/classic/tools';
import { getGeminiAPI } from '@langchain/google-common/utils';
import { AIMessage, AIMessageChunk, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { EngineResponse } from 'n8n-workflow';
import { z } from 'zod';

import { buildSteps } from '../buildSteps';
import { createEngineRequests } from '../createEngineRequests';
import { saveToMemory } from '../memoryManagement';
import type { RequestResponseMetadata, ToolCallRequest } from '../types';

// Round trip of one model turn: model message -> engine requests -> rebuilt steps.
// The model's text before its tool calls must survive, and no synthetic text may appear.

const LEADING_TEXT = 'I will convert alpha and reverse beta.';

const tools = ['code_tool', 'reverse_tool'].map(
	(name) =>
		new DynamicStructuredTool({
			name,
			description: name,
			schema: z.object({ input: z.string() }),
			func: async () => 'result',
			metadata: { sourceNodeName: name },
		}),
);

const calls = [
	{ id: 'call_1', name: 'code_tool', args: { input: 'alpha' }, type: 'tool_call' as const },
	{ id: 'call_2', name: 'reverse_tool', args: { input: 'beta' }, type: 'tool_call' as const },
];

/** Tool call requests as processEventStream builds them: every call carries the message. */
function streamedRequests(message: AIMessage): ToolCallRequest[] {
	return (message.tool_calls ?? []).map((tc) => ({
		tool: tc.name,
		toolInput: tc.args,
		toolCallId: tc.id!,
		type: 'tool_call',
		log: message.text,
		messageLog: [message],
		additionalKwargs: message.additional_kwargs,
	}));
}

/** Tool call requests as the LangChain tool calling agent builds them: only the first call has the message. */
function invokedRequests(message: AIMessage): ToolCallRequest[] {
	return (message.tool_calls ?? []).map((tc, i) => ({
		tool: tc.name,
		toolInput: tc.args,
		toolCallId: tc.id!,
		log: `Invoking "${tc.name}"`,
		messageLog: i === 0 ? [message] : [],
	}));
}

function roundTrip(requests: ToolCallRequest[]) {
	const actions = createEngineRequests(requests, 0, tools);
	const response: EngineResponse<RequestResponseMetadata> = {
		actionResponses: actions.map((action) => ({
			action,
			data: {
				data: { ai_tool: [[{ json: { result: 'ok' } }]] },
				executionTime: 0,
				startTime: 0,
				executionIndex: 0,
				source: [],
			},
		})),
		metadata: {},
	};
	return buildSteps(response, 0);
}

function rebuiltAIMessages(steps: ReturnType<typeof buildSteps>): AIMessage[] {
	return steps.flatMap((step) => step.action.messageLog ?? []);
}

/** Parts that @langchain/google-common sends to Gemini for the replayed model turn. */
async function geminiModelParts(messages: BaseMessage[]) {
	const data = (await getGeminiAPI().formatData([new HumanMessage('hi'), ...messages], {})) as {
		contents: Array<{ role: string; parts: Array<Record<string, unknown>> }>;
	};
	return data.contents.filter((c) => c.role === 'model').map((c) => c.parts);
}

function geminiMessage(MessageClass: typeof AIMessage | typeof AIMessageChunk, parallel: boolean) {
	const toolCalls = parallel ? calls : calls.slice(0, 1);
	return new MessageClass({
		content: [
			{ type: 'text', text: 'I will convert alpha' },
			{ type: 'text', text: ' and reverse beta.' },
		],
		tool_calls: toolCalls,
		additional_kwargs: {
			// One signature per response part: two text parts, then the function calls
			signatures: ['', '', 'sig_abc', ...toolCalls.slice(1).map(() => '')],
		},
	});
}

describe('model text before tool calls', () => {
	describe('Gemini', () => {
		it.each([
			['streamed', AIMessageChunk, streamedRequests],
			['not streamed', AIMessage, invokedRequests],
		] as const)('keeps the text of parallel calls (%s)', async (_, MessageClass, toRequests) => {
			const steps = roundTrip(toRequests(geminiMessage(MessageClass, true)));
			const messages = rebuiltAIMessages(steps);

			expect(messages).toHaveLength(1);
			expect(messages[0].text).toBe(LEADING_TEXT);
			expect(messages[0].tool_calls).toHaveLength(2);

			const toolMessages = steps.map(
				(s) =>
					new ToolMessage({ content: s.observation, tool_call_id: s.action.toolCallId as string }),
			);
			const [parts] = await geminiModelParts([messages[0], ...toolMessages]);
			expect(parts).toEqual([
				{ text: LEADING_TEXT },
				{
					functionCall: { name: 'code_tool', args: { input: 'alpha' } },
					thoughtSignature: 'sig_abc',
				},
				{ functionCall: { name: 'reverse_tool', args: { input: 'beta' } } },
			]);
		});

		it.each([
			['streamed', AIMessageChunk, streamedRequests],
			['not streamed', AIMessage, invokedRequests],
		] as const)('keeps the text of a single call (%s)', async (_, MessageClass, toRequests) => {
			const steps = roundTrip(toRequests(geminiMessage(MessageClass, false)));
			const messages = rebuiltAIMessages(steps);

			expect(messages).toHaveLength(1);
			expect(messages[0].text).toBe(LEADING_TEXT);

			const [parts] = await geminiModelParts([
				messages[0],
				new ToolMessage({ content: steps[0].observation, tool_call_id: 'call_1' }),
			]);
			expect(parts).toEqual([
				{ text: LEADING_TEXT },
				{
					functionCall: { name: 'code_tool', args: { input: 'alpha' } },
					thoughtSignature: 'sig_abc',
				},
			]);
		});

		it('sends no text part when the model wrote no text', async () => {
			const message = new AIMessage({
				content: [],
				tool_calls: calls,
				additional_kwargs: { signatures: ['sig_abc', ''] },
			});
			const steps = roundTrip(streamedRequests(message));
			const messages = rebuiltAIMessages(steps);

			expect(messages).toHaveLength(1);
			const toolMessages = steps.map(
				(s) =>
					new ToolMessage({ content: s.observation, tool_call_id: s.action.toolCallId as string }),
			);
			const [parts] = await geminiModelParts([messages[0], ...toolMessages]);
			expect(parts).toEqual([
				{
					functionCall: { name: 'code_tool', args: { input: 'alpha' } },
					thoughtSignature: 'sig_abc',
				},
				{ functionCall: { name: 'reverse_tool', args: { input: 'beta' } } },
			]);
		});
	});

	describe('OpenAI', () => {
		it.each([
			['streamed', AIMessageChunk, streamedRequests],
			['not streamed', AIMessage, invokedRequests],
		] as const)('keeps the text of a single call (%s)', (_, MessageClass, toRequests) => {
			const message = new MessageClass({ content: LEADING_TEXT, tool_calls: calls.slice(0, 1) });
			const messages = rebuiltAIMessages(roundTrip(toRequests(message)));

			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe(LEADING_TEXT);
			expect(messages[0].tool_calls).toEqual([calls[0]]);
		});

		it.each([
			['streamed', AIMessageChunk, streamedRequests],
			['not streamed', AIMessage, invokedRequests],
		] as const)('keeps the text of parallel calls once (%s)', (_, MessageClass, toRequests) => {
			const message = new MessageClass({ content: LEADING_TEXT, tool_calls: calls });
			const messages = rebuiltAIMessages(roundTrip(toRequests(message)));

			// Calls without a thinking signature are replayed one message each; the text goes on the first
			expect(messages.map((m) => m.content)).toEqual([LEADING_TEXT, []]);
		});
	});

	describe('Anthropic', () => {
		it('keeps the text block between the thinking block and the tool_use block', () => {
			const message = new AIMessage({
				content: [
					{ type: 'thinking', thinking: 'plan', signature: 'sig_t' },
					{ type: 'text', text: LEADING_TEXT },
					{ type: 'tool_use', id: 'call_1', name: 'code_tool', input: { input: 'alpha' } },
				],
				tool_calls: calls.slice(0, 1),
			});
			const messages = rebuiltAIMessages(roundTrip(streamedRequests(message)));

			expect(messages[0].content).toEqual([
				{ type: 'thinking', thinking: 'plan', signature: 'sig_t' },
				{ type: 'text', text: LEADING_TEXT },
				{ type: 'tool_use', id: 'call_1', name: 'code_tool', input: { input: 'alpha' } },
			]);
		});
	});

	describe('memory', () => {
		it('stores the model text, not synthetic text', async () => {
			const memory = new BufferMemory({ returnMessages: true, memoryKey: 'chat_history' });
			const steps = roundTrip(streamedRequests(geminiMessage(AIMessageChunk, true)));

			await saveToMemory('Do two things', 'Done', memory, steps);

			const stored = await memory.chatHistory.getMessages();
			const aiTexts = stored.filter((m) => m instanceof AIMessage).map((m) => m.text);
			expect(aiTexts).toEqual([LEADING_TEXT, 'Done']);
			expect(JSON.stringify(stored)).not.toContain('Calling tool');
		});
	});
});
