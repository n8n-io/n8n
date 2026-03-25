import { E as EncodedSourceMap } from './trace-mapping.d-DLVdEqOp.js';

/** @deprecated use HotPayload */
type HMRPayload = HotPayload
type HotPayload =
  | ConnectedPayload
  | PingPayload
  | UpdatePayload
  | FullReloadPayload
  | CustomPayload
  | ErrorPayload
  | PrunePayload

interface ConnectedPayload {
  type: 'connected'
}

interface PingPayload {
  type: 'ping'
}

interface UpdatePayload {
  type: 'update'
  updates: Update[]
}

interface Update {
  type: 'js-update' | 'css-update'
  path: string
  acceptedPath: string
  timestamp: number
  /** @internal */
  explicitImportRequired?: boolean
  /** @internal */
  isWithinCircularImport?: boolean
  /** @internal */
  invalidates?: string[]
}

interface PrunePayload {
  type: 'prune'
  paths: string[]
}

interface FullReloadPayload {
  type: 'full-reload'
  path?: string
  /** @internal */
  triggeredBy?: string
}

interface CustomPayload {
  type: 'custom'
  event: string
  data?: any
}

interface ErrorPayload {
  type: 'error'
  err: {
    [name: string]: any
    message: string
    stack: string
    id?: string
    frame?: string
    plugin?: string
    pluginCode?: string
    loc?: {
      file?: string
      line: number
      column: number
    }
  }
}

interface CustomEventMap {
  'vite:beforeUpdate': UpdatePayload
  'vite:afterUpdate': UpdatePayload
  'vite:beforePrune': PrunePayload
  'vite:beforeFullReload': FullReloadPayload
  'vite:error': ErrorPayload
  'vite:invalidate': InvalidatePayload
  'vite:ws:connect': WebSocketConnectionPayload
  'vite:ws:disconnect': WebSocketConnectionPayload
}

interface WebSocketConnectionPayload {
  /**
   * @experimental
   * We expose this instance experimentally to see potential usage.
   * This might be removed in the future if we didn't find reasonable use cases.
   * If you find this useful, please open an issue with details so we can discuss and make it stable API.
   */
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  webSocket: WebSocket
}

interface InvalidatePayload {
  path: string
  message: string | undefined
}

/**
 * provides types for built-in Vite events
 */
type InferCustomEventPayload<T extends string> =
  T extends keyof CustomEventMap ? CustomEventMap[T] : any

type ModuleNamespace = Record<string, any> & {
  [Symbol.toStringTag]: 'Module'
}

interface ViteHotContext {
  readonly data: any

  accept(): void
  accept(cb: (mod: ModuleNamespace | undefined) => void): void
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void
  accept(
    deps: readonly string[],
    cb: (mods: Array<ModuleNamespace | undefined>) => void,
  ): void

  acceptExports(
    exportNames: string | readonly string[],
    cb?: (mod: ModuleNamespace | undefined) => void,
  ): void

  dispose(cb: (data: any) => void): void
  prune(cb: (data: any) => void): void
  invalidate(message?: string): void

  on<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  off<T extends string>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  send<T extends string>(event: T, data?: InferCustomEventPayload<T>): void
}

declare const DEFAULT_REQUEST_STUBS: Record<string, Record<string, unknown>>;
declare class ModuleCacheMap extends Map<string, ModuleCache> {
	normalizePath(fsPath: string): string;
	/**
	* Assign partial data to the map
	*/
	update(fsPath: string, mod: ModuleCache): this;
	setByModuleId(modulePath: string, mod: ModuleCache): this;
	set(fsPath: string, mod: ModuleCache): this;
	getByModuleId(modulePath: string): ModuleCache & Required<Pick<ModuleCache, "imports" | "importers">>;
	get(fsPath: string): ModuleCache & Required<Pick<ModuleCache, "importers" | "imports">>;
	deleteByModuleId(modulePath: string): boolean;
	delete(fsPath: string): boolean;
	invalidateModule(mod: ModuleCache): boolean;
	/**
	* Invalidate modules that dependent on the given modules, up to the main entry
	*/
	invalidateDepTree(ids: string[] | Set<string>, invalidated?: Set<string>): Set<string>;
	/**
	* Invalidate dependency modules of the given modules, down to the bottom-level dependencies
	*/
	invalidateSubDepTree(ids: string[] | Set<string>, invalidated?: Set<string>): Set<string>;
	/**
	* Return parsed source map based on inlined source map of the module
	*/
	getSourceMap(id: string): EncodedSourceMap | null;
}
type ModuleExecutionInfo = Map<string, {
	startOffset: number
}>;
declare class ViteNodeRunner {
	options: ViteNodeRunnerOptions;
	root: string;
	debug: boolean;
	/**
	* Holds the cache of modules
	* Keys of the map are filepaths, or plain package names
	*/
	moduleCache: ModuleCacheMap;
	constructor(options: ViteNodeRunnerOptions);
	executeFile(file: string): Promise<any>;
	executeId(rawId: string): Promise<any>;
	shouldResolveId(id: string, _importee?: string): boolean;
	private _resolveUrl;
	resolveUrl(id: string, importee?: string): Promise<[url: string, fsPath: string]>;
	private _fetchModule;
	protected getContextPrimitives(): {
		Object: ObjectConstructor
		Reflect: typeof Reflect
		Symbol: SymbolConstructor
	};
	protected runModule(context: Record<string, any>, transformed: string): Promise<void>;
	prepareContext(context: Record<string, any>): Record<string, any>;
	/**
	* Define if a module should be interop-ed
	* This function mostly for the ability to override by subclass
	*/
	shouldInterop(path: string, mod: any): boolean;
	protected importExternalModule(path: string): Promise<any>;
	/**
	* Import a module and interop it
	*/
	interopedImport(path: string): Promise<any>;
}

