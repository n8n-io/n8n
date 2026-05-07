import { TarPackageWriter } from '../tar-package-writer';
import { TarPackageReader } from '../tar-package-reader';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
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
