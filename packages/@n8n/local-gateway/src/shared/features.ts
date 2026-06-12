/**
 * Build-variant feature flags, injected at build time via Vite `define`.
 *
 * `__LOCAL_N8N_ENABLED__` is replaced with a literal `true`/`false` in the
 * renderer, main, and preload bundles (see `vite.config.mts`). Set by the
 * `BUNDLE_LOCAL_N8N` env var on the `:local` scripts. The `typeof` guard keeps
 * it safe under Vitest, where `define` doesn't run and the global is absent.
 */
declare const __LOCAL_N8N_ENABLED__: boolean | undefined;

/** Whether this build can spawn an embedded local n8n instance ("local mode"). */
export const LOCAL_N8N_ENABLED: boolean =
	typeof __LOCAL_N8N_ENABLED__ !== 'undefined' ? __LOCAL_N8N_ENABLED__ : false;
