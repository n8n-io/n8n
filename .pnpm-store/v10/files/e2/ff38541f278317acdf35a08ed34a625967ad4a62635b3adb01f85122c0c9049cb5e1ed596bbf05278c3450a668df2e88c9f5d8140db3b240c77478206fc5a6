"use strict";
/**
 * File system abstraction (Node.js version).
 *
 * This file is swapped with fs.browser.ts for browser builds
 * via the package.json browser field.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const nodeFs = __importStar(require("node:fs"));
const nodeFsPromises = __importStar(require("node:fs/promises"));
const nodePath = __importStar(require("node:path"));
exports.path = nodePath;
// ---------------------------------------------------------------------------
// Async operations (used by trace dump fallback)
// ---------------------------------------------------------------------------
async function mkdir(dir) {
    await nodeFsPromises.mkdir(dir, { recursive: true });
}
async function writeFileAtomic(filePath, content) {
    const tempPath = `${filePath}.tmp`;
    await nodeFsPromises.writeFile(tempPath, content, {
        encoding: "utf8",
        mode: 0o600,
    });
    await nodeFsPromises.rename(tempPath, filePath);
}
async function readdir(dir) {
    return nodeFsPromises.readdir(dir);
}
async function stat(filePath) {
    return nodeFsPromises.stat(filePath);
}
async function unlink(filePath) {
    await nodeFsPromises.unlink(filePath);
}
// ---------------------------------------------------------------------------
// Sync operations (used by prompt cache)
// ---------------------------------------------------------------------------
function existsSync(p) {
    return nodeFs.existsSync(p);
}
function mkdirSync(dir) {
    nodeFs.mkdirSync(dir, { recursive: true });
}
function writeFileSync(filePath, content) {
    nodeFs.writeFileSync(filePath, content);
}
function renameSync(oldPath, newPath) {
    nodeFs.renameSync(oldPath, newPath);
}
function unlinkSync(filePath) {
    nodeFs.unlinkSync(filePath);
}
function readFileSync(filePath) {
    return nodeFs.readFileSync(filePath, "utf-8");
}
