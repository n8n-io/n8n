/**
 * File system operations for prompt cache (Node.js version).
 *
 * This file is swapped with prompts_cache_fs.browser.ts for browser builds
 * via the package.json browser field.
 */
import * as fs from "node:fs";
import * as path from "node:path";
/**
 * Dump cache entries to a JSON file.
 */
export function dumpCache(filePath, entries) {
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
export function loadCache(filePath) {
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
