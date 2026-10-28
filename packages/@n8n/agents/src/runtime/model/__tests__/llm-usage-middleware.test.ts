import {
	runWithLlmCallContext,
	setLlmCallGuard,
	setLlmUsageSink,
	type LlmUsageRecord,
} from '@n8n/ai-utilities/llm-usage';
import { generateText, streamText } from 'ai';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';

import { withLlmUsageReporting } from '../llm-usage-middleware';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockGenerateResult = Awaited<ReturnType<MockLanguageModelV3['doGenerate']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const usage = {
	inputTokens: { total: 120, noCache: 20, cacheRead: 90, cacheWrite: 10 },
	outputTokens: { total: 7, text: 7, reasoning: 0 },
};
const finishReason = { unified: 'stop' as const, raw: 'stop' };

const generateResult: MockGenerateResult = {
	content: [{ type: 'text', text: 'OK' }],
	finishReason,
	usage,
	warnings: [],
	response: { id: 'msg_1', modelId: 'claude-x-20260101', timestamp: new Date() },
};

const streamParts: MockStreamPart[] = [
	{ type: 'stream-start', warnings: [] },
	{ type: 'response-metadata', id: 'msg_2', modelId: 'claude-x-20260101' },
	{ type: 'text-delta', id: 'txt-1', delta: 'OK' },
	{ type: 'finish', finishReason, usage },
];

const mockModel = () =>
	new MockLanguageModelV3({
		provider: 'proxy.chat',
		modelId: 'claude-x',
		doGenerate: async () => generateResult,
		doStream: async () => ({ stream: convertArrayToReadableStream(streamParts) }),
	});

describe('withLlmUsageReporting', () => {
	let records: LlmUsageRecord[];

	beforeEach(() => {
		records = [];
		setLlmUsageSink({ write: (record) => records.push(record) });
	});

	afterEach(() => setLlmUsageSink(undefined));

	it('reports a generated call with the configured provider and the answering model', async () => {
		await generateText({ model: withLlmUsageReporting(mockModel(), 'anthropic'), prompt: 'hi' });

		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			provider: 'anthropic',
			model: 'claude-x-20260101',
			providerResponseId: 'msg_1',
			inputTokens: 120,
			outputTokens: 7,
			cacheReadTokens: 90,
			cacheWriteTokens: 10,
			startedAt: expect.any(Date),
		});
	});

	it('reports a streamed call once, when it finishes', async () => {
		const result = streamText({
			model: withLlmUsageReporting(mockModel(), 'anthropic'),
			prompt: 'hi',
		});
		await result.consumeStream();

		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ providerResponseId: 'msg_2', inputTokens: 120 });
	});

	it('uses the transport provider of a model without a configured provider', async () => {
		await generateText({ model: withLlmUsageReporting(mockModel()), prompt: 'hi' });

		expect(records[0].provider).toBe('proxy');
	});

	it('reports the credential that the model was built with', async () => {
		await generateText({
			model: withLlmUsageReporting(mockModel(), 'anthropic', { id: 'cred-1' }),
			prompt: 'hi',
		});

		expect(records[0].credential).toEqual({ id: 'cred-1' });
	});

	it('reports each call once when a model is wrapped twice', async () => {
		const model = withLlmUsageReporting(withLlmUsageReporting(mockModel(), 'anthropic'));
		await generateText({ model, prompt: 'hi' });

		expect(records).toHaveLength(1);
	});

	it('does not call the model when the guard blocks the call of the agent scope', async () => {
		const blocked = new Error('LLM budget reached');
		const guard = vi.fn().mockRejectedValue(blocked);
		setLlmCallGuard(guard);
		const model = mockModel();

		try {
			await expect(
				runWithLlmCallContext(
					{ callerType: 'agent', agentId: 'agent-1' },
					async () =>
						await generateText({
							model: withLlmUsageReporting(model, 'anthropic', { id: 'cred-1' }),
							prompt: 'hi',
							maxRetries: 0,
						}),
				),
			).rejects.toThrow(blocked.message);
		} finally {
			setLlmCallGuard(undefined);
		}

		expect(guard).toHaveBeenCalledWith({
			context: { callerType: 'agent', agentId: 'agent-1' },
			credential: { id: 'cred-1' },
			provider: 'anthropic',
			model: 'claude-x',
		});
		expect(model.doGenerateCalls).toHaveLength(0);
	});

	it('leaves the model unwrapped when no sink is set', () => {
		setLlmUsageSink(undefined);
		const model = mockModel();

		expect(withLlmUsageReporting(model, 'anthropic')).toBe(model);
	});

	it('reports nothing for a call without usage, as from an endpoint that omits it', async () => {
		const model = new MockLanguageModelV3({
			provider: 'custom.chat',
			modelId: 'local-model',
			doGenerate: async () => ({
				...generateResult,
				usage: {
					inputTokens: {
						total: undefined,
						noCache: undefined,
						cacheRead: undefined,
						cacheWrite: undefined,
					},
					outputTokens: { total: undefined, text: undefined, reasoning: undefined },
				},
			}),
		});

		await generateText({ model: withLlmUsageReporting(model, 'custom'), prompt: 'hi' });

		expect(records).toHaveLength(0);
	});
});
