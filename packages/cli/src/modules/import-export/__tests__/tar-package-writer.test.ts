import * as tar from 'tar-stream';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

import { TarPackageWriter } from '../tar-package-writer';

async function extractEntries(stream: NodeJS.ReadableStream) {
	const entries: Array<{ name: string; type: string; content: string }> = [];
	const extract = tar.extract();

	extract.on('entry', (header, entryStream, next) => {
		const chunks: Buffer[] = [];
		entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));
		entryStream.on('end', () => {
			entries.push({
				name: header.name,
				type: header.type ?? 'file',
				content: Buffer.concat(chunks).toString('utf-8'),
			});
			next();
		});
		entryStream.resume();
	});

	await pipeline(stream, createGunzip(), extract);

	return entries;
}

describe('TarPackageWriter', () => {
	it('should write a file and read it back from the tar', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('test.txt', 'hello world');
		const stream = writer.finalize();

		const entries = await extractEntries(stream);

		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe('test.txt');
		expect(entries[0].content).toBe('hello world');
	});

	it('should write a directory entry', async () => {
		const writer = new TarPackageWriter();
		writer.writeDirectory('projects/billing');
		writer.writeFile('projects/billing/project.json', '{}');
		const stream = writer.finalize();

		const entries = await extractEntries(stream);

		expect(entries).toHaveLength(2);
		expect(entries[0].name).toBe('projects/billing/');
		expect(entries[0].type).toBe('directory');
		expect(entries[1].name).toBe('projects/billing/project.json');
	});

	it('should write Buffer content', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('data.bin', Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
		const stream = writer.finalize();

		const entries = await extractEntries(stream);

		expect(entries[0].content).toBe('Hello');
	});

	it('should produce deterministic output (fixed mtime)', async () => {
		const createPackage = async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('test.txt', 'content');
			const stream = writer.finalize();

			const chunks: Buffer[] = [];
			for await (const chunk of stream) {
				chunks.push(chunk as Buffer);
			}
			return Buffer.concat(chunks);
		};

		const first = await createPackage();
		const second = await createPackage();

		expect(first.equals(second)).toBe(true);
	});

	it('should write multiple files', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('manifest.json', '{"version":"1"}');
		writer.writeDirectory('projects/a');
		writer.writeFile('projects/a/project.json', '{"id":"a"}');
		const stream = writer.finalize();

		const entries = await extractEntries(stream);

		expect(entries).toHaveLength(3);
		expect(entries.map((e) => e.name)).toEqual([
			'manifest.json',
			'projects/a/',
			'projects/a/project.json',
		]);
	});
});
