import { EventEmitter } from 'node:events';

import {
	type ResponseStream,
	StreamingWebhookResponseHeartbeat,
} from '@/webhooks/streaming-webhook-response-heartbeat';

const INTERVAL_MS = 30_000;
const KEEPALIVE = '{"type":"keepalive"}\n';

/** An HTTP response stand-in that emits `finish` and `close` like the real one. */
class FakeResponseStream extends EventEmitter implements ResponseStream {
	writableEnded = false;

	destroyed = false;

	readonly write = vi.fn();

	readonly end = vi.fn();

	readonly flush = vi.fn();
}

describe('StreamingWebhookResponseHeartbeat', () => {
	let stream: FakeResponseStream;

	beforeEach(() => {
		vi.useFakeTimers();
		stream = new FakeResponseStream();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('writes and flushes a keepalive at each interval', () => {
		const heartbeat = new StreamingWebhookResponseHeartbeat(stream);

		vi.advanceTimersByTime(INTERVAL_MS - 1);
		expect(stream.write).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(stream.write).toHaveBeenCalledWith(KEEPALIVE);
		expect(stream.flush).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(INTERVAL_MS);
		expect(stream.write).toHaveBeenCalledTimes(2);

		heartbeat.stop();
	});

	it('writes a keepalive to a stream without a flush method', () => {
		const withoutFlush: ResponseStream = {
			writableEnded: false,
			write: vi.fn(),
			end: vi.fn(),
			once: vi.fn(),
			off: vi.fn(),
		};
		const heartbeat = new StreamingWebhookResponseHeartbeat(withoutFlush);

		vi.advanceTimersByTime(INTERVAL_MS);

		expect(withoutFlush.write).toHaveBeenCalledWith(KEEPALIVE);
		heartbeat.stop();
	});

	it('writes nothing after stop', () => {
		const heartbeat = new StreamingWebhookResponseHeartbeat(stream);

		heartbeat.stop();
		vi.advanceTimersByTime(INTERVAL_MS * 2);

		expect(stream.write).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it.each(['finish', 'close'] as const)('stops when the response emits %s', (event) => {
		new StreamingWebhookResponseHeartbeat(stream);

		stream.emit(event);
		vi.advanceTimersByTime(INTERVAL_MS);

		expect(stream.write).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('removes its listeners when it stops', () => {
		const heartbeat = new StreamingWebhookResponseHeartbeat(stream);
		expect(stream.listenerCount('finish')).toBe(1);
		expect(stream.listenerCount('close')).toBe(1);

		heartbeat.stop();

		expect(stream.listenerCount('finish')).toBe(0);
		expect(stream.listenerCount('close')).toBe(0);
	});

	it.each([
		['ended', { writableEnded: true }],
		['destroyed', { destroyed: true }],
	])('stops without a write when the response is %s', (_, state) => {
		new StreamingWebhookResponseHeartbeat(stream);
		Object.assign(stream, state);

		vi.advanceTimersByTime(INTERVAL_MS);

		expect(stream.write).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
		expect(stream.listenerCount('close')).toBe(0);
	});

	it('allows a second stop', () => {
		const heartbeat = new StreamingWebhookResponseHeartbeat(stream);

		heartbeat.stop();

		expect(() => heartbeat.stop()).not.toThrow();
	});
});
