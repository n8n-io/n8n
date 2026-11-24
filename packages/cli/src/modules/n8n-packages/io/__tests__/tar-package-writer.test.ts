import type { Readable } from 'node:stream';
import { Parser, type ReadEntry } from 'tar';

import { TarPackageWriter } from '../tar/tar-package-writer';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

interface UnpackedEntry {
	name: string;
	type: string;
	mtime: Date | undefined;
	content: Buffer;
}

async function unpackTar(buffer: Buffer): Promise<UnpackedEntry[]> {
	const entries: UnpackedEntry[] = [];
	return await new Promise((resolve, reject) => {
		const parser = new Parser();
		parser.on('entry', (entry: ReadEntry) => {
			const chunks: Buffer[] = [];
			entry.on('data', (c: Buffer) => chunks.push(c));
			entry.on('end', () => {
				entries.push({
					name: entry.path,
					type: entry.type,
					mtime: entry.mtime,
					content: Buffer.concat(chunks),
				});
			});
			entry.resume();
		});
		parser.on('error', reject);
		parser.on('end', () => resolve(entries));
		parser.end(buffer);
	});
}

describe('TarPackageWriter', () => {
	it('emits manifest.json as the first entry regardless of write order', async () => {
		const writer = new TarPackageWriter();

		writer.writeDirectory('workflows/wf-abc');
		writer.writeFile('workflows/wf-abc/workflow.json', '{"id":"abc"}');
		writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');

		const buffer = await streamToBuffer(writer.finalize());
		const entries = await unpackTar(buffer);

		expect(entries[0].name).toBe('manifest.json');
		expect(JSON.parse(entries[0].content.toString())).toEqual({ packageFormatVersion: '1' });
	});

	it('uses a fixed epoch mtime so packages are byte-identical for the same input', async () => {
		const build = async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('manifest.json', '{}');
			writer.writeDirectory('workflows/x');
			writer.writeFile('workflows/x/workflow.json', '{"id":"x"}');
			return await streamToBuffer(writer.finalize());
		};

		const first = await build();
		// Wait a tick so any wall-clock-derived mtime would differ between runs.
		await new Promise((r) => setTimeout(r, 5));
		const second = await build();

		expect(first.equals(second)).toBe(true);

		const entries = await unpackTar(first);
		for (const entry of entries) {
			expect(entry.mtime?.getTime()).toBe(0);
		}
	});

	it('normalises leading "./" entry paths', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('manifest.json', '{}');
		writer.writeFile('./workflows/wf/workflow.json', '{}');
		writer.writeDirectory('./workflows/wf');

		const buffer = await streamToBuffer(writer.finalize());
		const entries = await unpackTar(buffer);
		const names = entries.map((e) => e.name);

		expect(names).toEqual(
			expect.arrayContaining(['manifest.json', 'workflows/wf/workflow.json', 'workflows/wf/']),
		);
		expect(names.every((n) => !n.startsWith('./'))).toBe(true);
	});
});
