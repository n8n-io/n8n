import { hasInjectionContext, inject } from 'vue';

import {
	getRegisteredTelemetry,
	TelemetryKey,
	type Telemetry,
} from './registries/telemetryRegistry';

// The telemetry *contract* and the *registration* surface deliberately live in
// `./registries/telemetryRegistry`: this module is `vi.mock`ed in ~100 test
// files, and a mock factory replaces the whole module. While `setTelemetry`
// lived here, any partial factory (the common `{ useTelemetry: () => ... }`
// shape) also starved the telemetry plugin's own bootstrap import of it.
// Separate modules make that unreachable — the plugin never imports this one.
export type {
	Telemetry,
	TelemetryIdentifyOptions,
	TelemetryNodeParameterChange,
} from './registries/telemetryRegistry';

/**
 * Null-object telemetry used when no instance has been registered (e.g. in
 * tests that never install the plugin). Telemetry is best-effort and must never
 * throw or break the UI, so every method is a no-op. Any registered instance
 * (via `setTelemetry` or `TelemetryKey`) takes precedence.
 *
 * A plain object literal (not a `Proxy`) so method identity is stable, spies
 * attach, `'track' in noopTelemetry` holds, and there is no accidental `then`
 * that would make `await useTelemetry()` hang.
 */
const noopTelemetry: Telemetry = {
	init() {},
	identify() {},
	track() {},
	page() {},
	reset() {},
	flushPageEvents() {},
	trackAskAI() {},
	trackAiTransform() {},
	trackNodeParametersValuesChange() {},
};

let warnedAboutMissingTelemetry = false;

/**
 * Returns the active telemetry instance. Resolution order: a component-provided
 * instance (via `TelemetryKey`), then the app-registered singleton (via
 * `setTelemetry`), then a no-op fallback.
 */
export function useTelemetry(): Telemetry {
	const injected = hasInjectionContext() ? inject(TelemetryKey, null) : null;
	const instance = injected ?? getRegisteredTelemetry();
	if (instance) return instance;

	// Falling back to the no-op means the plugin has not registered an instance
	// yet. That should never happen in the app (bootstrap registers before any
	// consumer runs); warn once in dev so an ordering regression stays visible.
	if (import.meta.env.DEV && !warnedAboutMissingTelemetry) {
		warnedAboutMissingTelemetry = true;
		console.warn(
			'[useTelemetry] No telemetry instance registered; using a no-op. Ensure the telemetry plugin is installed at bootstrap.',
		);
	}
	return noopTelemetry;
}
