/// <reference types="node" />
import type { Plugin, ParseOptions, Module, Output, Options, Script, Program, JsMinifyOptions, WasmAnalysisOptions } from "@swc/types";
export type * from "@swc/types";
export { newMangleNameCache as experimental_newMangleNameCache } from "./binding";
import { BundleInput } from "./spack";
import type { NapiMinifyExtra } from "./binding";
/**
 * Version of the swc binding.
 */
export declare const version: string;
/**
 * @deprecated JavaScript API is deprecated. Please use Wasm plugin instead.
 */
export declare function plugins(ps: Plugin[]): Plugin;
export declare class Compiler {
    private fallbackBindingsPluginWarningDisplayed;
    minify(src: string | Buffer, opts?: JsMinifyOptions, extras?: NapiMinifyExtra): Promise<Output>;
    minifySync(src: string | Buffer, opts?: JsMinifyOptions, extras?: NapiMinifyExtra): Output;
    /**
     * @deprecated Use Rust instead.
     */
    parse(src: string, options: ParseOptions & {
        isModule: false;
    }): Promise<Script>;
    parse(src: string, options?: ParseOptions, filename?: string): Promise<Module>;
    parseSync(src: string, options: ParseOptions & {
        isModule: false;
    }): Script;
    parseSync(src: string, options?: ParseOptions, filename?: string): Module;
    parseFile(path: string, options: ParseOptions & {
        isModule: false;
    }): Promise<Script>;
    parseFile(path: string, options?: ParseOptions): Promise<Module>;
    parseFileSync(path: string, options: ParseOptions & {
        isModule: false;
    }): Script;
    parseFileSync(path: string, options?: ParseOptions): Module;
    /**
     * Note: this method should be invoked on the compiler instance used
     *  for `parse()` / `parseSync()`.
     */
    print(m: Program, options?: Options): Promise<Output>;
    /**
     * Note: this method should be invoked on the compiler instance used
     *  for `parse()` / `parseSync()`.
     */
    printSync(m: Program, options?: Options): Output;
    transform(src: string | Program, options?: Options): Promise<Output>;
    transformSync(src: string | Program, options?: Options): Output;
    transformFile(path: string, options?: Options): Promise<Output>;
    transformFileSync(path: string, options?: Options): Output;
    bundle(options?: BundleInput | string): Promise<{
        [name: string]: Output;
    }>;
}
export declare function experimental_analyze(src: string, options?: WasmAnalysisOptions): Promise<string>;
/**
 * @deprecated Use Rust instead.
 */
export declare function parse(src: string, options: ParseOptions & {
    isModule: false;
}): Promise<Script>;
export declare function parse(src: string, options?: ParseOptions): Promise<Module>;
export declare function parseSync(src: string, options: ParseOptions & {
    isModule: false;
}): Script;
export declare function parseSync(src: string, options?: ParseOptions): Module;
export declare function parseFile(path: string, options: ParseOptions & {
    isModule: false;
}): Promise<Script>;
export declare function parseFile(path: string, options?: ParseOptions): Promise<Module>;
export declare function parseFileSync(path: string, options: ParseOptions & {
    isModule: false;
}): Script;
export declare function parseFileSync(path: string, options?: ParseOptions): Module;
export declare function print(m: Program, options?: Options): Promise<Output>;
export declare function printSync(m: Program, options?: Options): Output;
export declare function transform(src: string | Program, options?: Options): Promise<Output>;
export declare function transformSync(src: string | Program, options?: Options): Output;
export declare function transformFile(path: string, options?: Options): Promise<Output>;
export declare function transformFileSync(path: string, options?: Options): Output;
export declare function bundle(options?: BundleInput | string): Promise<{
    [name: string]: Output;
}>;
export declare function minify(src: string | Buffer, opts?: JsMinifyOptions, extras?: NapiMinifyExtra): Promise<Output>;
export declare function minifySync(src: string | Buffer, opts?: JsMinifyOptions, extras?: NapiMinifyExtra): Output;
/**
 * Configure custom trace configuration runs for a process lifecycle.
 * Currently only chromium's trace event format is supported.
 * (https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview)
 *
 * This should be called before calling any binding interfaces exported in `@swc/core`, such as
 * `transform*`, or `parse*` or anything. To avoid breaking changes, each binding fn internally
 * sets default trace subscriber if not set.
 *
 * Unlike other configuration, this does not belong to individual api surface using swcrc
 * or api's parameters (`transform(..., {trace})`). This is due to current tracing subscriber
 * can be configured only once for the global scope. Calling `registerGlobalTraceConfig` multiple
 * time won't cause error, subsequent calls will be ignored.
 *
 * As name implies currently this is experimental interface may change over time without semver
 * major breaking changes. Please provide feedbacks,
 * or bug report at https://github.com/swc-project/swc/discussions.
 */
export declare function __experimental_registerGlobalTraceConfig(traceConfig: {
    type: "traceEvent";
    fileName?: string;
}): void;
/**
 * @ignore
 *
 * Returns current binary's metadata to determine which binary is actually loaded.
 *
 * This is undocumented interface, does not guarantee stability across `@swc/core`'s semver
 * as internal representation may change anytime. Use it with caution.
 */
export declare function getBinaryMetadata(): {
    target: string | undefined;
};
export declare const DEFAULT_EXTENSIONS: readonly string[];
