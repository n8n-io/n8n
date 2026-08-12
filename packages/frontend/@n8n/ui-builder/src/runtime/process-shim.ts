// Must be the first import of the bundle entry.
//
// @n8n/tournament pulls in recast, which reaches a browserified `util` shim
// that touches bare `process` (throwDeprecation, env.NODE_DEBUG) while the
// module is initialising. editor-ui never trips over this because it only
// defines `process.env` in dev builds and serves from its own app shell; a page
// loading this bundle on its own has nothing to find.
//
// ES modules evaluate imports in source order, so importing this file before
// anything else guarantees the global exists by the time that shim runs.
const globals = globalThis as unknown as Record<string, unknown>;

globals.process ??= { env: {}, argv: [], platform: 'browser', version: '' };
globals.global ??= globalThis;

export {};
