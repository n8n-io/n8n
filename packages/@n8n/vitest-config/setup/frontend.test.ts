import { describe, expect, it } from 'vitest';

// The harness is a side-effect module: importing it patches the jsdom globals
// asserted below. Consumers get it via `setupFiles`, so this mirrors real usage.
import './frontend.js';

describe('DataTransfer mock', () => {
	it('round-trips a value written under a MIME type', () => {
		const dataTransfer = new window.DataTransfer();

		dataTransfer.setData('text/plain', 'hello');

		expect(dataTransfer.getData('text/plain')).toBe('hello');
	});

	it.each([
		['text', 'text/plain'],
		['url', 'text/uri-list'],
	])('canonicalizes the %s shorthand in both directions', (shorthand, mimeType) => {
		const writtenAsShorthand = new window.DataTransfer();
		writtenAsShorthand.setData(shorthand, 'value');
		expect(writtenAsShorthand.getData(mimeType)).toBe('value');

		const writtenAsMimeType = new window.DataTransfer();
		writtenAsMimeType.setData(mimeType, 'value');
		expect(writtenAsMimeType.getData(shorthand)).toBe('value');
	});

	it('keeps distinct text formats in separate slots', () => {
		const dataTransfer = new window.DataTransfer();

		dataTransfer.setData('text/html', '<b>hello</b>');
		dataTransfer.setData('text/plain', 'hello');

		expect(dataTransfer.getData('text/html')).toBe('<b>hello</b>');
		expect(dataTransfer.getData('text/plain')).toBe('hello');
	});

	it('is case-insensitive about the format', () => {
		const dataTransfer = new window.DataTransfer();

		dataTransfer.setData('Text/Plain', 'hello');

		expect(dataTransfer.getData('text/plain')).toBe('hello');
	});

	it('round-trips an application-defined format untouched', () => {
		const dataTransfer = new window.DataTransfer();

		dataTransfer.setData('nodesAndConnections', '{"nodes":[]}');

		expect(dataTransfer.getData('nodesAndConnections')).toBe('{"nodes":[]}');
	});

	it('returns null for a format that was never set', () => {
		expect(new window.DataTransfer().getData('text/plain')).toBeNull();
	});
});

describe('Worker mock', () => {
	it('delivers the payload as a MessageEvent, not the bare object', () => {
		const worker = new window.Worker('worker.js');
		const received: Array<MessageEvent<{ id: number }>> = [];
		worker.onmessage = (event: MessageEvent<{ id: number }>) => received.push(event);

		worker.postMessage({ id: 1 });

		expect(received).toHaveLength(1);
		expect(received[0]).toBeInstanceOf(MessageEvent);
		// The break this guards: consumers destructure `{ data }` (safeRegex.ts).
		expect(received[0].data).toEqual({ id: 1 });
	});

	it('dispatches synchronously so tests need no flush', () => {
		const worker = new window.Worker('worker.js');
		let handled = false;
		worker.onmessage = () => {
			handled = true;
		};

		worker.postMessage('ping');

		expect(handled).toBe(true);
	});
});
