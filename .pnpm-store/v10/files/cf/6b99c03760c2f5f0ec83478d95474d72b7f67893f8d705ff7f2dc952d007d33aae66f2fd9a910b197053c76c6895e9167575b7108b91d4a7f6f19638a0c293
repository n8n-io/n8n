import { SourceMapInput, EmittedAsset, AcornNode, Plugin, PluginContextMeta } from 'rollup';
export { Plugin as RollupPlugin } from 'rollup';
import { Compiler, WebpackPluginInstance } from 'webpack';
export { Compiler as WebpackCompiler } from 'webpack';
import { Plugin as Plugin$1 } from 'vite';
export { Plugin as VitePlugin } from 'vite';
import { Plugin as Plugin$2, PluginBuild } from 'esbuild';
export { Plugin as EsbuildPlugin } from 'esbuild';
import VirtualModulesPlugin from 'webpack-virtual-modules';

type Thenable<T> = T | Promise<T>;
type TransformResult = string | {
    code: string;
    map?: SourceMapInput | null;
} | null | undefined;
interface ExternalIdResult {
    id: string;
    external?: boolean;
}
interface UnpluginBuildContext {
    addWatchFile: (id: string) => void;
    emitFile: (emittedFile: EmittedAsset) => void;
    getWatchFiles: () => string[];
    parse: (input: string, options?: any) => AcornNode;
}
interface UnpluginOptions {
    name: string;
    enforce?: 'post' | 'pre' | undefined;
    buildStart?: (this: UnpluginBuildContext) => Promise<void> | void;
    buildEnd?: (this: UnpluginBuildContext) => Promise<void> | void;
    transform?: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>;
    load?: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>;
    resolveId?: (id: string, importer: string | undefined, options: {
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
    vite?: Partial<Plugin$1>;
    esbuild?: {
        onResolveFilter?: RegExp;
        onLoadFilter?: RegExp;
        setup?: Plugin$2['setup'];
    };
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
    webpack: UnpluginFactoryOutput<UserOptions, WebpackPluginInstance>;
    esbuild: UnpluginFactoryOutput<UserOptions, Plugin$2>;
    raw: UnpluginFactory<UserOptions, Nested>;
}
type UnpluginContextMeta = Partial<PluginContextMeta> & ({
    framework: 'rollup' | 'vite';
} | {
    framework: 'webpack';
    webpack: {
        compiler: Compiler;
    };
} | {
    framework: 'esbuild';
    build?: PluginBuild;
    /** Set the host plugin name of esbuild when returning multiple plugins */
    esbuildHostName?: string;
});
interface UnpluginContext {
    error(message: any): void;
    warn(message: any): void;
}
declare module 'webpack' {
    interface Compiler {
        $unpluginContext: Record<string, ResolvedUnpluginOptions>;
    }
}

declare function createUnplugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions, Nested>;

export { ExternalIdResult, ResolvedUnpluginOptions, Thenable, TransformResult, UnpluginBuildContext, UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginFactoryOutput, UnpluginInstance, UnpluginOptions, createUnplugin };
