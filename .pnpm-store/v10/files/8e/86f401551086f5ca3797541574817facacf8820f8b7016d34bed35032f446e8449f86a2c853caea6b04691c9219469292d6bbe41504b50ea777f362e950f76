import * as _farmfe_core from '@farmfe/core';
import { JsPlugin, CompilationContext } from '@farmfe/core';
import * as _rspack_core_dist_config_types from '@rspack/core/dist/config/types';
import * as webpack from 'webpack';
import { Compiler, Compilation, LoaderContext, WebpackPluginInstance } from 'webpack';
export { Compiler as WebpackCompiler, WebpackPluginInstance } from 'webpack';
import * as rolldown_dist_types_plugin from 'rolldown/dist/types/plugin';
import * as vite from 'vite';
import { Plugin as Plugin$1 } from 'vite';
export { Plugin as VitePlugin } from 'vite';
import * as rollup from 'rollup';
import { SourceMapInput, EmittedAsset, AstNode, Plugin, PluginContextMeta } from 'rollup';
export { Plugin as RollupPlugin } from 'rollup';
import { Compiler as Compiler$1, Compilation as Compilation$1, LoaderContext as LoaderContext$1, RspackPluginInstance } from '@rspack/core';
export { Compiler as RspackCompiler, RspackPluginInstance } from '@rspack/core';
import * as esbuild from 'esbuild';
import { PluginBuild, OnLoadResult, Loader, BuildOptions, Plugin as Plugin$3 } from 'esbuild';
export { Plugin as EsbuildPlugin } from 'esbuild';
import { Plugin as Plugin$2 } from 'rolldown';
export { Plugin as RolldownPlugin } from 'rolldown';
import VirtualModulesPlugin from 'webpack-virtual-modules';

interface OnTransformOptions {
    filter: RegExp;
    namespace?: string;
}
interface OnTransformArgs {
    getContents: () => Promise<string>;
    path: string;
    namespace: string;
    suffix: string;
    pluginData: any;
    with: Record<string, string>;
}
type OnTransformCallback = (args: OnTransformArgs) => (OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>);
interface EsbuildPluginBuild extends PluginBuild {
    onTransform: (options: OnTransformOptions, callback: OnTransformCallback) => void;
}

