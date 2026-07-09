import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadOutputSchema, resolveOutputSchemaPath } from '../output-schema-resolver';

describe('output-schema-resolver', () => {
	let nodeDir: string;

	const writeSchema = (relativePath: string, content: unknown = { type: 'object' }) => {
		const filePath = path.join(nodeDir, '__schema__', relativePath);
		mkdirSync(path.dirname(filePath), { recursive: true });
		writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content));
		return filePath;
	};

	beforeEach(() => {
		nodeDir = mkdtempSync(path.join(tmpdir(), 'n8n-schema-'));
	});

	afterEach(() => {
		rmSync(nodeDir, { recursive: true, force: true });
	});

	describe('resolveOutputSchemaPath', () => {
		it('resolves an exact version/resource/operation match', () => {
			const expected = writeSchema('v1.0.0/playlist/get.json');

			expect(
				resolveOutputSchemaPath({ nodeDir, version: 1, resource: 'playlist', operation: 'get' }),
			).toBe(expected);
		});

		it('pads partial versions to x.y.z', () => {
			const expected = writeSchema('v2.3.0/message/post.json');

			expect(
				resolveOutputSchemaPath({ nodeDir, version: 2.3, resource: 'message', operation: 'post' }),
			).toBe(expected);
		});

		it('resolves operation-only layouts (no resource level)', () => {
			const expected = writeSchema('v1.0.0/getAll.json');

			expect(resolveOutputSchemaPath({ nodeDir, version: 1, operation: 'getAll' })).toBe(expected);
		});

		it('computes the path without touching the filesystem when versionFallback is off', () => {
			// No file written — the /schemas route probes existence itself via fsAccess.
			expect(
				resolveOutputSchemaPath({ nodeDir, version: 2, resource: 'playlist', operation: 'get' }),
			).toBe(path.join(nodeDir, '__schema__', 'v2.0.0', 'playlist', 'get.json'));
		});

		it('falls back to the newest available version when enabled', () => {
			writeSchema('v1.0.0/playlist/get.json');
			const expected = writeSchema('v2.10.0/playlist/get.json');
			writeSchema('v2.2.0/playlist/get.json');

			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 3,
					resource: 'playlist',
					operation: 'get',
					versionFallback: true,
				}),
			).toBe(expected);
		});

		it('prefers the exact version over newer ones when it exists', () => {
			const expected = writeSchema('v1.0.0/playlist/get.json');
			writeSchema('v2.0.0/playlist/get.json');

			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 1,
					resource: 'playlist',
					operation: 'get',
					versionFallback: true,
				}),
			).toBe(expected);
		});

		it('returns undefined when __schema__ does not exist', () => {
			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 1,
					resource: 'playlist',
					operation: 'get',
					versionFallback: true,
				}),
			).toBeUndefined();
		});

		it('rejects paths that escape the __schema__ directory', () => {
			writeSchema('v1.0.0/playlist/get.json');
			writeFileSync(path.join(nodeDir, 'secret.json'), '{}');

			expect(
				resolveOutputSchemaPath({ nodeDir, version: 1, resource: '../..', operation: 'secret' }),
			).toBeUndefined();
			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 1,
					resource: 'playlist',
					operation: '../../../secret',
				}),
			).toBeUndefined();
		});
	});

	describe('loadOutputSchema', () => {
		it('parses the resolved schema file', () => {
			writeSchema('v1.0.0/playlist/get.json', { type: 'object', properties: { id: {} } });

			expect(
				loadOutputSchema({ nodeDir, version: 1, resource: 'playlist', operation: 'get' }),
			).toEqual({ type: 'object', properties: { id: {} } });
		});

		it('returns undefined for malformed or non-object JSON', () => {
			writeSchema('v1.0.0/playlist/get.json', 'not-json{');
			writeSchema('v1.0.0/playlist/getAll.json', '[1,2]');

			expect(
				loadOutputSchema({ nodeDir, version: 1, resource: 'playlist', operation: 'get' }),
			).toBeUndefined();
			expect(
				loadOutputSchema({ nodeDir, version: 1, resource: 'playlist', operation: 'getAll' }),
			).toBeUndefined();
		});

		it('returns undefined when the file is missing', () => {
			expect(
				loadOutputSchema({ nodeDir, version: 1, resource: 'playlist', operation: 'get' }),
			).toBeUndefined();
		});
	});
});
