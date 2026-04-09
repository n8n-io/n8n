"use strict";
/**
 * File system abstraction (browser stub).
 *
 * This stub is used in browser/bundler builds via the package.json browser
 * field. Async operations are no-ops; sync operations are no-ops that return
 * safe defaults. Higher-level consumers (e.g. prompt_cache/fs.browser.ts) may
 * still throw on their own if browser use is unsupported at that layer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.path = void 0;
exports.mkdir = mkdir;
exports.writeFileAtomic = writeFileAtomic;
exports.readdir = readdir;
exports.stat = stat;
exports.unlink = unlink;
exports.existsSync = existsSync;
exports.mkdirSync = mkdirSync;
exports.writeFileSync = writeFileSync;
exports.renameSync = renameSync;
exports.unlinkSync = unlinkSync;
exports.readFileSync = readFileSync;
exports.path = {
    join: (...parts) => parts.join("/"),
    dirname: (p) => p.split("/").slice(0, -1).join("/"),
};
// ---------------------------------------------------------------------------
// Async operations – no-op in browser
// ---------------------------------------------------------------------------
async function mkdir(_dir) { }
async function writeFileAtomic(_filePath, _content) { }
async function readdir(_dir) {
    return [];
}
async function stat(_filePath) {
    return { size: 0 };
}
async function unlink(_filePath) { }
// ---------------------------------------------------------------------------
// Sync operations – no-op / safe defaults in browser
// ---------------------------------------------------------------------------
function existsSync(_p) {
    return false;
}
function mkdirSync(_dir) { }
function writeFileSync(_filePath, _content) { }
function renameSync(_oldPath, _newPath) { }
function unlinkSync(_filePath) { }
function readFileSync(_filePath) {
    return "";
}
