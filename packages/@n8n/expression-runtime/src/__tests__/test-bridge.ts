import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { QuickJsBridge } from '../bridge/quickjs-bridge';
import type { BridgeConfig, RuntimeBridge } from '../types';

/**
 * Bridge factory for the dual-engine test projects (see vitest.config.ts).
 * The `quickjs-engine` project sets N8N_EXPRESSION_ENGINE=quickjs so every
 * suite using this factory runs against both bridges.
 */
const engine = process.env.N8N_EXPRESSION_ENGINE;
if (!engine || engine === 'legacy') {
	throw new Error(
		`test-bridge requires an isolated engine, got '${engine ?? ''}' — add this test file to ENGINE_AWARE in vitest.config.ts`,
	);
}

export const isQuickJS = engine === 'quickjs';
export const engineName = engine;

/** Build the active engine's bridge with the given config. */
export function newBridge(config: BridgeConfig = {}): RuntimeBridge {
	return isQuickJS ? new QuickJsBridge(config) : new IsolatedVmBridge(config);
}

export function createBridge() {
	return newBridge({ timeout: 5000 });
}
