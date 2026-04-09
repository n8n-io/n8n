/**
 * File system abstraction (browser stub).
 *
 * This stub is used in browser/bundler builds via the package.json browser
 * field. Async operations are no-ops; sync operations are no-ops that return
 * safe defaults. Higher-level consumers (e.g. prompt_cache/fs.browser.ts) may
 * still throw on their own if browser use is unsupported at that layer.
 */
export const path = {
    join: (...parts) => parts.join("/"),
    dirname: (p) => p.split("/").slice(0, -1).join("/"),
};
// ---------------------------------------------------------------------------
// Async operations – no-op in browser
// ---------------------------------------------------------------------------
export async function mkdir(_dir) { }
export async function writeFileAtomic(_filePath, _content) { }
export async function readdir(_dir) {
    return [];
}
export async function stat(_filePath) {
    return { size: 0 };
}
export async function unlink(_filePath) { }
// ---------------------------------------------------------------------------
// Sync operations – no-op / safe defaults in browser
// ---------------------------------------------------------------------------
export function existsSync(_p) {
    return false;
}
export function mkdirSync(_dir) { }
export function writeFileSync(_filePath, _content) { }
export function renameSync(_oldPath, _newPath) { }
export function unlinkSync(_filePath) { }
export function readFileSync(_filePath) {
    return "";
}
