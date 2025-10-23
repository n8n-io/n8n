import type { Response } from 'express';
import type { ServerResponse } from 'http';

type Write = ServerResponse['write'];

export type ChunkListenerCb = (chunk: string) => void;

export function captureResponseWrites<T extends Response>(res: T, onChunk: ChunkListenerCb): T {
	const originalWrite = res.write.bind(res) as Write;

	const writeListener = (chunk: string | Buffer, enc?: BufferEncoding) => {
		try {
			const text = Buffer.isBuffer(chunk) ? chunk.toString(enc ?? 'utf8') : String(chunk);
			void onChunk(text);
		} catch {
			// Don't break the stream on listener errors
		}
	};

	function write(chunk: string | Buffer, callbackFn?: (e?: Error | null) => void): boolean;
	function write(
		chunk: string | Buffer,
		encoding: BufferEncoding,
		callbackFn?: (e?: Error | null) => void,
	): boolean;
	function write(
		chunk: string | Buffer,
		encodingOrCallbackFn?: BufferEncoding | ((e?: Error | null) => void),
		callbackFn?: (e?: Error | null) => void,
	): boolean {
		// TODO: We could also change the output that gets streamed from execution engine here,
		// perhaps injecting the messageId or other metadata into the chunks. That could make
		// AI responding with multiple messages (tools, multiple agents etc) easier to handle?
		if (!encodingOrCallbackFn) {
			writeListener(chunk);
			return originalWrite(chunk);
		} else if (typeof encodingOrCallbackFn === 'function') {
			writeListener(chunk);
			return originalWrite(chunk, encodingOrCallbackFn);
		} else {
			writeListener(chunk, encodingOrCallbackFn);
			return originalWrite(chunk, encodingOrCallbackFn, callbackFn);
		}
	}

	res.write = write;

	return res;
}
