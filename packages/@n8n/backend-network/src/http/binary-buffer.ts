import { UnexpectedError } from 'n8n-workflow';
import type { Readable } from 'stream';

/** Converts a readable stream to a buffer */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
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
export async function binaryToBuffer(body: Buffer | Readable): Promise<Buffer> {
	if (Buffer.isBuffer(body)) return body;
	return await streamToBuffer(body);
}
