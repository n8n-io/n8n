import { readFile } from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';
import { gzipSync } from 'zlib';

const MAX_BYTES = 250_000;

const runtimeBundlePath = path.resolve(__dirname, '../../dist/bundle/runtime.iife.js');
const quickJsWasmPath = createRequire(__filename).resolve(
	'@jitl/quickjs-wasmfile-release-sync/wasm',
);

// The editor downloads both files before it can evaluate an expression with QuickJS.
describe('QuickJS download size', () => {
	it('keeps the runtime bundle under 250 KB', async () => {
		const bundle = await readFile(runtimeBundlePath);

		expect(bundle.byteLength).toBeLessThan(MAX_BYTES);
	});

	// The raw WASM is about twice this size. The server sends it compressed.
	it('keeps the gzipped QuickJS WASM under 250 KB', async () => {
		const wasm = await readFile(quickJsWasmPath);

		expect(gzipSync(wasm).byteLength).toBeLessThan(MAX_BYTES);
	});
});
