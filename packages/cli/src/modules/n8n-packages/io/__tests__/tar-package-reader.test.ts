import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { streamToBuffer } from '../../__tests__/utils/tar-support';
import { TarPackageReader, type TarReaderLimits } from '../tar/tar-package-reader';
import { TarPackageWriter } from '../tar/tar-package-writer';
import { buildRawTar } from './utils/raw-tar-builder';

const MiB = 1024 * 1024;

const DEFAULT_LIMITS: TarReaderLimits = {
	maxUncompressedBytes: 16 * MiB,
	maxEntryBytes: 5 * MiB,
	maxEntries: 5_000,
	maxPathLength: 1024,
};

async function buildPackage(
	writeFn: (writer: TarPackageWriter) => void | Promise<void>,
): Promise<Buffer> {
	const writer = new TarPackageWriter();
	await writeFn(writer);
	return await streamToBuffer(writer.finalize());
}

describe('TarPackageReader', () => {
	describe('happy path', () => {
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

			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

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

			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.listEntries()).resolves.toEqual(
				expect.arrayContaining([
					'manifest.json',
					'workflows/a/workflow.json',
					'workflows/b/workflow.json',
				]),
			);
		});
	});

	describe('manifest gating', () => {
		it('rejects a package missing manifest.json', async () => {
			const buffer = buildRawTar([{ path: 'workflows/a/workflow.json', content: '{}' }]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/manifest\.json/i);
		});

		it('rejects invalid manifest JSON', async () => {
			const buffer = await buildPackage((writer) => {
				writer.writeFile('manifest.json', '{not-json');
			});
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/not valid JSON/i);
		});

		it('rejects packages where manifest.json is not the first file entry', async () => {
			const buffer = buildRawTar([
				{ path: 'workflows/a/workflow.json', content: '{}' },
				{ path: 'manifest.json', content: '{"packageFormatVersion":"1"}' },
			]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/must begin with manifest\.json/i);
		});
	});

	describe('path safety', () => {
		it('rejects absolute paths', async () => {
			const buffer = buildRawTar([
				{ path: 'manifest.json', content: '{}' },
				{ path: '/etc/passwd', content: 'pwned' },
			]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(/must be relative/i);
		});

		it('rejects paths that escape the package root after normalization', async () => {
			const buffer = buildRawTar([
				{ path: 'manifest.json', content: '{}' },
				{ path: '../escape.json', content: 'pwned' },
			]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(/escape the package root/i);
		});

		it('rejects paths containing disallowed characters', async () => {
			const buffer = buildRawTar([
				{ path: 'manifest.json', content: '{}' },
				{ path: 'workflows/with spaces/workflow.json', content: '{}' },
			]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(/disallowed characters/i);
		});

		it('rejects paths longer than maxPathLength', async () => {
			const longSegment = 'a'.repeat(50);
			const buffer = buildRawTar([
				{ path: 'manifest.json', content: '{}' },
				{ path: longSegment, content: '{}' },
			]);
			const reader = new TarPackageReader(buffer, { ...DEFAULT_LIMITS, maxPathLength: 20 });

			await expect(reader.readManifest()).rejects.toThrow(/maximum allowed length/i);
		});

		it('rejects duplicate paths after normalization', async () => {
			const buffer = buildRawTar([
				{ path: 'manifest.json', content: '{}' },
				{ path: 'workflows/a/workflow.json', content: '{}' },
				{ path: './workflows/a/workflow.json', content: 'override' },
			]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(/duplicate entry/i);
		});
	});

	describe('entry type safety', () => {
		it.each([['SymbolicLink'], ['Link']] as const)(
			'rejects %s entries with a linkpath',
			async (type) => {
				const buffer = buildRawTar([
					{ path: 'manifest.json', content: '{}' },
					{ path: 'malicious', type, linkpath: '/etc/passwd' },
				]);
				const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

				await expect(reader.readManifest()).rejects.toThrow(/disallowed entry type/i);
			},
		);

		it.each([['CharacterDevice'], ['BlockDevice'], ['FIFO']] as const)(
			'rejects %s entries',
			async (type) => {
				const buffer = buildRawTar([
					{ path: 'manifest.json', content: '{}' },
					{ path: 'malicious', type },
				]);
				const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

				await expect(reader.readManifest()).rejects.toThrow(/disallowed entry type/i);
			},
		);

		// PAX (ExtendedHeader / GlobalExtendedHeader) entries are consumed
		// internally by node-tar and applied transparently to the next entry,
		// so they never reach our entry-type check. The defense is that the
		// PAX-overridden path goes through our path validation — proven below.
		it('still validates the path when a PAX header overrides it', async () => {
			// PAX record format: "<len> <key>=<value>\n" where <len> is the
			// total byte length of the record. "18 path=../escape\n" is 18 bytes.
			const paxRecord = '18 path=../escape\n';
			const buffer = buildRawTar([
				{ path: 'manifest.json', content: '{}' },
				{ path: 'PaxHeader/escape', type: 'ExtendedHeader', content: paxRecord },
				// Without the PAX override this path would pass our allowlist;
				// with the override it normalises to "../escape" and is rejected.
				{ path: 'innocent', content: 'data' },
			]);
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(/escape the package root/i);
		});
	});

	describe('size and count limits', () => {
		it('rejects packages whose total uncompressed size exceeds maxUncompressedBytes', async () => {
			const buffer = await buildPackage((writer) => {
				writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
				writer.writeFile('oversized.bin', 'x'.repeat(500));
			});

			const reader = new TarPackageReader(buffer, {
				...DEFAULT_LIMITS,
				maxUncompressedBytes: 100,
				maxEntryBytes: 1_000,
			});

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/maximum allowed uncompressed size/i);
		});

		it('rejects single entries larger than maxEntryBytes', async () => {
			const buffer = await buildPackage((writer) => {
				writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
				writer.writeFile('oversized.bin', 'x'.repeat(500));
			});

			const reader = new TarPackageReader(buffer, {
				...DEFAULT_LIMITS,
				maxEntryBytes: 100,
			});

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/per entry/i);
		});

		it('rejects packages with more than maxEntries entries', async () => {
			const buffer = await buildPackage((writer) => {
				writer.writeFile('manifest.json', '{"packageFormatVersion":"1"}');
				for (let i = 0; i < 10; i++) {
					writer.writeFile(`workflows/wf-${i}/workflow.json`, '{}');
				}
			});

			const reader = new TarPackageReader(buffer, {
				...DEFAULT_LIMITS,
				maxEntries: 3,
			});

			await expect(reader.readManifest()).rejects.toThrow(/too many entries/i);
		});
	});

	describe('archive integrity', () => {
		it('rejects an archive whose header checksum does not match', async () => {
			const buffer = buildRawTar([{ path: 'manifest.json', content: '{}' }]);
			// Corrupt a byte in the first header block, outside the checksum
			// field (offset 148-155), so the stored checksum no longer matches
			// the recomputed one. In strict mode node-tar surfaces this as an
			// error; without it the entry would be silently skipped and the
			// reader would instead report a missing manifest.
			buffer[110] ^= 0xff;
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/Failed to read package archive/i);
		});
	});

	describe('failure messages', () => {
		it('returns a generic BadRequestError on malformed archive bytes', async () => {
			const buffer = Buffer.from('this is not a tar at all, just random bytes');
			const reader = new TarPackageReader(buffer, DEFAULT_LIMITS);

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(
				/Failed to read package archive|missing manifest/i,
			);
		});
	});
});
