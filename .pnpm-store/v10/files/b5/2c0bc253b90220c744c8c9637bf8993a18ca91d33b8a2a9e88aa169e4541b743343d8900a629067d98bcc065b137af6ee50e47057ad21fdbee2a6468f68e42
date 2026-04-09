import * as vite from 'vite';
import { LogLevel } from 'vite';
import ts from 'typescript';
import { IExtractorInvokeOptions, ExtractorResult, IExtractorConfigPrepareOptions } from '@microsoft/api-extractor';

type MaybePromise<T> = T | Promise<T>;
type RollupConfig = Omit<IExtractorConfigPrepareOptions['configObject'], 'projectFolder' | 'mainEntryPointFilePath' | 'compiler' | 'dtsRollup'>;
interface Resolver {
    /**
     * The name of the resolver
     *
     * The later resolver with the same name will overwrite the earlier
     */
    name: string;
    /**
     * Determine whether the resolver supports the file
     */
    supports: (id: string) => void | boolean;
    /**
     * Transform source to declaration files
     *
     * Note that the path of the returns should base on `outDir`, or relative path to `root`
     */
    transform: (payload: {
        id: string;
        code: string;
        root: string;
        outDir: string;
        host: ts.CompilerHost;
        program: ts.Program;
    }) => MaybePromise<{
        outputs: {
            path: string;
            content: string;
        }[];
        emitSkipped?: boolean;
        diagnostics?: readonly ts.Diagnostic[];
    } | {
        path: string;
        content: string;
    }[]>;
}
interface PluginOptions {
    /**
     * Specify root directory.
     *
     * Defaults to the 'root' of the Vite config, or `process.cwd()` if using Rollup.
     */
    root?: string;
    /**
     * Output directory for declaration files.
     *
     * Can be an array to output to multiple directories.
     *
     * Defaults to 'build.outDir' of the Vite config, or `outDir` of tsconfig.json if using Rollup.
     */
    outDir?: string | string[];
    /**
     * Override root path of entry files (useful in monorepos).
     *
     * The output path of each file will be calculated based on the value provided.
     *
     * The default is the smallest public path for all source files.
     */
    entryRoot?: string;
    /**
     * Restrict declaration files output to `outDir`.
     *
     * If true, generated declaration files outside `outDir` will be ignored.
     *
     * @default true
     */
    strictOutput?: boolean;
    /**
     * Override compilerOptions.
     *
     * @default null
     */
    compilerOptions?: ts.CompilerOptions | null;
    /**
     * Specify tsconfig.json path.
     *
     * Plugin resolves `include` and `exclude` globs from tsconfig.json.
     *
     * If not specified, plugin will find config file from root.
     */
    tsconfigPath?: string;
    /**
     * Specify custom resolvers.
     *
     * @default []
     */
    resolvers?: Resolver[];
    /**
     * Parsing `paths` of tsconfig.json to aliases.
     *
     * Note that these aliases only use for declaration files.
     *
     * @default true
     * @remarks Only use first replacement of each path.
     */
    pathsToAliases?: boolean;
    /**
     * Set which paths should be excluded when transforming aliases.
     *
     * @default []
     */
    aliasesExclude?: (string | RegExp)[];
    /**
     * Whether to transform file names ending in '.vue.d.ts' to '.d.ts'.
     *
     * If there is a duplicate name after transform, it will fall back to the original name.
     *
     * @default false
     */
    cleanVueFileName?: boolean;
    /**
     * Whether to transform dynamic imports to static (eg `import('vue').DefineComponent` to `import { DefineComponent } from 'vue'`).
     *
     * Value is forced to `true` when `rollupTypes` is `true`.
     *
     * @default false
     */
    staticImport?: boolean;
    /**
     * Override `include` glob (relative to root).
     *
     * Defaults to `include` property of tsconfig.json (relative to tsconfig.json located).
     */
    include?: string | string[];
    /**
     * Override `exclude` glob.
     *
     * Defaults to `exclude` property of tsconfig.json or `'node_modules/**'` if not supplied.
     */
    exclude?: string | string[];
    /**
     * Whether to remove `import 'xxx'`.
     *
     * @default true
     */
    clearPureImport?: boolean;
    /**
     * Whether to generate types entry file(s).
     *
     * When `true`, uses package.json `types` property if it exists or `${outDir}/index.d.ts`.
     *
     * Value is forced to `true` when `rollupTypes` is `true`.
     *
     * @default false
     */
    insertTypesEntry?: boolean;
    /**
     * Rollup type declaration files after emitting them.
     *
     * Powered by `@microsoft/api-extractor` - time-intensive operation.
     *
     * @default false
     */
    rollupTypes?: boolean;
    /**
     * Bundled packages for `@microsoft/api-extractor`.
     *
     * @default []
     * @see https://api-extractor.com/pages/configs/api-extractor_json/#bundledpackages
     */
    bundledPackages?: string[];
    /**
     * Override the config of `@microsoft/api-extractor`.
     *
     * @default null
     * @see https://api-extractor.com/pages/setup/configure_api_report/
     */
    rollupConfig?: RollupConfig;
    /**
     * Override the invoke options of `@microsoft/api-extractor`.
     *
     * @default null
     * @see https://api-extractor.com/pages/setup/invoking/#invoking-from-a-build-script
     */
    rollupOptions?: IExtractorInvokeOptions;
    /**
     * Whether to copy .d.ts source files to `outDir`.
     *
     * @default false
     * @remarks Before 2.0, the default was `true`.
     */
    copyDtsFiles?: boolean;
    /**
     * Whether to emit declaration files only.
     *
     * When `true`, all the original outputs of vite (rollup) will be force removed.
     *
     * @default false
     */
    declarationOnly?: boolean;
    /**
     * Logging level for this plugin.
     *
     * Defaults to the 'logLevel' property of your Vite config.
     */
    logLevel?: LogLevel;
    /**
     * Hook called after diagnostic is emitted.
     *
     * According to the `diagnostics.length`, you can judge whether there is any type error.
     *
     * @default () => {}
     */
    afterDiagnostic?: (diagnostics: readonly ts.Diagnostic[]) => MaybePromise<void>;
    /**
     * Hook called prior to writing each declaration file.
     *
     * This allows you to transform the path or content.
     *
     * The file will be skipped when the return value `false` or `Promise<false>`.
     *
     * @default () => {}
     */
    beforeWriteFile?: (filePath: string, content: string) => MaybePromise<void | false | {
        filePath?: string;
        content?: string;
    }>;
    /**
     * Hook called after rolling up declaration files.
     *
     * @default () => {}
     */
    afterRollup?: (result: ExtractorResult) => MaybePromise<void>;
    /**
     * Hook called after all declaration files are written.
     *
     * It will be received a map (path -> content) that records those emitted files.
     *
     * @default () => {}
     */
    afterBuild?: (emittedFiles: Map<string, string>) => MaybePromise<void>;
}

declare function dtsPlugin(options?: PluginOptions): vite.Plugin;

declare function editSourceMapDir(content: string, fromDir: string, toDir: string): string | boolean;

export { type PluginOptions, dtsPlugin as default, editSourceMapDir };
