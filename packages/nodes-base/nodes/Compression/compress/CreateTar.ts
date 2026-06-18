import { ensureError } from 'n8n-workflow';

export interface TarInputFile {
	fileName: string;
	data: Buffer;
}

/**
 * Bundle the given files into a tar archive, optionally gzip-compressed
 * (.tar.gz/.tgz). The archive is built entirely in memory.
 */
export async function createTar(
	files: TarInputFile[],
	options: { gzip?: boolean } = {},
): Promise<Buffer> {
	// tar is a heavy, rarely-used dependency on this code path, so load it lazily.
	const { Pack, ReadEntry, Header } = await import('tar');

	return await new Promise<Buffer>((resolve, reject) => {
		const pack = new Pack(options.gzip ? { gzip: true } : {});
		const chunks: Buffer[] = [];

		pack.on('data', (chunk: Buffer) => chunks.push(chunk));
		pack.on('end', () => resolve(Buffer.concat(chunks)));
		pack.on('error', (error: unknown) => reject(ensureError(error)));

		for (const { fileName, data } of files) {
			const entry = new ReadEntry(
				new Header({ path: fileName, size: data.length, mode: 0o644, type: 'File' }),
			);
			entry.end(data);
			pack.write(entry);
		}

		pack.end();
	});
}
