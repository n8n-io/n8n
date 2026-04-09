import type { ChildContext, LegacyResolver, NewResolver, NormalizedCacheSettings, PluginSettings, RuleContext } from '../types.js';
import { ModuleCache } from './module-cache.js';
export declare const CASE_SENSITIVE_FS: boolean;
export declare const IMPORT_RESOLVE_ERROR_NAME = "EslintPluginImportResolveError";
export declare const fileExistsCache: ModuleCache;
export declare function fileExistsWithCaseSync(filepath: string | null, cacheSettings: NormalizedCacheSettings, strict?: boolean, leaf?: boolean): boolean;
export declare function relative(modulePath: string, sourceFile: string, settings: PluginSettings, context: ChildContext | RuleContext): string | null | undefined;
export declare function resolve(modulePath: string, context: RuleContext): string | null | undefined;
export declare function importXResolverCompat(resolver: LegacyResolver | NewResolver, resolverOptions?: unknown): NewResolver;
