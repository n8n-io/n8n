import VirtualModulesPlugin from "webpack-virtual-modules";
import { CompilationContext, JsPlugin } from "@farmfe/core";
import { Compilation, Compiler as RspackCompiler, LoaderContext, RspackPluginInstance } from "@rspack/core";
import { BuildOptions, Loader, Plugin as EsbuildPlugin, PluginBuild } from "esbuild";
import { Plugin as RolldownPlugin } from "rolldown";
import { AstNode, EmittedAsset, Plugin as RollupPlugin, PluginContextMeta, SourceMapInput } from "rollup";
import { Plugin as UnloaderPlugin } from "unloader";
import { Plugin as VitePlugin } from "vite";
import { Compilation as Compilation$1, Compiler as WebpackCompiler, LoaderContext as LoaderContext$1, WebpackPluginInstance } from "webpack";

//#region src/types.d.ts
type Thenable<T> = T | Promise<T>;
/**
* Null or whatever
*/
type Nullable<T> = T | null | undefined;
/**
* Array, or not yet
*/
type Arrayable<T> = T | Array<T>;
interface SourceMapCompact {
  file?: string | undefined;
  mappings: string;
  names: string[];
  sourceRoot?: string | undefined;
  sources: string[];
  sourcesContent?: (string | null)[] | undefined;
  version: number;
}
type TransformResult = string | {
  code: string;
  map?: SourceMapInput | SourceMapCompact | null | undefined;
} | null | undefined | void;
interface ExternalIdResult {
  id: string;
  external?: boolean | undefined;
}
type NativeBuildContext = {
  framework: "webpack";
  compiler: WebpackCompiler;
  compilation?: Compilation$1 | undefined;
  loaderContext?: LoaderContext$1<{
    unpluginName: string;
  }> | undefined;
  inputSourceMap?: any;
} | {
  framework: "esbuild";
  build: PluginBuild;
} | {
  framework: "rspack";
  compiler: RspackCompiler;
  compilation: Compilation;
  loaderContext?: LoaderContext | undefined;
  inputSourceMap?: any;
} | {
  framework: "farm";
  context: CompilationContext;
};
interface UnpluginBuildContext {
  addWatchFile: (id: string) => void;
  emitFile: (emittedFile: EmittedAsset) => void;
  getWatchFiles: () => string[];
  parse: (input: string, options?: any) => AstNode;
  getNativeBuildContext?: (() => NativeBuildContext) | undefined;
}
type StringOrRegExp = string | RegExp;
type FilterPattern = Arrayable<StringOrRegExp>;
type StringFilter = FilterPattern | {
  include?: FilterPattern | undefined;
  exclude?: FilterPattern | undefined;
};
interface HookFilter {
  id?: StringFilter | undefined;
  code?: StringFilter | undefined;
}
interface ObjectHook<T extends HookFnMap[keyof HookFnMap], F extends keyof HookFilter> {
  filter?: Pick<HookFilter, F> | undefined;
  handler: T;
}
type Hook<T extends HookFnMap[keyof HookFnMap], F extends keyof HookFilter> = T | ObjectHook<T, F>;
interface HookFnMap {
  buildStart: (this: UnpluginBuildContext) => Thenable<void>;
  buildEnd: (this: UnpluginBuildContext) => Thenable<void>;
  transform: (this: UnpluginBuildContext & UnpluginContext, code: string, id: string) => Thenable<TransformResult>;
  load: (this: UnpluginBuildContext & UnpluginContext, id: string) => Thenable<TransformResult>;
  resolveId: (this: UnpluginBuildContext & UnpluginContext, id: string, importer: string | undefined, options: {
    isEntry: boolean;
  }) => Thenable<string | ExternalIdResult | null | undefined>;
  writeBundle: (this: void) => Thenable<void>;
}
interface UnpluginOptions {
  name: string;
  enforce?: "post" | "pre" | undefined;
  buildStart?: HookFnMap["buildStart"] | undefined;
  buildEnd?: HookFnMap["buildEnd"] | undefined;
  transform?: Hook<HookFnMap["transform"], "code" | "id"> | undefined;
  load?: Hook<HookFnMap["load"], "id"> | undefined;
  resolveId?: Hook<HookFnMap["resolveId"], "id"> | undefined;
  writeBundle?: HookFnMap["writeBundle"] | undefined;
  watchChange?: ((this: UnpluginBuildContext, id: string, change: {
    event: "create" | "update" | "delete";
  }) => void) | undefined;
  /**
  * Custom predicate function to filter modules to be loaded.
  * When omitted, all modules will be included (might have potential perf impact on Webpack).
  *
  * @deprecated Use `load.filter` instead.
  */
  loadInclude?: ((id: string) => boolean | null | undefined) | undefined;
  /**
  * Custom predicate function to filter modules to be transformed.
  * When omitted, all modules will be included (might have potential perf impact on Webpack).
  *
  * @deprecated Use `transform.filter` instead.
  */
  transformInclude?: ((id: string) => boolean | null | undefined) | undefined;
  rollup?: Partial<RollupPlugin> | undefined;
  webpack?: ((compiler: WebpackCompiler) => void) | undefined;
  rspack?: ((compiler: RspackCompiler) => void) | undefined;
  vite?: Partial<VitePlugin> | undefined;
  unloader?: Partial<UnloaderPlugin> | undefined;
  rolldown?: Partial<RolldownPlugin> | undefined;
  esbuild?: {
    onResolveFilter?: RegExp | undefined;
    onLoadFilter?: RegExp | undefined;
    loader?: Loader | ((code: string, id: string) => Loader) | undefined;
    setup?: ((build: PluginBuild) => void | Promise<void>) | undefined;
    config?: ((options: BuildOptions) => void) | undefined;
  } | undefined;
  farm?: Partial<JsPlugin> | undefined;
}
interface ResolvedUnpluginOptions extends UnpluginOptions {
  __vfs?: VirtualModulesPlugin | undefined;
  __vfsModules?: Map<string, Promise<unknown>> | Set<string> | undefined;
  __virtualModulePrefix: string;
}
type UnpluginFactory<UserOptions, Nested extends boolean = boolean> = (options: UserOptions, meta: UnpluginContextMeta) => Nested extends true ? Array<UnpluginOptions> : UnpluginOptions;
type UnpluginFactoryOutput<UserOptions, Return> = undefined extends UserOptions ? (options?: UserOptions | undefined) => Return : (options: UserOptions) => Return;
interface UnpluginInstance<UserOptions, Nested extends boolean = boolean> {
  rollup: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<RollupPlugin> : RollupPlugin>;
  vite: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<VitePlugin> : VitePlugin>;
  rolldown: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<RolldownPlugin> : RolldownPlugin>;
  webpack: UnpluginFactoryOutput<UserOptions, WebpackPluginInstance>;
  rspack: UnpluginFactoryOutput<UserOptions, RspackPluginInstance>;
  esbuild: UnpluginFactoryOutput<UserOptions, EsbuildPlugin>;
  unloader: UnpluginFactoryOutput<UserOptions, Nested extends true ? Array<UnloaderPlugin> : UnloaderPlugin>;
  farm: UnpluginFactoryOutput<UserOptions, JsPlugin>;
  raw: UnpluginFactory<UserOptions, Nested>;
}
type UnpluginContextMeta = Partial<PluginContextMeta> & ({
  framework: "rollup" | "vite" | "rolldown" | "farm" | "unloader";
} | {
  framework: "webpack";
  webpack: {
    compiler: WebpackCompiler;
  };
} | {
  framework: "esbuild";
  /** Set the host plugin name of esbuild when returning multiple plugins */
  esbuildHostName?: string | undefined;
} | {
  framework: "rspack";
  rspack: {
    compiler: RspackCompiler;
  };
});
interface UnpluginMessage {
  name?: string | undefined;
  id?: string | undefined;
  message: string;
  stack?: string | undefined;
  code?: string | undefined;
  plugin?: string | undefined;
  pluginCode?: unknown | undefined;
  loc?: {
    column: number;
    file?: string | undefined;
    line: number;
  } | undefined;
  meta?: any;
}
interface UnpluginContext {
  error: (message: string | UnpluginMessage) => void;
  warn: (message: string | UnpluginMessage) => void;
}
//#endregion
//#region src/define.d.ts
declare function createUnplugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions, Nested>;
declare function createEsbuildPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["esbuild"];
declare function createRollupPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["rollup"];
declare function createVitePlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["vite"];
declare function createRolldownPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["rolldown"];
declare function createWebpackPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["webpack"];
declare function createRspackPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["rspack"];
declare function createFarmPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["farm"];
declare function createUnloaderPlugin<UserOptions, Nested extends boolean = boolean>(factory: UnpluginFactory<UserOptions, Nested>): UnpluginInstance<UserOptions>["unloader"];
//#endregion
export { Arrayable, type EsbuildPlugin, ExternalIdResult, FilterPattern, Hook, HookFilter, HookFnMap, NativeBuildContext, Nullable, ObjectHook, ResolvedUnpluginOptions, type RolldownPlugin, type RollupPlugin, type RspackCompiler, type RspackPluginInstance, SourceMapCompact, StringFilter, StringOrRegExp, Thenable, TransformResult, type UnloaderPlugin, UnpluginBuildContext, UnpluginContext, UnpluginContextMeta, UnpluginFactory, UnpluginFactoryOutput, UnpluginInstance, UnpluginMessage, UnpluginOptions, type VitePlugin, type WebpackCompiler, type WebpackPluginInstance, createEsbuildPlugin, createFarmPlugin, createRolldownPlugin, createRollupPlugin, createRspackPlugin, createUnloaderPlugin, createUnplugin, createVitePlugin, createWebpackPlugin };