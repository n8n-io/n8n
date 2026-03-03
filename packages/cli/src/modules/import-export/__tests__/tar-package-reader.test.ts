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
		writer.writeFile('manifest.json', '{"formatVersion":"1"}');
		writer.writeDirectory('projects/billing/');
		writer.writeFile('projects/billing/project.json', '{"id":"p1","name":"billing"}');
		const buffer = await streamToBuffer(writer.finalize());

		const reader = await TarPackageReader.fromBuffer(buffer);

		expect(reader.readFile('manifest.json')).toBe('{"formatVersion":"1"}');
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
});
