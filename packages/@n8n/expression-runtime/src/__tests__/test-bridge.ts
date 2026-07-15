import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { QuickJsBridge } from '../bridge/quickjs-bridge';

/**
 * Bridge factory for the dual-engine test projects (see vitest.config.ts).
 * The `quickjs-engine` project sets N8N_EXPRESSION_ENGINE=quickjs so every
 * suite using this factory runs against both bridges.
 */
export const isQuickJS = process.env.N8N_EXPRESSION_ENGINE === 'quickjs';
export const engineName = process.env.N8N_EXPRESSION_ENGINE || 'isolated-vm';

export function createBridge() {
	if (isQuickJS) {
		return new QuickJsBridge({ timeout: 5000 });
	}
	return new IsolatedVmBridge({ timeout: 5000 });
}
