"use strict";
/**
 * File system operations for prompt cache (Node.js version).
 *
 * This file is swapped with prompts_cache_fs.browser.ts for browser builds
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
exports.dumpCache = dumpCache;
exports.loadCache = loadCache;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
/**
 * Dump cache entries to a JSON file.
 */
function dumpCache(filePath, entries) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const data = { entries };
    // Atomic write: write to temp file then rename
    const tempPath = `${filePath}.tmp`;
    try {
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        fs.renameSync(tempPath, filePath);
    }
    catch (e) {
        // Clean up temp file on failure
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        throw e;
    }
}
/**
 * Load cache entries from a JSON file.
 *
 * @returns The entries object, or null if file doesn't exist or is invalid.
 */
function loadCache(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        return data.entries ?? null;
    }
    catch {
        return null;
    }
}
