import { describe, expect, it, vi } from 'vitest';

import { QuickJsBridge } from '../quickjs-bridge';

// A file of its own, so the module-level WASM cache starts empty.
const { getQuickJS } = vi.hoisted(() => ({ getQuickJS: vi.fn() }));

vi.mock('quickjs-emscripten', async (importOriginal) => {
	const original = await importOriginal<typeof import('quickjs-emscripten')>();
	getQuickJS.mockImplementation(original.getQuickJS);
	return { ...original, getQuickJS };
});

describe('QuickJsBridge.loadWasm', () => {
	it('should load the WASM module that later bridges reuse', async () => {
		await QuickJsBridge.loadWasm();
		expect(getQuickJS).toHaveBeenCalledTimes(1);
		const loaded = await getQuickJS.mock.results[0].value;

		const bridge = new QuickJsBridge({ timeout: 5000 });
		try {
			await bridge.initialize();
			expect(await getQuickJS.mock.results[1].value).toBe(loaded);
		} finally {
			await bridge.dispose();
		}
	});
});
