import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { PluginName, PluginSettings } from 'eslint-import-context';
import type { MinimatchOptions } from 'minimatch';
import type { ImportType as ImportType_ } from './utils/index.js';
export type { LegacyResolver, LegacyResolverName, LegacyResolverName as ResolverName, LegacyImportResolver, LegacyImportResolver as ImportResolver, LegacyResolverResolve, LegacyResolverResolve as ResolverResolve, LegacyResolverResolveImport, LegacyResolverResolveImport as ResolverResolveImport, LegacyResolverRecord, LegacyResolverRecord as ResolverRecord, LegacyResolverObject, LegacyResolverObject as ResolverObject, NodeResolverOptions, WebpackResolverOptions, TsResolverOptions, NewResolverResolve, NewResolver, FileExtension, DocStyle, ResultNotFound, ResultFound, Resolver, ResolvedResult, ImportSettings, WithPluginName, PluginSettings, RuleContext, ChildContext, } from 'eslint-import-context';
export type ImportType = ImportType_ | 'object' | 'type';
export type Arrayable<T> = T | readonly T[];
export interface PluginConfig extends TSESLint.ClassicConfig.Config {
    plugins?: [PluginName];
    settings?: PluginSettings;
    rules?: Record<`${PluginName}/${string}`, TSESLint.ClassicConfig.RuleEntry>;
}
export interface PluginFlatBaseConfig extends TSESLint.FlatConfig.Config {
    settings?: PluginSettings;
    rules?: Record<`${PluginName}/${string}`, TSESLint.FlatConfig.RuleEntry>;
}
export interface PluginFlatConfig extends PluginFlatBaseConfig {
    name?: `${PluginName}/${string}`;
}
export interface ParseError extends Error {
    lineNumber: number;
    column: number;
}
export interface CustomESTreeNode<Type extends string> extends Omit<TSESTree.BaseNode, 'type'> {
    type: Type;
}
export type ExportDefaultSpecifier = CustomESTreeNode<'ExportDefaultSpecifier'>;
export interface ExportNamespaceSpecifier extends CustomESTreeNode<'ExportNamespaceSpecifier'> {
    exported: TSESTree.Identifier;
}
export interface PathGroup {
    pattern: string;
    group: ImportType;
    patternOptions?: MinimatchOptions;
    position?: 'before' | 'after';
}
export type ExportAndImportKind = 'value' | 'type';
export type NewLinesOptions = 'always' | 'always-and-inside-groups' | 'ignore' | 'never';
export type NamedTypes = 'mixed' | 'types-first' | 'types-last';
export interface NamedOptions {
    enabled?: boolean;
    import?: boolean;
    export?: boolean;
    require?: boolean;
    cjsExports?: boolean;
    types?: NamedTypes;
}
export interface AlphabetizeOptions {
    caseInsensitive: boolean;
    order: 'ignore' | 'asc' | 'desc';
    orderImportKind: 'ignore' | 'asc' | 'desc';
}
export type ImportEntryType = 'import:object' | 'import' | 'require' | 'export';
export type LiteralNodeValue = string | number | bigint | boolean | RegExp | null;
export interface ImportEntry {
    type: ImportEntryType;
    node: TSESTree.Node & {
        importKind?: ExportAndImportKind;
        exportKind?: ExportAndImportKind;
    };
    value: LiteralNodeValue;
    alias?: string;
    kind?: ExportAndImportKind;
    displayName?: LiteralNodeValue;
}
export interface ImportEntryWithRank extends ImportEntry {
    rank: number;
    isMultiline?: boolean;
}
export interface RanksPathGroup {
    pattern: string;
    patternOptions?: MinimatchOptions;
    group: string;
    position?: number;
}
export type RanksGroups = Record<string, number>;
export interface Ranks {
    omittedTypes: string[];
    groups: RanksGroups;
    pathGroups: RanksPathGroup[];
    maxPosition: number;
}
export interface CjsRequire extends NodeJS.Require {
    <T>(id: string): T;
}
export type SetValue<T extends Set<unknown>> = T extends Set<infer U> ? U : never;
