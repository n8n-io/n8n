import { describe, expect, it, vi } from 'vitest';

import { QuickJsBridge } from '../quickjs-bridge';

// A file of its own, so the module-level WASM cache starts empty.
const { newQuickJSWASMModule } = vi.hoisted(() => ({ newQuickJSWASMModule: vi.fn() }));

vi.mock('quickjs-emscripten', async (importOriginal) => {
	const original = await importOriginal<typeof import('quickjs-emscripten')>();
	newQuickJSWASMModule.mockImplementation(original.newQuickJSWASMModule);
	return { ...original, newQuickJSWASMModule };
});

describe('QuickJsBridge.loadWasm', () => {
	it('should load the WASM module that later bridges reuse', async () => {
		await QuickJsBridge.loadWasm();
		expect(newQuickJSWASMModule).toHaveBeenCalledTimes(1);

		const bridge = new QuickJsBridge({ timeout: 5000 });
		try {
			await bridge.initialize();
			expect(newQuickJSWASMModule).toHaveBeenCalledTimes(1);
		} finally {
			await bridge.dispose();
		}
	});
});
