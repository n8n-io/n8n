import { ResolvedResult } from "eslint-import-context";
import { NapiResolveOptions, ResolverFactory } from "unrs-resolver";

//#region src/types.d.ts
interface TypeScriptResolverOptions extends NapiResolveOptions {
  project?: string[] | string;
  alwaysTryTypes?: boolean;
  bun?: boolean;
  noWarnOnMultipleProjects?: boolean;
}
//#endregion
//#region src/constants.d.ts
declare const defaultConditionNames: string[];
declare const defaultExtensions: string[];
declare const defaultExtensionAlias: {
  '.js': string[];
  '.ts': string[];
  '.jsx': string[];
  '.tsx': string[];
  '.cjs': string[];
  '.cts': string[];
  '.mjs': string[];
  '.mts': string[];
};
declare const defaultMainFields: string[];
declare const JS_EXT_PATTERN: RegExp;
declare const IMPORT_RESOLVER_NAME = "eslint-import-resolver-typescript";
declare const interfaceVersion = 2;
declare const DEFAULT_TSCONFIG = "tsconfig.json";
declare const DEFAULT_JSCONFIG = "jsconfig.json";
declare const DEFAULT_CONFIGS: string[];
declare const DEFAULT_TRY_PATHS: string[];
declare const MATCH_ALL = "**";
declare const DEFAULT_IGNORE: string;
declare const TSCONFIG_NOT_FOUND_REGEXP: RegExp;
//#endregion
//#region src/helpers.d.ts
declare function mangleScopedPackage(moduleName: string): string;
declare function removeQuerystring(id: string): string;
declare const tryFile: (filename?: string[] | string, includeDir?: boolean, base?: string) => string;
declare const sortProjectsByAffinity: (projects: string[], file: string) => string[];
declare const toGlobPath: (pathname: string) => string;
declare const toNativePath: (pathname: string) => string;
//#endregion
//#region src/normalize-options.d.ts
declare let defaultConfigFile: string;
declare function normalizeOptions(options?: TypeScriptResolverOptions | null, cwd?: string): TypeScriptResolverOptions;
//#endregion
//#region src/index.d.ts
declare const resolve: (source: string, file: string, options?: TypeScriptResolverOptions | null, resolver?: ResolverFactory | null) => ResolvedResult;
declare const createTypeScriptImportResolver: (options?: TypeScriptResolverOptions | null) => {
  interfaceVersion: number;
  name: string;
  resolve(source: string, file: string): ResolvedResult;
};
//#endregion
export { DEFAULT_CONFIGS, DEFAULT_IGNORE, DEFAULT_JSCONFIG, DEFAULT_TRY_PATHS, DEFAULT_TSCONFIG, IMPORT_RESOLVER_NAME, JS_EXT_PATTERN, MATCH_ALL, TSCONFIG_NOT_FOUND_REGEXP, TypeScriptResolverOptions, createTypeScriptImportResolver, defaultConditionNames, defaultConfigFile, defaultExtensionAlias, defaultExtensions, defaultMainFields, interfaceVersion, mangleScopedPackage, normalizeOptions, removeQuerystring, resolve, sortProjectsByAffinity, toGlobPath, toNativePath, tryFile };