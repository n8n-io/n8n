import type { Plugin } from './types.js';
export declare function getPluginRoot(path: string): string;
export declare function loadPlugin(path: string): Promise<Plugin>;
/**
 * Get the plugin name by reading the `name` field in the package.json file.
 */
export declare function getPluginName(path: string): Promise<string>;
/**
 * Resolve the path to a file but with the exact filename-casing present on disk.
 */
export declare function getPathWithExactFileNameCasing(path: string): Promise<string | undefined>;
export declare function getCurrentPackageVersion(): Promise<string>;
