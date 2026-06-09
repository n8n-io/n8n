import type { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { TarPackageReader } from '../tar/tar-package-reader';
import { TarPackageWriter } from '../tar/tar-package-writer';

const TEST_MAX_UNCOMPRESSED_BYTES = 16 * 1024 * 1024;

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

async function buildPackage(
	writeFn: (writer: TarPackageWriter) => void | Promise<void>,
): Promise<Buffer> {
	const writer = new TarPackageWriter();
	await writeFn(writer);
	return await streamToBuffer(writer.finalize());
}

describe('TarPackageReader', () => {
	it('round-trips manifest and workflow files written by TarPackageWriter', async () => {
		const manifest = {
			packageFormatVersion: '1',
			exportedAt: '2026-05-18T12:00:00.000Z',
			sourceN8nVersion: '1.0.0',
			sourceId: 'instance-abc',
			workflows: [{ id: 'wf-abc', name: 'My workflow', target: 'workflows/my-workflow-abc' }],
		};
		const workflowJson = '{"id":"wf-abc","name":"My workflow"}';

		const buffer = await buildPackage((writer) => {
			writer.writeFile('manifest.json', JSON.stringify(manifest));
			writer.writeDirectory('workflows/my-workflow-abc');
			writer.writeFile('workflows/my-workflow-abc/workflow.json', workflowJson);
		});

		const reader = new TarPackageReader(buffer, TEST_MAX_UNCOMPRESSED_BYTES);

		await expect(reader.readManifest()).resolves.toEqual(manifest);
		await expect(reader.readFile('workflows/my-workflow-abc/workflow.json')).resolves.toEqual(
			Buffer.from(workflowJson),
		);
	});

	it('lists every file entry in the package', async () => {
		const buffer = await buildPackage((writer) => {
			writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
			writer.writeDirectory('workflows/a');
			writer.writeFile('workflows/a/workflow.json', '{}');
			writer.writeDirectory('workflows/b');
			writer.writeFile('workflows/b/workflow.json', '{}');
		});

		const reader = new TarPackageReader(buffer, TEST_MAX_UNCOMPRESSED_BYTES);

		await expect(reader.listEntries()).resolves.toEqual(
			expect.arrayContaining([
				'manifest.json',
				'workflows/a/workflow.json',
				'workflows/b/workflow.json',
			]),
		);
	});

	it('rejects a package missing manifest.json', async () => {
		const buffer = await buildPackage((writer) => {
			writer.writeDirectory('workflows/a');
			writer.writeFile('workflows/a/workflow.json', '{}');
		});

		const reader = new TarPackageReader(buffer, TEST_MAX_UNCOMPRESSED_BYTES);

		await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
		await expect(reader.readManifest()).rejects.toThrow(/manifest\.json/);
	});

	it('rejects packages exceeding the uncompressed size limit', async () => {
		const buffer = await buildPackage((writer) => {
			writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
			writer.writeFile('oversized.bin', 'x'.repeat(500));
		});

		const reader = new TarPackageReader(buffer, 100);

		await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
		await expect(reader.readManifest()).rejects.toThrow(/uncompressed size/i);
	});

	it('rejects invalid manifest JSON', async () => {
		const buffer = await buildPackage((writer) => {
			writer.writeFile('manifest.json', '{not-json');
		});

		const reader = new TarPackageReader(buffer, TEST_MAX_UNCOMPRESSED_BYTES);

		await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
		await expect(reader.readManifest()).rejects.toThrow(/not valid JSON/i);
	});
});
