/**
 * Browser shim for `node:fs`.
 *
 * `QuickJsBridge` imports `readFileSync` to read the runtime bundle from disk.
 * The browser never takes that path — `initialize()` seeds the module cache from
 * the `runtimeBundle` option first — but the import is static, so it is
 * evaluated whenever the module is.
 *
 * Without this shim the dev server externalizes `node:fs` behind a proxy that
 * throws on any property access, so evaluating the module breaks the editor
 * boot. Exporting a function that throws only when called keeps the import
 * harmless and still fails loudly if the Node path is ever reached in a browser.
 */
export function readFileSync(_path: string, _encoding?: string): string {
	throw new Error('node:fs is not available in browser environments');
}
