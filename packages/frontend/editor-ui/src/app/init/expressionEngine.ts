import type { FrontendSettings } from '@n8n/api-types';
import { Expression } from 'n8n-workflow';

/**
 * Set up the editor's expression engine from the backend settings payload.
 *
 * The engine is read at runtime rather than baked in at build time, so the same
 * image serves either engine. It is independent of the backend's own
 * `N8N_EXPRESSION_ENGINE`: the editor can evaluate with quickjs while the
 * backend evaluates with vm. `vm` is not an option here — isolated-vm is a
 * native module — so anything other than `quickjs` leaves the legacy evaluator
 * in place.
 *
 * A failure to load the engine leaves `Expression` without an evaluator, which
 * falls back to the legacy path rather than breaking the editor. Under a policy
 * that denies `'wasm-unsafe-eval'` the WASM module cannot instantiate, and this
 * is the path that keeps the editor usable.
 */
export async function initializeExpressionEngine(
	engine: FrontendSettings['expressionEngine'] | undefined,
): Promise<void> {
	if (engine !== 'quickjs') return;

	// Called once when the app boots and again from the login hook, because an
	// unauthenticated boot cannot see the engine yet. Loading the bundle twice
	// would be wasted work.
	if (Expression.getActiveImplementation() === 'quickjs') return;

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
		// The editor's evaluate() is synchronous, so it needs a caller that already
		// holds a scope. One shared scope covers every Expression the editor builds.
		sharedCaller: true,
		// Open that scope without building the runtime yet. The first expression
		// that reaches the engine cold-starts it from inside the synchronous path,
		// so enabling the engine costs nothing until something is evaluated.
		lazyAcquire: true,
	});
}