type Thenable<T> = T | Promise<T>;
interface SourceMapCompact {
    file?: string;
    mappings: string;
    names: string[];
    sourceRoot?: string;
    sources: string[];
    sourcesContent?: (string | null)[];
    version: number;
}
interface JsPluginExtended extends JsPlugin {
    [key: string]: any;
}
type TransformResult = string | {
    code: string;
    map?: SourceMapInput | SourceMapCompact | null;
} | null | undefined | void;
interface ExternalIdResult {
    id: string;
    external?: boolean;
}
type NativeBuildContext = {
    framework: 'webpack';
    compiler: Compiler;
    compilation?: Compilation;
    loaderContext?: LoaderContext<{
        unpluginName: string;
    }>;
} | {
    framework: 'esbuild';
    build: EsbuildPluginBuild;
} | {
    framework: 'rspack';
    compiler: Compiler$1;
    compilation: Compilation$1;
    loaderContext?: LoaderContext$1;
} | {
    framework: 'farm';
    context: CompilationContext;
};
interface UnpluginBuildContext {
    addWatchFile: (id: string) => void;
    emitFile: (emittedFile: EmittedAsset) => void;
    getWatchFiles: () => string[];
    parse: (input: string, options?: any) => AstNode;
    getNativeBuildContext?: () => NativeBuildContext;
}
interface UnpluginOptions {
    name: string;
    enforce?: 'post' | 'pre' | undefined;
    buildStart?: (this: UnpluginBuildContext) => Promise<void> | void;
    buildEnd?: (this: UnpluginBuildContext) => Promise<void> | void;
    transform?: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>;
    load?: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>;
    resolveId?: (this: UnpluginBuildContext & UnpluginContext, id: string, importer: string | undefined, options: {
        isEntry: boolean;
    }) => Thenable<string | ExternalIdResult | null | undefined>;
    watchChange?: (this: UnpluginBuildContext, id: string, change: {
        event: 'create' | 'update' | 'delete';
    }) => void;
    writeBundle?: (this: void) => Promise<void> | void;
    /**
     * Custom predicate function to filter modules to be loaded.
     * When omitted, all modules will be included (might have potential perf impact on Webpack).
     */
    loadInclude?: (id: string) => boolean | null | undefined;
    /**
     * Custom predicate function to filter modules to be transformed.
     * When omitted, all modules will be included (might have potential perf impact on Webpack).
     */
    transformInclude?: (id: string) => boolean | null | undefined;
    rollup?: Partial<Plugin>;
    webpack?: (compiler: Compiler) => void;
    rspack?: (compiler: Compiler$1) => void;
    vite?: Partial<Plugin$1>;
    rolldown?: Partial<Plugin$2>;
    esbuild?: {
        onResolveFilter?: RegExp;
        onLoadFilter?: RegExp;
        setup?: (build: PluginBuild) => void | Promise<void>;
        loader?: Loader | ((code: string, id: string) => Loader);
        config?: (options: BuildOptions) => void;
    };
    farm?: Partial<JsPlugin>;
}
interface ResolvedUnpluginOptions extends UnpluginOptions {
    __vfs?: VirtualModulesPlugin;
    __vfsModules?: Set<string>;
    __virtualModulePrefix: string;
}
type UnpluginFactory<UserOptions, Nested extends boolean = boolean> = (options: UserOptions, meta: UnpluginContextMeta) => Nested extends true ? Array<UnpluginOptions> : UnpluginOptions;
type UnpluginFactoryOutput<UserOptions, Return> = undefined extends UserOptions ? (options?: UserOptions) => Return : (options: UserOptions) => Return;
interface UnpluginInstance<UserOptions, Nested extends boolean = boolean> {
    rollup: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<Plugin> : Plugin>;
    vite: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<Plugin$1> : Plugin$1>;
    rolldown: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<Plugin$2> : Plugin$2>;
    webpack: UnpluginFactoryOutput<UserOptions, WebpackPluginInstance>;
    rspack: UnpluginFactoryOutput<UserOptions, RspackPluginInstance>;
    esbuild: UnpluginFactoryOutput<UserOptions, Plugin$3>;
    farm: UnpluginFactoryOutput<UserOptions, JsPlugin>;
    raw: UnpluginFactory<UserOptions, Nested>;
}
type UnpluginContextMeta = Partial<PluginContextMeta> & ({
    framework: 'rollup' | 'vite' | 'rolldown' | 'farm';
} | {
    framework: 'webpack';
    webpack: {
        compiler: Compiler;
    };
} | {
    framework: 'esbuild';
    /** @deprecated {getNativeBuildContext} */
    build?: EsbuildPluginBuild;
    /** Set the host plugin name of esbuild when returning multiple plugins */
    esbuildHostName?: string;
} | {
    framework: 'rspack';
    rspack: {
        compiler: Compiler$1;
    };
});
interface UnpluginMessage {
    name?: string;
    id?: string;
    message: string;
    stack?: string;
    code?: string;
    plugin?: string;
    pluginCode?: unknown;
    loc?: {
        column: number;
        file?: string;
        line: number;
    };
    meta?: any;
}
interface UnpluginContext {
    error: (message: string | UnpluginMessage) => void;
    warn: (message: string | UnpluginMessage) => void;
}
declare module 'webpack' {
    interface Compiler {
        $unpluginContext: Record<string, ResolvedUnpluginOptions>;
    }
}
declare module '@rspack/core' {
    interface Compiler {
        $unpluginContext: Record<string, ResolvedUnpluginOptions>;
    }
}

declare function createUnplugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions, Nested>;
declare function createEsbuildPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, esbuild.Plugin>;
declare function createRollupPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, Nested extends true ? rollup.Plugin<any>[] : rollup.Plugin<any>>;
declare function createVitePlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, Nested extends true ? vite.Plugin<any>[] : vite.Plugin<any>>;
/** @experimental do not use it in production */
declare function createRolldownPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, Nested extends true ? rolldown_dist_types_plugin.Plugin<any>[] : rolldown_dist_types_plugin.Plugin<any>>;
declare function createWebpackPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, webpack.WebpackPluginInstance>;
declare function createRspackPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, _rspack_core_dist_config_types.RspackPluginInstance>;
declare function createFarmPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginFactoryOutput<UserOptions, _farmfe_core.JsPlugin>;

export { type ExternalIdResult, type JsPluginExtended, type NativeBuildContext, type ResolvedUnpluginOptions, type SourceMapCompact, type Thenable, type TransformResult, type UnpluginBuildContext, type UnpluginContext, type UnpluginContextMeta, type UnpluginFactory, type UnpluginFactoryOutput, type UnpluginInstance, type UnpluginMessage, type UnpluginOptions, createEsbuildPlugin, createFarmPlugin, createRolldownPlugin, createRollupPlugin, createRspackPlugin, createUnplugin, createVitePlugin, createWebpackPlugin };
