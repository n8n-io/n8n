import express from 'express';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';

import { isImmutableAsset, setImmutableAssetHeaders } from '../static-asset-cache';

describe('isImmutableAsset', () => {
	it.each([
		['/dist/assets/emscripten-module-uFzwHH0Y.wasm', true],
		['/dist/assets/wa-sqlite-DDTbX34h.wasm', true],
		['/dist/assets/name-a_b-c1d2.wasm', true],
		['/dist/tree-sitter-bash.wasm', false],
		['/dist/emscripten-module-uFzwHH0Y.wasm', false],
		['/dist/assets/wa-sqlite.wasm', false],
		['/dist/assets/index-uFzwHH0Y.js', false],
		['/dist/assets/index-uFzwHH0Y.css', false],
	])('returns the expected value for %s', (filePath, expected) => {
		expect(isImmutableAsset(filePath)).toBe(expected);
	});
});

describe('setImmutableAssetHeaders with express.static', () => {
	let root: string;
	let app: express.Express;

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'n8n-static-asset-cache-'));
		await mkdir(join(root, 'assets'));
		await writeFile(join(root, 'assets', 'emscripten-module-uFzwHH0Y.wasm'), 'wasm');
		await writeFile(join(root, 'assets', 'index-uFzwHH0Y.js'), 'js');
		await writeFile(join(root, 'tree-sitter.wasm'), 'wasm');

		app = express();
		app.use(express.static(root, { maxAge: 86_400_000, setHeaders: setImmutableAssetHeaders }));
	});

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it('serves a hashed wasm asset with a long-lived immutable cache', async () => {
		const response = await request(app).get('/assets/emscripten-module-uFzwHH0Y.wasm');

		expect(response.status).toBe(200);
		expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
	});

	it.each(['/assets/index-uFzwHH0Y.js', '/tree-sitter.wasm'])(
		'keeps the default cache for %s',
		async (url) => {
			const response = await request(app).get(url);

			expect(response.status).toBe(200);
			expect(response.headers['cache-control']).toBe('public, max-age=86400');
		},
	);
});
