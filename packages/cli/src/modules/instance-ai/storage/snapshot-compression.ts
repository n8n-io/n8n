import { jsonParse } from 'n8n-workflow';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const GZIP_LEVEL = 6;

export async function compressSnapshot(snapshot: unknown): Promise<Buffer> {
	const json = JSON.stringify(snapshot);
	return await gzipAsync(Buffer.from(json), { level: GZIP_LEVEL });
}

export async function decompressSnapshot<T>(data: Buffer): Promise<T> {
	const decompressed = await gunzipAsync(data);
	return jsonParse<T>(decompressed.toString());
}
