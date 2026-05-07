import { TarPackageWriter } from '../tar-package-writer';
import {
	DEFAULT_TAR_LIMITS,
	PackageReadError,
	TarPackageReader,
	type TarLimits,
} from '../tar-package-reader';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks);
}

/** Build a gzipped tar with arbitrary entry shapes (bypasses the writer's safety). */
async function buildRawTar(
	entries: Array<{
		name: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		header?: Record<string, any>;
		content?: string;
	}>,
): Promise<Buffer> {
	const tar = await import('tar-stream');
	const { createGzip } = await import('node:zlib');
	const pack = tar.pack();
	for (const entry of entries) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		pack.entry({ name: entry.name, ...(entry.header as any) } as any, entry.content ?? '');
	}
	pack.finalize();
	const chunks: Buffer[] = [];
	for await (const chunk of pack.pipe(createGzip())) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks);
}

describe('TarPackageReader', () => {
	it('should roundtrip with TarPackageWriter', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
		writer.writeDirectory('projects/billing/');
		writer.writeFile('projects/billing/project.json', '{"id":"p1","name":"billing"}');
		const buffer = await streamToBuffer(writer.finalize());

		const reader = await TarPackageReader.fromBuffer(buffer);

		expect(reader.readFile('manifest.json')).toBe('{"packageFormatVersion":"1"}');
		expect(reader.readFile('projects/billing/project.json')).toBe('{"id":"p1","name":"billing"}');
	});

	it('should throw when reading a missing file', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('exists.txt', 'hello');
		const buffer = await streamToBuffer(writer.finalize());

		const reader = await TarPackageReader.fromBuffer(buffer);

		expect(() => reader.readFile('missing.txt')).toThrow('File not found in package: missing.txt');
	});

	it('should report file existence with hasFile', async () => {
		const writer = new TarPackageWriter();
		writer.writeFile('exists.txt', 'hello');
		const buffer = await streamToBuffer(writer.finalize());

		const reader = await TarPackageReader.fromBuffer(buffer);

		expect(reader.hasFile('exists.txt')).toBe(true);
		expect(reader.hasFile('missing.txt')).toBe(false);
	});

	it('should skip directory entries', async () => {
		const writer = new TarPackageWriter();
		writer.writeDirectory('projects/');
		writer.writeFile('projects/file.txt', 'content');
		const buffer = await streamToBuffer(writer.finalize());

		const reader = await TarPackageReader.fromBuffer(buffer);

		// Directory entries are not readable as files
		expect(reader.hasFile('projects/')).toBe(false);
		expect(reader.hasFile('projects/file.txt')).toBe(true);
	});

	describe('path safety', () => {
		it.each([
			['../etc/passwd', 'parent traversal'],
			['/etc/passwd', 'absolute path'],
			['foo\\bar.json', 'backslash'],
			['foo/./bar.json', 'single-dot segment'],
			['foo//bar.json', 'empty segment'],
			['foo\nbar.json', 'control character'],
			['nested/../escape.json', 'embedded parent traversal'],
		])('should reject "%s" (%s)', async (name, _label) => {
			const buffer = await buildRawTar([{ name, content: 'evil' }]);
			await expect(TarPackageReader.fromBuffer(buffer)).rejects.toThrow(PackageReadError);
		});

		it('should reject symlink entries', async () => {
			const buffer = await buildRawTar([
				{ name: 'link.json', header: { type: 'symlink', linkname: '../escape' } },
			]);
			await expect(TarPackageReader.fromBuffer(buffer)).rejects.toThrow(PackageReadError);
		});

		it('should reject hardlink entries', async () => {
			const buffer = await buildRawTar([
				{ name: 'hardlink.json', header: { type: 'link', linkname: 'manifest.json' } },
			]);
			await expect(TarPackageReader.fromBuffer(buffer)).rejects.toThrow(PackageReadError);
		});

		it('should accept ordinary nested paths', async () => {
			const buffer = await buildRawTar([
				{ name: 'manifest.json', content: '{}' },
				{
					name: 'projects/billing-x/folders/invoices/workflows/sync/workflow.json',
					content: '{"id":"wf"}',
				},
			]);
			const reader = await TarPackageReader.fromBuffer(buffer);
			expect(
				reader.hasFile('projects/billing-x/folders/invoices/workflows/sync/workflow.json'),
			).toBe(true);
		});
	});

	describe('resource bounds', () => {
		const tightLimits: TarLimits = {
			...DEFAULT_TAR_LIMITS,
			COMPRESSED_SIZE: 1024,
			MANIFEST_SIZE: 256,
			PER_ENTRY_SIZE: 256,
			TOTAL_ENTRIES: 3,
			TOTAL_UNCOMPRESSED: 512,
		};

		it('should reject buffer larger than COMPRESSED_SIZE', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('manifest.json', '{}');
			writer.writeFile('payload.json', 'x'.repeat(2000));
			const buffer = await streamToBuffer(writer.finalize());

			await expect(
				TarPackageReader.fromBuffer(buffer, { ...tightLimits, COMPRESSED_SIZE: 100 }),
			).rejects.toThrow(/compressed size limit/);
		});

		it('should reject entry larger than PER_ENTRY_SIZE', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('manifest.json', '{}');
			writer.writeFile('big.json', 'x'.repeat(500));
			const buffer = await streamToBuffer(writer.finalize());

			await expect(TarPackageReader.fromBuffer(buffer, tightLimits)).rejects.toThrow(
				/exceeds size limit/,
			);
		});

		it('should reject manifest larger than MANIFEST_SIZE', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('manifest.json', 'x'.repeat(400));
			const buffer = await streamToBuffer(writer.finalize());

			await expect(TarPackageReader.fromBuffer(buffer, tightLimits)).rejects.toThrow(
				/exceeds size limit/,
			);
		});

		it('should reject more entries than TOTAL_ENTRIES', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('a.json', 'a');
			writer.writeFile('b.json', 'b');
			writer.writeFile('c.json', 'c');
			writer.writeFile('d.json', 'd');
			const buffer = await streamToBuffer(writer.finalize());

			await expect(TarPackageReader.fromBuffer(buffer, tightLimits)).rejects.toThrow(
				/entry count limit/,
			);
		});

		it('should reject when total uncompressed bytes exceed TOTAL_UNCOMPRESSED', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('a.json', 'x'.repeat(200));
			writer.writeFile('b.json', 'x'.repeat(200));
			writer.writeFile('c.json', 'x'.repeat(200));
			const buffer = await streamToBuffer(writer.finalize());

			await expect(TarPackageReader.fromBuffer(buffer, tightLimits)).rejects.toThrow(
				/total uncompressed size limit/,
			);
		});

		it('should accept payloads within bounds', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('manifest.json', '{}');
			writer.writeFile('a.json', 'x'.repeat(50));
			const buffer = await streamToBuffer(writer.finalize());

			const reader = await TarPackageReader.fromBuffer(buffer, tightLimits);
			expect(reader.hasFile('a.json')).toBe(true);
		});
	});

	describe('readManifestOnly', () => {
		it('should read just the manifest from the head of the archive', async () => {
			const writer = new TarPackageWriter();
			writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
			writer.writeFile('big/payload.json', JSON.stringify({ pad: 'x'.repeat(10_000) }));
			const buffer = await streamToBuffer(writer.finalize());

			const manifest = await TarPackageReader.readManifestOnly(buffer);

			expect(manifest).toBe('{"packageFormatVersion":"1"}');
		});

		it('should return null when no manifest is at the head of the archive', async () => {
			// Build a tar where manifest is NOT first by sidestepping the writer.
			const tar = await import('tar-stream');
			const { createGzip } = await import('node:zlib');
			const pack = tar.pack();
			pack.entry({ name: 'something-else.txt' }, 'hello');
			pack.entry({ name: 'manifest.json' }, '{"packageFormatVersion":"1"}');
			pack.finalize();
			const chunks: Buffer[] = [];
			for await (const chunk of pack.pipe(createGzip())) {
				chunks.push(chunk as Buffer);
			}
			const buffer = Buffer.concat(chunks);

			const manifest = await TarPackageReader.readManifestOnly(buffer);

			expect(manifest).toBeNull();
		});
	});
});
