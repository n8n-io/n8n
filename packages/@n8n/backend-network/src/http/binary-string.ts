import { IncomingMessage } from 'http';
import { decode } from 'iconv-lite';
import { UnexpectedError } from 'n8n-workflow';
import type { Readable } from 'stream';

import { parseIncomingMessage } from './parse-incoming-message';

/** Converts a readable stream to a buffer */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
	return await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		stream.on('data', (chunk: Buffer) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.once('error', (cause) => {
			if ('code' in cause && cause.code === 'Z_DATA_ERROR')
				reject(new UnexpectedError('Failed to decompress response', { cause }));
			else reject(cause);
		});
	});
}

/** Converts a buffer or a readable stream to a buffer */
async function binaryToBuffer(body: Buffer | Readable): Promise<Buffer> {
	if (Buffer.isBuffer(body)) return body;
	return await streamToBuffer(body);
}

/**
 * Decodes a buffer or stream into a string, resolving the character encoding
 * from an `IncomingMessage`'s content-type when no explicit encoding is given.
 */
export async function binaryToString(body: Buffer | Readable, encoding?: string) {
	if (!encoding && body instanceof IncomingMessage) {
		parseIncomingMessage(body);
		encoding = body.encoding;
	}
	const buffer = await binaryToBuffer(body);
	return decode(buffer, encoding ?? 'utf-8');
}
