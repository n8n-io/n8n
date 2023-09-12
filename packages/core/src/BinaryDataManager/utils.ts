import concatStream from 'concat-stream';
import type { Readable } from 'stream';

export const binaryToBuffer = async (body: Buffer | Readable) =>
	new Promise<Buffer>((resolve) => {
		if (Buffer.isBuffer(body)) resolve(body);
		else body.pipe(concatStream(resolve));
	});
