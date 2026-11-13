import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';

import type { StreamWriterGuard } from '../../streaming/stream-writer-guard';
import type { RunServices } from '../run-output-sink';
import { MAX_FLEX_UNAVAILABLE_RETRIES } from '../../model/flex-unavailable';
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

function makeFlexUnavailableTurn(): MockStreamResult {
	const error = Object.assign(new Error('Flex processing is temporarily unavailable.'), {
		code: 'flex_unavailable',
	});
	return {
		stream: convertArrayToReadableStream([
			{ type: 'stream-start', warnings: [] },
			{ type: 'error', error },
		]),
	};
}

function makeSink(write = vi.fn<StreamWriterGuard['write']>().mockResolvedValue(undefined)) {
	const sink = new StreamSink(
		{ write } as unknown as StreamWriterGuard,
		{
			modelId: 'mock/scripted',
		} as RunServices,
		{ modelStreamIdleTimeoutMs: 0, smoothStream: false },
	);
	return { sink, write };
}

function callContext(model: MockLanguageModelV3, abortSignal = new AbortController().signal) {
	return {
		model,
		system: [],
		messages: [{ role: 'user' as const, content: 'hello' }],
		abortSignal,
		hasTools: false,
		aiTools: {},
		aiSdkOptions: {},
	};
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

	describe('OpenAI Flex without capacity', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('waits and re-issues the turn without forwarding the error', async () => {
			const model = new MockLanguageModelV3({
				provider: 'mock',
				modelId: 'scripted',
				doStream: [
					makeFlexUnavailableTurn(),
					makeFlexUnavailableTurn(),
					makeTextTurn('recovered response'),
				],
			});
			const { sink, write } = makeSink();

			const pending = sink.callModel(callContext(model));
			await vi.advanceTimersByTimeAsync(1000 + 2000);
			const result = await pending;

			expect(result.newMessages).toEqual([
				{ role: 'assistant', content: [{ type: 'text', text: 'recovered response' }] },
			]);
			expect(write.mock.calls.some(([chunk]) => chunk.type === 'error')).toBe(false);
			expect(model.doStreamCalls).toHaveLength(3);
		});

		it('surfaces the error once the retries are used up', async () => {
			const model = new MockLanguageModelV3({
				provider: 'mock',
				modelId: 'scripted',
				doStream: Array.from({ length: MAX_FLEX_UNAVAILABLE_RETRIES + 1 }, () =>
					makeFlexUnavailableTurn(),
				),
			});
			const { sink } = makeSink();

			const pending = sink.callModel(callContext(model));
			const assertion = expect(pending).rejects.toHaveProperty('code', 'flex_unavailable');
			await vi.advanceTimersByTimeAsync(5 * 60_000);
			await assertion;

			expect(model.doStreamCalls).toHaveLength(MAX_FLEX_UNAVAILABLE_RETRIES + 1);
		});

		it('stops waiting when the run is aborted', async () => {
			const model = new MockLanguageModelV3({
				provider: 'mock',
				modelId: 'scripted',
				doStream: [makeFlexUnavailableTurn(), makeTextTurn('never reached')],
			});
			const { sink } = makeSink();
			const controller = new AbortController();

			const pending = sink.callModel(callContext(model, controller.signal));
			// The abort reason proves the wait was interrupted. A Flex error thrown without waiting would carry another message.
			const assertion = expect(pending).rejects.toThrow('stopped');
			await vi.advanceTimersByTimeAsync(10);
			controller.abort(new Error('stopped'));
			await assertion;

			expect(model.doStreamCalls).toHaveLength(1);
		});
	});
});
