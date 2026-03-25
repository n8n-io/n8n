import type { TSESLint } from '@typescript-eslint/utils';
import type { KebabCase, LiteralUnion } from 'type-fest';
import type { NapiResolveOptions } from 'unrs-resolver';
import type { PluginName } from './utils.js';
export type FileExtension = `.${string}`;
export type DocStyle = 'jsdoc' | 'tomdoc';
export interface ResultNotFound {
    found: false;
    path?: undefined;
}
export interface ResultFound {
    found: true;
    path: string | null;
}
export type NewResolverResolve = (modulePath: string, sourceFile: string) => ResolvedResult;
export interface NewResolver {
    interfaceVersion: 3;
    name?: string;
    resolve: NewResolverResolve;
}
export type Resolver = LegacyResolver | NewResolver;
export type ResolvedResult = ResultFound | ResultNotFound;
export interface NodeResolverOptions extends Omit<NapiResolveOptions, 'extensions'> {
    basedir?: string;
    includeCoreModules?: boolean;
    extensions?: string | readonly string[];
    paths?: string | readonly string[];
    moduleDirectory?: string | readonly string[];
    preserveSymlinks?: boolean;
    package?: unknown;
    packageFilter?: unknown;
    pathFilter?: unknown;
    packageIterator?: unknown;
}
export interface WebpackResolverOptions {
    config?: string | {
        resolve: NapiResolveOptions;
    };
    'config-index'?: number;
    env?: Record<string, unknown>;
    argv?: Record<string, unknown>;
}
export interface TsResolverOptions extends NapiResolveOptions {
    alwaysTryTypes?: boolean;
    project?: string[] | string;
    extensions?: string[];
}
export type LegacyResolverName = LiteralUnion<'node' | 'typescript' | 'webpack', string>;
export type LegacyResolverResolveImport<T = unknown> = (modulePath: string, sourceFile: string, config: T) => string | undefined;
export type LegacyResolverResolve<T = unknown> = (modulePath: string, sourceFile: string, config: T) => ResolvedResult;
export interface LegacyResolverV1<T> {
    interfaceVersion?: 1;
    resolveImport: LegacyResolverResolveImport<T>;
}
export interface LegacyResolverV2<T> {
    interfaceVersion: 2;
    resolve: LegacyResolverResolve<T>;
}
export type LegacyResolver<T = unknown, U = T> = LegacyResolverV1<U> | LegacyResolverV2<T>;
export interface LegacyResolverObjectBase {
    name: LegacyResolverName;
    enable?: boolean;
    options?: unknown;
    resolver: LegacyResolver;
}
export interface LegacyNodeResolverObject extends LegacyResolverObjectBase {
    name: 'node';
    options?: NodeResolverOptions | boolean;
}
export interface LegacyTsResolverObject extends LegacyResolverObjectBase {
    name: 'typescript';
    options?: TsResolverOptions | boolean;
}
export interface LegacyWebpackResolverObject extends LegacyResolverObjectBase {
    name: 'webpack';
    options?: WebpackResolverOptions | boolean;
}
export type LegacyResolverObject = LegacyNodeResolverObject | LegacyResolverObjectBase | LegacyTsResolverObject | LegacyWebpackResolverObject;
export interface LegacyResolverRecord {
    [resolve: string]: unknown;
    node?: NodeResolverOptions | boolean;
    typescript?: TsResolverOptions | boolean;
    webpack?: WebpackResolverOptions | boolean;
}
export type LegacyImportResolver = LegacyResolverName | LegacyResolverName[] | LegacyResolverObject | LegacyResolverObject[] | LegacyResolverRecord | LegacyResolverRecord[];
export interface ImportSettings {
    cache?: {
        lifetime?: number | '∞' | 'Infinity';
    };
    coreModules?: string[];
    docstyle?: DocStyle[];
    extensions?: readonly FileExtension[];
    externalModuleFolders?: string[];
    ignore?: string[];
    internalRegex?: string;
    parsers?: Record<string, readonly FileExtension[]>;
    resolve?: NodeResolverOptions;
    resolver?: LegacyImportResolver;
    'resolver-legacy'?: LegacyImportResolver;
    'resolver-next'?: NewResolver | NewResolver[];
}
export type WithPluginName<T extends object | string> = T extends string ? `${PluginName}/${KebabCase<T>}` : {
    [K in keyof T as WithPluginName<`${KebabCase<K & string>}`>]: T[K];
};
export type PluginSettings = WithPluginName<ImportSettings>;
export interface RuleContext<TMessageIds extends string = string, TOptions extends readonly unknown[] = readonly unknown[]> extends Omit<TSESLint.RuleContext<TMessageIds, TOptions>, 'settings'> {
    settings: PluginSettings;
}
export interface ChildContext {
    cacheKey: string;
    settings: PluginSettings;
    parserPath?: string | null;
    parserOptions?: TSESLint.ParserOptions;
    languageOptions?: TSESLint.FlatConfig.LanguageOptions;
    path: string;
    cwd: string;
    filename: string;
    physicalFilename: string;
}
