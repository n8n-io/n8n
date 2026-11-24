import { jsonParse } from 'n8n-workflow';
import type { Readable } from 'node:stream';
import { Parser, type ReadEntry } from 'tar';

import type { PackageManifest } from '../../spec/manifest.schema';

export interface UnpackedEntry {
	name: string;
	type: string;
	content: Buffer;
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

export async function unpackTar(buffer: Buffer): Promise<UnpackedEntry[]> {
	const entries: UnpackedEntry[] = [];
	return await new Promise((resolve, reject) => {
		const parser = new Parser();
		parser.on('entry', (entry: ReadEntry) => {
			const chunks: Buffer[] = [];
			entry.on('data', (c: Buffer) => chunks.push(c));
			entry.on('end', () => {
				entries.push({ name: entry.path, type: entry.type, content: Buffer.concat(chunks) });
			});
			entry.resume();
		});
		parser.on('error', reject);
		parser.on('end', () => resolve(entries));
		parser.end(buffer);
	});
}

export async function readExport(
	stream: Readable,
): Promise<{ manifest: PackageManifest; entries: UnpackedEntry[] }> {
	const entries = await unpackTar(await streamToBuffer(stream));
	const manifest = jsonParse<PackageManifest>(entries[0].content.toString());
	return { manifest, entries };
}
