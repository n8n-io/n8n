import type { IRunExecutionData } from 'n8n-workflow';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compress execution data using gzip compression
 */
export async function compressExecutionData(data: IRunExecutionData): Promise<Buffer> {
	try {
		const jsonString = JSON.stringify(data);
		const compressed = await gzipAsync(Buffer.from(jsonString, 'utf8'));
		return compressed;
	} catch (error) {
		throw new Error(
			`Failed to compress execution data: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Decompress execution data from gzip compressed buffer
 */
export async function decompressExecutionData(buffer: Buffer): Promise<IRunExecutionData> {
	try {
		const decompressed = await gunzipAsync(buffer);
		const jsonString = decompressed.toString('utf8');
		return JSON.parse(jsonString) as IRunExecutionData;
	} catch (error) {
		throw new Error(
			`Failed to decompress execution data: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}
