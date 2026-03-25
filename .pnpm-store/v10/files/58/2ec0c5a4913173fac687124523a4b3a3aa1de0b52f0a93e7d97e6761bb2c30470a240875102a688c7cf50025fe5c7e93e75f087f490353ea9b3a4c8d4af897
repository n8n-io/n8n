import { Options } from "@swc/types";
export type BundleInput = BundleOptions | BundleOptions[];
export declare const isLocalFile: RegExp;
export declare function compileBundleOptions(config: BundleInput | string | undefined): Promise<BundleInput>;
/**
 * Usage: In `spack.config.js` / `spack.config.ts`, you can utilize type annotations (to get autocompletions) like
 *
 * ```ts
 * import { config } from '@swc/core/spack';
 *
 * export default config({
 *      name: 'web',
 * });
 * ```
 *
 *
 *
 */
export declare function config(c: BundleInput): BundleInput;
export interface BundleOptions extends SpackConfig {
    workingDir?: string;
}
/**
 * `spack.config,js`
 */
export interface SpackConfig {
    /**
     * @default process.env.NODE_ENV
     */
    mode?: Mode;
    target?: Target;
    entry: EntryConfig;
    output: OutputConfig;
    module: ModuleConfig;
    options?: Options;
    /**
     * Modules to exclude from bundle.
     */
    externalModules?: string[];
}
export interface OutputConfig {
    name: string;
    path: string;
}
export interface ModuleConfig {
}
export type Mode = "production" | "development" | "none";
export type Target = "browser" | "node";
export type EntryConfig = string | string[] | {
    [name: string]: string;
};
