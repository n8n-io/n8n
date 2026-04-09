/**
 * File system abstraction (browser stub).
 *
 * This stub is used in browser/bundler builds via the package.json browser
 * field. Async operations are no-ops; sync operations are no-ops that return
 * safe defaults. Higher-level consumers (e.g. prompt_cache/fs.browser.ts) may
 * still throw on their own if browser use is unsupported at that layer.
 */
export declare const path: {
    join: (...parts: string[]) => string;
    dirname: (p: string) => string;
};
export declare function mkdir(_dir: string): Promise<void>;
export declare function writeFileAtomic(_filePath: string, _content: string): Promise<void>;
export declare function readdir(_dir: string): Promise<string[]>;
export declare function stat(_filePath: string): Promise<{
    size: number;
}>;
export declare function unlink(_filePath: string): Promise<void>;
export declare function existsSync(_p: string): boolean;
export declare function mkdirSync(_dir: string): void;
export declare function writeFileSync(_filePath: string, _content: string): void;
export declare function renameSync(_oldPath: string, _newPath: string): void;
export declare function unlinkSync(_filePath: string): void;
export declare function readFileSync(_filePath: string): string;