type Nullable<T> = T | null | undefined;
type Arrayable<T> = T | Array<T>;
type Awaitable<T> = T | PromiseLike<T>;
interface DepsHandlingOptions {
	external?: (string | RegExp)[];
	inline?: (string | RegExp)[] | true;
	inlineFiles?: string[];
	/**
	* A list of directories that are considered to hold Node.js modules
	* Have to include "/" at the start and end of the path
	*
	* Vite-Node checks the whole absolute path of the import, so make sure you don't include
	* unwanted files accidentally
	* @default ['/node_modules/']
	*/
	moduleDirectories?: string[];
	cacheDir?: string;
	/**
	* Try to guess the CJS version of a package when it's invalid ESM
	* @default false
	*/
	fallbackCJS?: boolean;
}
interface StartOfSourceMap {
	file?: string;
	sourceRoot?: string;
}

interface RawSourceMap extends StartOfSourceMap {
	version: number;
	sources: string[];
	names: string[];
	sourcesContent?: (string | null)[];
	mappings: string;
}
interface FetchResult {
	code?: string;
	externalize?: string;
	map?: EncodedSourceMap | null;
}
type HotContext = Omit<ViteHotContext, "acceptDeps" | "decline">;
type FetchFunction = (id: string) => Promise<FetchResult>;
type ResolveIdFunction = (id: string, importer?: string) => Awaitable<ViteNodeResolveId | null | undefined | void>;
type CreateHotContextFunction = (runner: ViteNodeRunner, url: string) => HotContext;
interface ModuleCache {
	promise?: Promise<any>;
	exports?: any;
	evaluated?: boolean;
	resolving?: boolean;
	code?: string;
	map?: EncodedSourceMap;
	/**
	* Module ids that imports this module
	*/
	importers?: Set<string>;
	imports?: Set<string>;
}
interface ViteNodeRunnerOptions {
	root: string;
	fetchModule: FetchFunction;
	resolveId?: ResolveIdFunction;
	createHotContext?: CreateHotContextFunction;
	base?: string;
	moduleCache?: ModuleCacheMap;
	moduleExecutionInfo?: ModuleExecutionInfo;
	interopDefault?: boolean;
	requestStubs?: Record<string, any>;
	debug?: boolean;
}
interface ViteNodeResolveId {
	external?: boolean | "absolute" | "relative";
	id: string;
	meta?: Record<string, any> | null;
	moduleSideEffects?: boolean | "no-treeshake" | null;
	syntheticNamedExports?: boolean | string | null;
}
interface ViteNodeResolveModule {
	external: string | null;
	id: string;
	fsPath: string;
}
interface ViteNodeServerOptions {
	/**
	* Inject inline sourcemap to modules
	* @default 'inline'
	*/
	sourcemap?: "inline" | boolean;
	/**
	* Deps handling
	*/
	deps?: DepsHandlingOptions;
	/**
	* Transform method for modules
	*/
	transformMode?: {
		ssr?: RegExp[]
		web?: RegExp[]
	};
	debug?: DebuggerOptions;
}
interface DebuggerOptions {
	/**
	* Dump the transformed module to filesystem
	* Passing a string will dump to the specified path
	*/
	dumpModules?: boolean | string;
	/**
	* Read dumpped module from filesystem whenever exists.
	* Useful for debugging by modifying the dump result from the filesystem.
	*/
	loadDumppedModules?: boolean;
}

export { ModuleCacheMap as M, ViteNodeRunner as a, DEFAULT_REQUEST_STUBS as e };
export type { Arrayable as A, CustomEventMap as C, DebuggerOptions as D, FetchResult as F, HMRPayload as H, Nullable as N, RawSourceMap as R, StartOfSourceMap as S, ViteNodeServerOptions as V, HotContext as b, DepsHandlingOptions as c, ViteNodeResolveId as d, ModuleExecutionInfo as f, Awaitable as g, FetchFunction as h, ResolveIdFunction as i, CreateHotContextFunction as j, ModuleCache as k, ViteNodeRunnerOptions as l, ViteNodeResolveModule as m };
