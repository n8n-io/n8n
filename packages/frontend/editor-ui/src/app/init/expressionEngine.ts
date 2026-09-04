import type { N8nEnvFeatFlags } from '@n8n/api-types';
import { Expression } from 'n8n-workflow';

/**
 * Set up the editor's expression engine from the backend settings payload.
 *
 * The engine is read at runtime rather than baked in at build time, so the same
 * image can be switched with an environment variable. It is independent of the
 * backend's own `N8N_EXPRESSION_ENGINE`: the editor can evaluate with quickjs
 * while the backend evaluates with vm. `vm` is not an option here — isolated-vm
 * is a native module. Anything other than `quickjs` leaves the legacy evaluator
 * in place.
 *
 * A failure to load the engine leaves `Expression` without an evaluator, which
 * falls back to the legacy path rather than breaking the editor.
 */
export async function initializeExpressionEngine(
	envFeatureFlags: N8nEnvFeatFlags | undefined,
): Promise<void> {
	if (envFeatureFlags?.N8N_ENV_FEAT_EXPRESSION_ENGINE !== 'quickjs') return;

	// The bridge needs the runtime bundle as a string: the browser has no
	// node:fs to read it from disk. Imported here rather than at module scope so
	// the ~470KB asset is only fetched when the engine is enabled. The
	// runtime-bundle.iife.js sub-path is aliased in vite.config.mts to the built
	// file in @n8n/expression-runtime.
	const { default: runtimeBundle } = await import(
		'@n8n/expression-runtime/runtime-bundle.iife.js?raw'
	);

	await Expression.initExpressionEngine({
		engine: 'quickjs',
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
		poolSize: 1,
		maxCodeCacheSize: 1024,
		runtimeBundle,
	});
}
