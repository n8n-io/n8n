/**
 * File system abstraction (Node.js version).
 *
 * This file is swapped with fs.browser.ts for browser builds
 * via the package.json browser field.
 */
import * as nodePath from "node:path";
export declare const path: nodePath.PlatformPath;
export declare function mkdir(dir: string): Promise<void>;
export declare function writeFileAtomic(filePath: string, content: string): Promise<void>;
export declare function readdir(dir: string): Promise<string[]>;
export declare function stat(filePath: string): Promise<{
    size: number;
}>;
export declare function unlink(filePath: string): Promise<void>;
export declare function existsSync(p: string): boolean;
export declare function mkdirSync(dir: string): void;
export declare function writeFileSync(filePath: string, content: string): void;
export declare function renameSync(oldPath: string, newPath: string): void;
export declare function unlinkSync(filePath: string): void;
export declare function readFileSync(filePath: string): string;
