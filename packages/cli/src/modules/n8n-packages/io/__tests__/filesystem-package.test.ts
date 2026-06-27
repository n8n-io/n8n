// These tests exercise real filesystem reads/writes; the CLI test setup
// auto-mocks node:fs, so opt back into the real module here.
jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { FilesystemPackageReader } from '../fs/filesystem-package-reader';
import { FilesystemPackageWriter } from '../fs/filesystem-package-writer';

describe('FilesystemPackageWriter + FilesystemPackageReader', () => {
	let rootDir: string;

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-fs-pkg-'));
	});

	afterEach(() => {
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	describe('round-trip', () => {
		it('writes an exploded tree that the reader reads back unchanged', async () => {
			const manifest = {
				packageFormatVersion: '1',
				exportedAt: '2026-05-18T12:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'instance-abc',
				workflows: [{ id: 'wf-abc', name: 'My workflow', target: 'workflows/my-workflow-abc' }],
			};
			const workflowJson = '{"id":"wf-abc","name":"My workflow"}';
			const credentialJson = '{"id":"cred-1","type":"githubApi"}';

			const writer = new FilesystemPackageWriter(rootDir);
			writer.writeFile('manifest.json', JSON.stringify(manifest));
			writer.writeDirectory('workflows/my-workflow-abc');
			writer.writeFile('workflows/my-workflow-abc/workflow.json', workflowJson);
			writer.writeDirectory('credentials/github');
			writer.writeFile('credentials/github/credential.json', credentialJson);
			writer.finalize();

			// The exploded layout exists on disk.
			expect(fs.existsSync(path.join(rootDir, 'manifest.json'))).toBe(true);
			expect(fs.existsSync(path.join(rootDir, 'workflows/my-workflow-abc/workflow.json'))).toBe(
				true,
			);

			const reader = new FilesystemPackageReader(rootDir);

			await expect(reader.readManifest()).resolves.toEqual(manifest);
			await expect(reader.readFile('workflows/my-workflow-abc/workflow.json')).resolves.toEqual(
				Buffer.from(workflowJson),
			);
			await expect(reader.readFile('credentials/github/credential.json')).resolves.toEqual(
				Buffer.from(credentialJson),
			);
			await expect(reader.listEntries()).resolves.toEqual(
				expect.arrayContaining([
					'manifest.json',
					'workflows/my-workflow-abc/workflow.json',
					'credentials/github/credential.json',
				]),
			);
		});

		it('normalises a leading "./" on written paths', async () => {
			const writer = new FilesystemPackageWriter(rootDir);
			writer.writeFile('./manifest.json', '{"packageFormatVersion":"1"}');

			expect(fs.existsSync(path.join(rootDir, 'manifest.json'))).toBe(true);
		});
	});

	describe('reader manifest gating', () => {
		it('rejects a directory missing manifest.json', async () => {
			const reader = new FilesystemPackageReader(rootDir);

			await expect(reader.readManifest()).rejects.toThrow(BadRequestError);
			await expect(reader.readManifest()).rejects.toThrow(/manifest\.json/i);
		});

		it('rejects invalid manifest JSON', async () => {
			fs.writeFileSync(path.join(rootDir, 'manifest.json'), '{not-json');
			const reader = new FilesystemPackageReader(rootDir);

			await expect(reader.readManifest()).rejects.toThrow(/not valid JSON/i);
		});
	});

	describe('path safety', () => {
		it('writer rejects paths that escape the root', () => {
			const writer = new FilesystemPackageWriter(rootDir);

			expect(() => writer.writeFile('../escape.json', 'pwned')).toThrow(/escape the package root/i);
			// Nothing was written outside the root.
			expect(fs.existsSync(path.join(rootDir, '..', 'escape.json'))).toBe(false);
		});

		it('writer rejects absolute paths', () => {
			const writer = new FilesystemPackageWriter(rootDir);

			expect(() => writer.writeFile('/etc/passwd', 'pwned')).toThrow(/must be relative/i);
		});

		it('writer rejects disallowed characters', () => {
			const writer = new FilesystemPackageWriter(rootDir);

			expect(() => writer.writeFile('workflows/with spaces/workflow.json', '{}')).toThrow(
				/disallowed characters/i,
			);
		});

		it('reader rejects reading a path that escapes the root', async () => {
			const reader = new FilesystemPackageReader(rootDir);

			await expect(reader.readFile('../escape.json')).rejects.toThrow(/escape the package root/i);
		});
	});
});
