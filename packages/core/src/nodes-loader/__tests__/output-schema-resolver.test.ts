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

		it('falls back to the newest older version when enabled', () => {
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

		it('prefers a same-major dir over a newer major', () => {
			// The Notion shape: v2 node versions with dirs v1.0.0/v2.2.0/v3.0.0 —
			// v3 schemas describe the next API generation and must not win.
			writeSchema('v1.0.0/database/get.json');
			const expected = writeSchema('v2.2.0/database/get.json');
			writeSchema('v3.0.0/database/get.json');

			for (const version of [2, 2.1]) {
				expect(
					resolveOutputSchemaPath({
						nodeDir,
						version,
						resource: 'database',
						operation: 'get',
						versionFallback: true,
					}),
				).toBe(expected);
			}
		});

		it('prefers the nearest lower same-major dir over a higher one', () => {
			writeSchema('v2.4.0/playlist/get.json');
			const expected = writeSchema('v2.2.0/playlist/get.json');

			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 2.3,
					resource: 'playlist',
					operation: 'get',
					versionFallback: true,
				}),
			).toBe(expected);
		});

		it('falls forward to the nearest newer major only as a last resort', () => {
			writeSchema('v4.0.0/playlist/get.json');
			const expected = writeSchema('v3.0.0/playlist/get.json');

			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 2,
					resource: 'playlist',
					operation: 'get',
					versionFallback: true,
				}),
			).toBe(expected);
		});

		it('ignores directories that are not plain vX.Y.Z versions', () => {
			mkdirSync(path.join(nodeDir, '__schema__', 'v1.0.0-beta', 'playlist'), { recursive: true });
			writeFileSync(path.join(nodeDir, '__schema__', 'v1.0.0-beta', 'playlist', 'get.json'), '{}');
			mkdirSync(path.join(nodeDir, '__schema__', 'vendor'), { recursive: true });
			const expected = writeSchema('v1.0.0/playlist/get.json');

			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 2,
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

		it('resolves the version-level output.json layout for refs without resource/operation', () => {
			const expected = writeSchema('v2.0.0/output.json');

			expect(resolveOutputSchemaPath({ nodeDir, version: 2, versionFallback: true })).toBe(
				expected,
			);
			// Discriminated refs never fall back to output.json.
			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 2,
					resource: 'playlist',
					operation: 'get',
					versionFallback: true,
				}),
			).toBeUndefined();
			// Without versionFallback the computation stays pure (no output.json probe).
			expect(resolveOutputSchemaPath({ nodeDir, version: 2 })).toBe(
				path.join(nodeDir, '__schema__', 'v2.0.0.json'),
			);
		});

		it('prefers the variant layout and falls through to plain output.json', () => {
			const plain = writeSchema('v2.0.0/output.json');
			const variant = writeSchema('v2.0.0/output.with-parser.json');

			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 2,
					versionFallback: true,
					variant: 'with-parser',
				}),
			).toBe(variant);
			// Without the variant option the plain layout still wins.
			expect(resolveOutputSchemaPath({ nodeDir, version: 2, versionFallback: true })).toBe(plain);
			// An unknown variant falls through to output.json instead of failing.
			expect(
				resolveOutputSchemaPath({ nodeDir, version: 2, versionFallback: true, variant: 'other' }),
			).toBe(plain);
			// A variant path may not escape the __schema__ directory.
			writeFileSync(path.join(nodeDir, 'output.leak.json'), '{}');
			expect(
				resolveOutputSchemaPath({
					nodeDir,
					version: 2,
					versionFallback: true,
					variant: 'leak/../../../output.leak',
				}),
			).toBe(plain);
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
