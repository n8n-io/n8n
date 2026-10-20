import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';

import type { TokenUsage } from '../../../types/sdk/agent';
import type { StreamWriterGuard } from '../../streaming/stream-writer-guard';
import type { RunServices } from '../run-output-sink';
import { StreamSink } from '../stream-sink';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function makeEmptyTurn(): MockStreamResult {
	return {
		stream: convertArrayToReadableStream([{ type: 'stream-start', warnings: [] }]),
	};
}

function makeTextTurn(text: string): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 'txt-1' },
		{ type: 'text-delta', id: 'txt-1', delta: text },
		{ type: 'text-end', id: 'txt-1' },
		{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

describe('StreamSink', () => {
	it('retries an empty model stream without forwarding its error', async () => {
		const model = new MockLanguageModelV3({
			provider: 'mock',
			modelId: 'scripted',
			doStream: [makeEmptyTurn(), makeTextTurn('recovered response')],
		});
		const write = vi.fn<StreamWriterGuard['write']>().mockResolvedValue(undefined);
		const guard = { write } as unknown as StreamWriterGuard;
		const sink = new StreamSink(guard, { modelId: 'mock/scripted' } as RunServices, {
			modelStreamIdleTimeoutMs: 0,
			smoothStream: false,
		});

		const result = await sink.callModel({
			model,
			system: [],
			messages: [{ role: 'user', content: 'hello' }],
			abortSignal: new AbortController().signal,
			hasTools: false,
			aiTools: {},
			aiSdkOptions: {},
		});

		expect(result.newMessages).toEqual([
			{ role: 'assistant', content: [{ type: 'text', text: 'recovered response' }] },
		]);
		expect(write.mock.calls.some(([chunk]) => chunk.type === 'error')).toBe(false);
		expect(model.doStreamCalls).toHaveLength(2);
	});

	it('preserves the no-output error after one retry', async () => {
		const model = new MockLanguageModelV3({
			provider: 'mock',
			modelId: 'scripted',
			doStream: [makeEmptyTurn(), makeEmptyTurn()],
		});
		const sink = new StreamSink(
			{ write: async () => {} } as unknown as StreamWriterGuard,
			{ modelId: 'mock/scripted' } as RunServices,
			{ modelStreamIdleTimeoutMs: 0, smoothStream: false },
		);

		await expect(
			sink.callModel({
				model,
				system: [],
				messages: [{ role: 'user', content: 'hello' }],
				abortSignal: new AbortController().signal,
				hasTools: false,
				aiTools: {},
				aiSdkOptions: {},
			}),
		).rejects.toHaveProperty('name', 'AI_NoOutputGeneratedError');
		expect(model.doStreamCalls).toHaveLength(2);
	});
});

describe('StreamSink getTerminalFinish', () => {
	function makeSink(applyCost: RunServices['applyCost']) {
		const guard = { write: async () => {} } as unknown as StreamWriterGuard;
		return new StreamSink(guard, { modelId: 'mock/scripted', applyCost } as RunServices, {
			modelStreamIdleTimeoutMs: 0,
			smoothStream: false,
		});
	}

	it('preserves the completed turns’ billed total on the terminal finish', () => {
		const sink = makeSink((usage) => usage);
		sink.reportUsage({ promptTokens: 10, completionTokens: 5, totalTokens: 15 }, 0.0042);

		const { usage } = sink.getTerminalFinish();

		expect(usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.0042 });
	});

	it('merges in-flight raw tokens without adding to the billed cost', () => {
		const sink = makeSink((usage) => usage);
		sink.reportUsage({ promptTokens: 10, completionTokens: 5, totalTokens: 15 }, 0.0042);
		// The in-flight turn's raw capture: tokens merge, its unknown cost does not.
		(sink as unknown as { rawUsageReader: { getUsage(): TokenUsage } }).rawUsageReader = {
			getUsage: () => ({ promptTokens: 3, completionTokens: 1, totalTokens: 4 }),
		};

		const { usage } = sink.getTerminalFinish();

		expect(usage).toEqual({ promptTokens: 13, completionTokens: 6, totalTokens: 19, cost: 0.0042 });
	});

	it('emits a cost-only record when billed turns reported no token usage', () => {
		const sink = makeSink((usage) => usage);
		sink.reportUsage(undefined, 0.001);

		const { usage } = sink.getTerminalFinish();

		expect(usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0.001 });
	});

	it('leaves the estimate to applyCost when no billed total was reported', () => {
		const applyCost = vi.fn((usage: TokenUsage | undefined) =>
			usage ? { ...usage, cost: 99 } : usage,
		);
		const sink = makeSink(applyCost);
		sink.reportUsage({ promptTokens: 10, completionTokens: 5, totalTokens: 15 }, undefined);

		const { usage } = sink.getTerminalFinish();

		expect(applyCost).toHaveBeenCalledWith({
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
		});
		expect(usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 99 });
	});
});
