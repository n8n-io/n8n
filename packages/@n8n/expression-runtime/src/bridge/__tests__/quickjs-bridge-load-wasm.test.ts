import { describe, expect, it, vi } from 'vitest';

import { QuickJsBridge } from '../quickjs-bridge';

// A file of its own, so the module-level WASM cache starts empty.
const { newQuickJSWASMModuleFromVariant } = vi.hoisted(() => ({
	newQuickJSWASMModuleFromVariant: vi.fn(),
}));

vi.mock('quickjs-emscripten-core', async (importOriginal) => {
	const original = await importOriginal<typeof import('quickjs-emscripten-core')>();
	newQuickJSWASMModuleFromVariant.mockImplementation(original.newQuickJSWASMModuleFromVariant);
	return { ...original, newQuickJSWASMModuleFromVariant };
});

describe('QuickJsBridge.loadWasm', () => {
	it('should load the WASM module that later bridges reuse', async () => {
		await QuickJsBridge.loadWasm();
		expect(newQuickJSWASMModuleFromVariant).toHaveBeenCalledTimes(1);

		const bridge = new QuickJsBridge({ timeout: 5000 });
		try {
			await bridge.initialize();
			expect(newQuickJSWASMModuleFromVariant).toHaveBeenCalledTimes(1);
		} finally {
			await bridge.dispose();
		}
	});
});
