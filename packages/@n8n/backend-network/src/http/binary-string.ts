import { IncomingMessage } from 'http';
import { decode } from 'iconv-lite';
import type { Readable } from 'stream';

import { binaryToBuffer } from './binary-buffer';
import { parseIncomingMessage } from './parse-incoming-message';

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
