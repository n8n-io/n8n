import { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { ChildContext, DocStyle, FileExtension, ImportSettings, LegacyImportResolver, LegacyImportResolver as ImportResolver, LegacyResolver, LegacyResolverName, LegacyResolverName as ResolverName, LegacyResolverObject, LegacyResolverObject as ResolverObject, LegacyResolverRecord, LegacyResolverRecord as ResolverRecord, LegacyResolverResolve, LegacyResolverResolve as ResolverResolve, LegacyResolverResolveImport, LegacyResolverResolveImport as ResolverResolveImport, NewResolver, NewResolverResolve, NodeResolverOptions, PluginName, PluginSettings, PluginSettings as PluginSettings$1, ResolvedResult, Resolver, ResultFound, ResultNotFound, RuleContext, TsResolverOptions, WebpackResolverOptions, WithPluginName } from "eslint-import-context";
import { MinimatchOptions } from "minimatch";
import { NapiResolveOptions } from "unrs-resolver";

//#region src/utils/create-rule.d.ts

interface ImportXPluginDocs {
  /** The category the rule falls under */
  category?: string;
  recommended?: true;
}
//#endregion
//#region src/types.d.ts
type ImportType = ImportType$1 | 'object' | 'type';
type Arrayable<T> = T | readonly T[];
interface PluginConfig extends TSESLint.ClassicConfig.Config {
  plugins?: [PluginName];
  settings?: PluginSettings$1;
  rules?: Record<`${PluginName}/${string}`, TSESLint.ClassicConfig.RuleEntry>;
}
interface PluginFlatBaseConfig extends TSESLint.FlatConfig.Config {
  settings?: PluginSettings$1;
  rules?: Record<`${PluginName}/${string}`, TSESLint.FlatConfig.RuleEntry>;
}
interface PluginFlatConfig extends PluginFlatBaseConfig {
  name?: `${PluginName}/${string}`;
}
interface ParseError extends Error {
  lineNumber: number;
  column: number;
}
interface CustomESTreeNode<Type extends string> extends Omit<TSESTree.BaseNode, 'type'> {
  type: Type;
}
type ExportDefaultSpecifier = CustomESTreeNode<'ExportDefaultSpecifier'>;
interface ExportNamespaceSpecifier extends CustomESTreeNode<'ExportNamespaceSpecifier'> {
  exported: TSESTree.Identifier;
}
interface PathGroup {
  pattern: string;
  group: ImportType;
  patternOptions?: MinimatchOptions;
  position?: 'before' | 'after';
}
type ExportAndImportKind = 'value' | 'type';
type NewLinesOptions = 'always' | 'always-and-inside-groups' | 'ignore' | 'never';
type NamedTypes = 'mixed' | 'types-first' | 'types-last';
interface NamedOptions {
  enabled?: boolean;
  import?: boolean;
  export?: boolean;
  require?: boolean;
  cjsExports?: boolean;
  types?: NamedTypes;
}
interface AlphabetizeOptions {
  caseInsensitive: boolean;
  order: 'ignore' | 'asc' | 'desc';
  orderImportKind: 'ignore' | 'asc' | 'desc';
}
type ImportEntryType = 'import:object' | 'import' | 'require' | 'export';
type LiteralNodeValue = string | number | bigint | boolean | RegExp | null;
interface ImportEntry {
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
interface ImportEntryWithRank extends ImportEntry {
  rank: number;
  isMultiline?: boolean;
}
interface RanksPathGroup {
  pattern: string;
  patternOptions?: MinimatchOptions;
  group: string;
  position?: number;
}
type RanksGroups = Record<string, number>;
interface Ranks {
  omittedTypes: string[];
  groups: RanksGroups;
  pathGroups: RanksPathGroup[];
  maxPosition: number;
}
interface CjsRequire extends NodeJS.Require {
  <T>(id: string): T;
}
type SetValue<T extends Set<unknown>> = T extends Set<infer U> ? U : never;
//#endregion
//#region src/utils/import-type.d.ts
/**
 * Returns the type of the module.
 *
 * @param name The name of the module to check
 * @param context The context of the rule
 * @returns The type of the module
 */
declare function importType(name: LiteralNodeValue, context: RuleContext): "absolute" | "builtin" | "internal" | "parent" | "index" | "sibling" | "external" | "unknown";
type ImportType$1 = ReturnType<typeof importType>;
//#endregion
//#region src/utils/module-visitor.d.ts
interface ModuleOptions {
  amd?: boolean;
  commonjs?: boolean;
  esmodule?: boolean;
  ignore?: string[];
}
/**
 * Returns an object of node visitors that will call 'visitor' with every
 * discovered module path.
 */

//#endregion
//#region src/utils/resolve.d.ts
declare function importXResolverCompat(resolver: LegacyResolver | NewResolver, resolverOptions?: unknown): NewResolver;
//#endregion
//#region src/rules/no-unresolved.d.ts
type Options$25 = ModuleOptions & {
  caseSensitive?: boolean;
  caseSensitiveStrict?: boolean;
};
type MessageId$11 = 'unresolved' | 'casingMismatch';
//#endregion
//#region src/rules/named.d.ts
type MessageId$10 = 'notFound' | 'notFoundDeep';
//#endregion
//#region src/rules/namespace.d.ts
type MessageId$9 = 'noNamesFound' | 'computedReference' | 'namespaceMember' | 'topLevelNames' | 'notFoundInNamespace' | 'notFoundInNamespaceDeep';
interface Options$24 {
  allowComputed?: boolean;
}
//#endregion
//#region src/rules/no-namespace.d.ts
interface Options$23 {
  ignore?: string[];
}
//#endregion
//#region src/rules/export.d.ts
type MessageId$8 = 'noNamed' | 'multiDefault' | 'multiNamed';
//#endregion
//#region src/rules/extensions.d.ts
declare const modifierValues: readonly ["always", "ignorePackages", "never"];
type Modifier = (typeof modifierValues)[number];
type ModifierByFileExtension = Partial<Record<string, Modifier>>;
interface OptionsItemWithPatternProperty {
  ignorePackages?: boolean;
  checkTypeImports?: boolean;
  pattern: ModifierByFileExtension;
  pathGroupOverrides?: PathGroupOverride[];
  fix?: boolean;
}
interface PathGroupOverride {
  pattern: string;
  patternOptions?: Record<string, MinimatchOptions>;
  action: 'enforce' | 'ignore';
}
interface OptionsItemWithoutPatternProperty {
  ignorePackages?: boolean;
  checkTypeImports?: boolean;
  pathGroupOverrides?: PathGroupOverride[];
  fix?: boolean;
}
type Options$22 = [] | [OptionsItemWithoutPatternProperty] | [OptionsItemWithPatternProperty] | [Modifier] | [Modifier, OptionsItemWithoutPatternProperty] | [Modifier, OptionsItemWithPatternProperty] | [Modifier, ModifierByFileExtension] | [ModifierByFileExtension];
type MessageId$7 = 'missing' | 'missingKnown' | 'unexpected' | 'addMissing' | 'removeUnexpected';
//#endregion
//#region src/rules/no-restricted-paths.d.ts
interface Options$21 {
  basePath?: string;
  zones?: Array<{
    from: Arrayable<string>;
    target: Arrayable<string>;
    message?: string;
    except?: string[];
  }>;
}
type MessageId$6 = 'path' | 'mixedGlob' | 'glob' | 'zone';
//#endregion
//#region src/rules/no-internal-modules.d.ts
interface Options$20 {
  allow?: string[];
  forbid?: string[];
}
//#endregion
//#region src/rules/group-exports.d.ts
type MessageId$5 = 'ExportNamedDeclaration' | 'AssignmentExpression';
//#endregion
//#region src/rules/consistent-type-specifier-style.d.ts
type Options$19 = 'prefer-inline' | 'prefer-top-level';
//#endregion
//#region src/rules/no-cycle.d.ts
interface Options$18 extends ModuleOptions {
  allowUnsafeDynamicCyclicDependency?: boolean;
  ignoreExternal?: boolean;
  maxDepth?: number | '∞';
}
type MessageId$4 = 'cycle' | 'cycleSource';
//#endregion
//#region src/rules/no-anonymous-default-export.d.ts
interface Options$17 {
  allowArray?: boolean;
  allowArrowFunction?: boolean;
  allowCallExpression?: boolean;
  allowAnonymousClass?: boolean;
  allowAnonymousFunction?: boolean;
  allowLiteral?: boolean;
  allowObject?: boolean;
  allowNew?: boolean;
}
//#endregion
//#region src/rules/no-rename-default.d.ts
type Options$16 = ModuleOptions & {
  preventRenamingBindings?: boolean;
};
//#endregion
//#region src/rules/no-unused-modules.d.ts
interface Options$15 {
  src?: string[];
  ignoreExports?: string[];
  missingExports?: true;
  unusedExports?: boolean;
  ignoreUnusedTypeExports?: boolean;
}
//#endregion
//#region src/rules/no-commonjs.d.ts
interface NormalizedOptions {
  allowPrimitiveModules?: boolean;
  allowRequire?: boolean;
  allowConditionalRequire?: boolean;
}
type Options$14 = 'allow-primitive-modules' | NormalizedOptions;
//#endregion
//#region src/rules/no-duplicates.d.ts
interface Options$13 {
  considerQueryString?: boolean;
  'prefer-inline'?: boolean;
}
//#endregion
//#region src/rules/first.d.ts
type Options$12 = 'absolute-first' | 'disable-absolute-first';
type MessageId$3 = 'absolute' | 'order';
//#endregion
//#region src/rules/max-dependencies.d.ts
interface Options$11 {
  ignoreTypeImports?: boolean;
  max?: number;
}
//#endregion
//#region src/rules/no-extraneous-dependencies.d.ts
interface Options$10 {
  packageDir?: string | string[];
  devDependencies?: boolean | string[];
  optionalDependencies?: boolean | string[];
  peerDependencies?: boolean | string[];
  bundledDependencies?: boolean | string[];
  includeInternal?: boolean;
  includeTypes?: boolean;
  whitelist?: string[];
}
type MessageId$2 = 'pkgNotFound' | 'pkgUnparsable' | 'devDep' | 'optDep' | 'missing';
//#endregion
//#region src/rules/no-nodejs-modules.d.ts
interface Options$9 {
  allow?: string[];
}
//#endregion
//#region src/rules/order.d.ts
interface Options$8 {
  'newlines-between'?: NewLinesOptions;
  'newlines-between-types'?: NewLinesOptions;
  named?: boolean | NamedOptions;
  alphabetize?: Partial<AlphabetizeOptions>;
  consolidateIslands?: 'inside-groups' | 'never';
  distinctGroup?: boolean;
  groups?: ReadonlyArray<Arrayable<ImportType>>;
  pathGroupsExcludedImportTypes?: ImportType[];
  pathGroups?: PathGroup[];
  sortTypesGroup?: boolean;
  warnOnUnassignedImports?: boolean;
}
//#endregion
//#region src/rules/newline-after-import.d.ts
interface Options$7 {
  count?: number;
  exactCount?: boolean;
  considerComments?: boolean;
}
//#endregion
//#region src/rules/prefer-default-export.d.ts
interface Options$6 {
  target?: 'single' | 'any';
}
//#endregion
//#region src/rules/no-dynamic-require.d.ts
interface Options$5 {
  esmodule?: boolean;
}
type MessageId$1 = 'import' | 'require';
//#endregion
//#region src/rules/no-unassigned-import.d.ts
interface Options$4 {
  allow?: string[];
}
//#endregion
//#region src/rules/no-useless-path-segments.d.ts
interface Options$3 extends ModuleOptions {
  noUselessIndex?: boolean;
}
//#endregion
//#region src/rules/dynamic-import-chunkname.d.ts
interface Options$2 {
  allowEmpty?: boolean;
  importFunctions?: readonly string[];
  webpackChunknameFormat?: string;
}
type MessageId = 'leadingComment' | 'blockComment' | 'paddedSpaces' | 'webpackComment' | 'chunknameFormat' | 'webpackEagerModeNoChunkName' | 'webpackRemoveEagerMode' | 'webpackRemoveChunkName';
//#endregion
//#region src/rules/no-import-module-exports.d.ts
interface Options$1 {
  exceptions?: string[];
}
//#endregion
//#region src/meta.d.ts
declare const meta$1: {
  name: string;
  version: string;
};
//#endregion
//#region src/node-resolver.d.ts
declare function createNodeResolver({
  extensions,
  conditionNames,
  mainFields,
  ...restOptions
}?: NapiResolveOptions): NewResolver;
//#endregion
//#region src/require.d.ts
declare const cjsRequire: CjsRequire;
//#endregion
//#region src/index.d.ts
declare const rules: {
  'no-unresolved': TSESLint.RuleModule<MessageId$11, [Options$25?], ImportXPluginDocs, TSESLint.RuleListener>;
  named: TSESLint.RuleModule<MessageId$10, [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
  default: TSESLint.RuleModule<"noDefaultExport", [], ImportXPluginDocs, TSESLint.RuleListener>;
  namespace: TSESLint.RuleModule<MessageId$9, [Options$24], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-namespace': TSESLint.RuleModule<"noNamespace", [Options$23?], ImportXPluginDocs, TSESLint.RuleListener>;
  export: TSESLint.RuleModule<MessageId$8, [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-mutable-exports': TSESLint.RuleModule<"noMutable", [], ImportXPluginDocs, TSESLint.RuleListener>;
  extensions: TSESLint.RuleModule<MessageId$7, Options$22, ImportXPluginDocs, TSESLint.RuleListener>;
  'no-restricted-paths': TSESLint.RuleModule<MessageId$6, [Options$21?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-internal-modules': TSESLint.RuleModule<"noAllowed", [Options$20?], ImportXPluginDocs, TSESLint.RuleListener>;
  'group-exports': TSESLint.RuleModule<MessageId$5, [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-relative-packages': TSESLint.RuleModule<"noAllowed", [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-relative-parent-imports': TSESLint.RuleModule<"noAllowed", [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
  'consistent-type-specifier-style': TSESLint.RuleModule<"inline" | "topLevel", [Options$19?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-self-import': TSESLint.RuleModule<"self", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-cycle': TSESLint.RuleModule<MessageId$4, [Options$18?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-named-default': TSESLint.RuleModule<"default", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-named-as-default': TSESLint.RuleModule<"default", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-named-as-default-member': TSESLint.RuleModule<"member", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-anonymous-default-export': TSESLint.RuleModule<"assign" | "anonymous", [Options$17?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-rename-default': TSESLint.RuleModule<"renameDefault", [Options$16?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-unused-modules': TSESLint.RuleModule<"notFound" | "unused", Options$15[], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-commonjs': TSESLint.RuleModule<"export" | "import", [Options$14?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-amd': TSESLint.RuleModule<"amd", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-duplicates': TSESLint.RuleModule<"duplicate", [Options$13?], ImportXPluginDocs, TSESLint.RuleListener>;
  first: TSESLint.RuleModule<MessageId$3, [Options$12?], ImportXPluginDocs, TSESLint.RuleListener>;
  'max-dependencies': TSESLint.RuleModule<"max", [Options$11?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-extraneous-dependencies': TSESLint.RuleModule<MessageId$2, [Options$10?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-absolute-path': TSESLint.RuleModule<"absolute", [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-nodejs-modules': TSESLint.RuleModule<"builtin", [Options$9?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-webpack-loader-syntax': TSESLint.RuleModule<"unexpected", [], ImportXPluginDocs, TSESLint.RuleListener>;
  order: TSESLint.RuleModule<"order" | "error" | "noLineWithinGroup" | "noLineBetweenGroups" | "oneLineBetweenGroups" | "oneLineBetweenTheMultiLineImport" | "oneLineBetweenThisMultiLineImport" | "noLineBetweenSingleLineImport", [Options$8?], ImportXPluginDocs, TSESLint.RuleListener>;
  'newline-after-import': TSESLint.RuleModule<"newline", [Options$7?], ImportXPluginDocs, TSESLint.RuleListener>;
  'prefer-default-export': TSESLint.RuleModule<"any" | "single", [Options$6?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-default-export': TSESLint.RuleModule<"preferNamed" | "noAliasDefault", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-named-export': TSESLint.RuleModule<"noAllowed", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-dynamic-require': TSESLint.RuleModule<MessageId$1, [Options$5?], ImportXPluginDocs, TSESLint.RuleListener>;
  unambiguous: TSESLint.RuleModule<"module", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-unassigned-import': TSESLint.RuleModule<"unassigned", [Options$4?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-useless-path-segments': TSESLint.RuleModule<"useless", [Options$3?], ImportXPluginDocs, TSESLint.RuleListener>;
  'dynamic-import-chunkname': TSESLint.RuleModule<MessageId, [Options$2?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-import-module-exports': TSESLint.RuleModule<"notAllowed", [Options$1?], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-empty-named-blocks': TSESLint.RuleModule<"unused" | "emptyNamed" | "emptyImport", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'exports-last': TSESLint.RuleModule<"end", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'no-deprecated': TSESLint.RuleModule<"deprecated" | "deprecatedDesc", [], ImportXPluginDocs, TSESLint.RuleListener>;
  'imports-first': TSESLint.RuleModule<MessageId$3, [Options$12?], ImportXPluginDocs, TSESLint.RuleListener>;
};
declare const plugin_: {
  meta: {
    name: string;
    version: string;
  };
  rules: {
    'no-unresolved': TSESLint.RuleModule<MessageId$11, [Options$25?], ImportXPluginDocs, TSESLint.RuleListener>;
    named: TSESLint.RuleModule<MessageId$10, [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
    default: TSESLint.RuleModule<"noDefaultExport", [], ImportXPluginDocs, TSESLint.RuleListener>;
    namespace: TSESLint.RuleModule<MessageId$9, [Options$24], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-namespace': TSESLint.RuleModule<"noNamespace", [Options$23?], ImportXPluginDocs, TSESLint.RuleListener>;
    export: TSESLint.RuleModule<MessageId$8, [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-mutable-exports': TSESLint.RuleModule<"noMutable", [], ImportXPluginDocs, TSESLint.RuleListener>;
    extensions: TSESLint.RuleModule<MessageId$7, Options$22, ImportXPluginDocs, TSESLint.RuleListener>;
    'no-restricted-paths': TSESLint.RuleModule<MessageId$6, [Options$21?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-internal-modules': TSESLint.RuleModule<"noAllowed", [Options$20?], ImportXPluginDocs, TSESLint.RuleListener>;
    'group-exports': TSESLint.RuleModule<MessageId$5, [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-relative-packages': TSESLint.RuleModule<"noAllowed", [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-relative-parent-imports': TSESLint.RuleModule<"noAllowed", [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
    'consistent-type-specifier-style': TSESLint.RuleModule<"inline" | "topLevel", [Options$19?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-self-import': TSESLint.RuleModule<"self", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-cycle': TSESLint.RuleModule<MessageId$4, [Options$18?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-default': TSESLint.RuleModule<"default", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-as-default': TSESLint.RuleModule<"default", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-as-default-member': TSESLint.RuleModule<"member", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-anonymous-default-export': TSESLint.RuleModule<"assign" | "anonymous", [Options$17?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-rename-default': TSESLint.RuleModule<"renameDefault", [Options$16?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-unused-modules': TSESLint.RuleModule<"notFound" | "unused", Options$15[], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-commonjs': TSESLint.RuleModule<"export" | "import", [Options$14?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-amd': TSESLint.RuleModule<"amd", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-duplicates': TSESLint.RuleModule<"duplicate", [Options$13?], ImportXPluginDocs, TSESLint.RuleListener>;
    first: TSESLint.RuleModule<MessageId$3, [Options$12?], ImportXPluginDocs, TSESLint.RuleListener>;
    'max-dependencies': TSESLint.RuleModule<"max", [Options$11?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-extraneous-dependencies': TSESLint.RuleModule<MessageId$2, [Options$10?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-absolute-path': TSESLint.RuleModule<"absolute", [ModuleOptions?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-nodejs-modules': TSESLint.RuleModule<"builtin", [Options$9?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-webpack-loader-syntax': TSESLint.RuleModule<"unexpected", [], ImportXPluginDocs, TSESLint.RuleListener>;
    order: TSESLint.RuleModule<"order" | "error" | "noLineWithinGroup" | "noLineBetweenGroups" | "oneLineBetweenGroups" | "oneLineBetweenTheMultiLineImport" | "oneLineBetweenThisMultiLineImport" | "noLineBetweenSingleLineImport", [Options$8?], ImportXPluginDocs, TSESLint.RuleListener>;
    'newline-after-import': TSESLint.RuleModule<"newline", [Options$7?], ImportXPluginDocs, TSESLint.RuleListener>;
    'prefer-default-export': TSESLint.RuleModule<"any" | "single", [Options$6?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-default-export': TSESLint.RuleModule<"preferNamed" | "noAliasDefault", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-export': TSESLint.RuleModule<"noAllowed", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-dynamic-require': TSESLint.RuleModule<MessageId$1, [Options$5?], ImportXPluginDocs, TSESLint.RuleListener>;
    unambiguous: TSESLint.RuleModule<"module", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-unassigned-import': TSESLint.RuleModule<"unassigned", [Options$4?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-useless-path-segments': TSESLint.RuleModule<"useless", [Options$3?], ImportXPluginDocs, TSESLint.RuleListener>;
    'dynamic-import-chunkname': TSESLint.RuleModule<MessageId, [Options$2?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-import-module-exports': TSESLint.RuleModule<"notAllowed", [Options$1?], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-empty-named-blocks': TSESLint.RuleModule<"unused" | "emptyNamed" | "emptyImport", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'exports-last': TSESLint.RuleModule<"end", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'no-deprecated': TSESLint.RuleModule<"deprecated" | "deprecatedDesc", [], ImportXPluginDocs, TSESLint.RuleListener>;
    'imports-first': TSESLint.RuleModule<MessageId$3, [Options$12?], ImportXPluginDocs, TSESLint.RuleListener>;
  };
  cjsRequire: CjsRequire;
  importXResolverCompat: typeof importXResolverCompat;
  createNodeResolver: typeof createNodeResolver;
};
declare const flatConfigs: {
  recommended: PluginFlatConfig;
  errors: PluginFlatConfig;
  warnings: PluginFlatConfig;
  'stage-0': PluginFlatConfig;
  react: PluginFlatConfig;
  'react-native': PluginFlatConfig;
  electron: PluginFlatConfig;
  typescript: PluginFlatConfig;
};
declare const configs: {
  recommended: {
    plugins: ["import-x"];
    rules: {
      'import-x/no-unresolved': "error";
      'import-x/named': "error";
      'import-x/namespace': "error";
      'import-x/default': "error";
      'import-x/export': "error";
      'import-x/no-named-as-default': "warn";
      'import-x/no-named-as-default-member': "warn";
      'import-x/no-duplicates': "warn";
    };
    parserOptions: {
      sourceType: "module";
      ecmaVersion: 2018;
    };
  };
  errors: {
    plugins: ["import-x"];
    rules: {
      'import-x/no-unresolved': 2;
      'import-x/named': 2;
      'import-x/namespace': 2;
      'import-x/default': 2;
      'import-x/export': 2;
    };
  };
  warnings: {
    plugins: ["import-x"];
    rules: {
      'import-x/no-named-as-default': 1;
      'import-x/no-named-as-default-member': 1;
      'import-x/no-rename-default': 1;
      'import-x/no-duplicates': 1;
    };
  };
  'stage-0': PluginConfig;
  react: {
    settings: {
      'import-x/extensions': (".js" | ".jsx")[];
    };
    parserOptions: {
      ecmaFeatures: {
        jsx: true;
      };
    };
  };
  'react-native': {
    settings: {
      'import-x/resolver': {
        node: {
          extensions: string[];
        };
      };
    };
  };
  electron: {
    settings: {
      'import-x/core-modules': string[];
    };
  };
  typescript: {
    settings: {
      'import-x/extensions': readonly [".ts", ".tsx", ".cts", ".mts", ".js", ".jsx", ".cjs", ".mjs"];
      'import-x/external-module-folders': string[];
      'import-x/parsers': {
        '@typescript-eslint/parser': (".ts" | ".tsx" | ".cts" | ".mts")[];
      };
      'import-x/resolver': {
        typescript: true;
      };
    };
    rules: {
      'import-x/named': "off";
    };
  };
  'flat/recommended': PluginFlatConfig;
  'flat/errors': PluginFlatConfig;
  'flat/warnings': PluginFlatConfig;
  'flat/stage-0': PluginFlatConfig;
  'flat/react': PluginFlatConfig;
  'flat/react-native': PluginFlatConfig;
  'flat/electron': PluginFlatConfig;
  'flat/typescript': PluginFlatConfig;
};
declare const plugin: typeof plugin_ & {
  flatConfigs: typeof flatConfigs;
  configs: typeof configs;
};
//#endregion
export { AlphabetizeOptions, Arrayable, ChildContext, CjsRequire, CustomESTreeNode, DocStyle, ExportAndImportKind, ExportDefaultSpecifier, ExportNamespaceSpecifier, FileExtension, ImportEntry, ImportEntryType, ImportEntryWithRank, ImportResolver, ImportSettings, ImportType, LegacyImportResolver, LegacyResolver, LegacyResolverName, LegacyResolverObject, LegacyResolverRecord, LegacyResolverResolve, LegacyResolverResolveImport, LiteralNodeValue, NamedOptions, NamedTypes, NewLinesOptions, NewResolver, NewResolverResolve, NodeResolverOptions, ParseError, PathGroup, PluginConfig, PluginFlatBaseConfig, PluginFlatConfig, PluginSettings, Ranks, RanksGroups, RanksPathGroup, ResolvedResult, Resolver, ResolverName, ResolverObject, ResolverRecord, ResolverResolve, ResolverResolveImport, ResultFound, ResultNotFound, RuleContext, SetValue, TsResolverOptions, WebpackResolverOptions, WithPluginName, cjsRequire, configs, createNodeResolver, plugin as default, plugin as importX, flatConfigs, importXResolverCompat, meta$1 as meta, rules };