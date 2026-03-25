import type { Angle, CssColor, Rule, CustomProperty, EnvironmentVariable, Function, Image, LengthValue, MediaQuery, Declaration, Ratio, Resolution, Selector, SupportsCondition, Time, Token, TokenOrValue, UnknownAtRule, Url, Variable, StyleRule, DeclarationBlock, ParsedComponent, Multiplier, StyleSheet, Location2 } from './ast';
import { Targets, Features } from './targets';

export * from './ast';

export { Targets, Features };

export interface TransformOptions<C extends CustomAtRules> {
  /** The filename being transformed. Used for error messages and source maps. */
  filename: string,
  /** The source code to transform. */
  code: Uint8Array,
  /** Whether to enable minification. */
  minify?: boolean,
  /** Whether to output a source map. */
  sourceMap?: boolean,
  /** An input source map to extend. */
  inputSourceMap?: string,
  /**
   * An optional project root path, used as the source root in the output source map.
   * Also used to generate relative paths for sources used in CSS module hashes.
   */
  projectRoot?: string,
  /** The browser targets for the generated code. */
  targets?: Targets,
  /** Features that should always be compiled, even when supported by targets. */
  include?: number,
  /** Features that should never be compiled, even when unsupported by targets. */
  exclude?: number,
  /** Whether to enable parsing various draft syntax. */
  drafts?: Drafts,
  /** Whether to enable various non-standard syntax. */
  nonStandard?: NonStandard,
  /** Whether to compile this file as a CSS module. */
  cssModules?: boolean | CSSModulesConfig,
  /**
   * Whether to analyze dependencies (e.g. `@import` and `url()`).
   * When enabled, `@import` rules are removed, and `url()` dependencies
   * are replaced with hashed placeholders that can be replaced with the final
   * urls later (after bundling). Dependencies are returned as part of the result.
   */
  analyzeDependencies?: boolean | DependencyOptions,
  /**
   * Replaces user action pseudo classes with class names that can be applied from JavaScript.
   * This is useful for polyfills, for example.
   */
  pseudoClasses?: PseudoClasses,
  /**
   * A list of class names, ids, and custom identifiers (e.g. @keyframes) that are known
   * to be unused. These will be removed during minification. Note that these are not
   * selectors but individual names (without any . or # prefixes).
   */
  unusedSymbols?: string[],
  /**
   * Whether to ignore invalid rules and declarations rather than erroring.
   * When enabled, warnings are returned, and the invalid rule or declaration is
   * omitted from the output code.
   */
  errorRecovery?: boolean,
  /**
   * An AST visitor object. This allows custom transforms or analysis to be implemented in JavaScript.
   * Multiple visitors can be composed into one using the `composeVisitors` function.
   * For optimal performance, visitors should be as specific as possible about what types of values
   * they care about so that JavaScript has to be called as little as possible.
   */
  visitor?: Visitor<C>,
  /**
   * Defines how to parse custom CSS at-rules. Each at-rule can have a prelude, defined using a CSS
   * [syntax string](https://drafts.css-houdini.org/css-properties-values-api/#syntax-strings), and
   * a block body. The body can be a declaration list, rule list, or style block as defined in the
   * [css spec](https://drafts.csswg.org/css-syntax/#declaration-rule-list).
   */
  customAtRules?: C
}

// This is a hack to make TS still provide autocomplete for `property` vs. just making it `string`.
type PropertyStart = '-' | '_' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
export type ReturnedDeclaration = Declaration | {
  /** The property name. */
  property: `${PropertyStart}${string}`,
  /** The raw string value for the declaration. */
  raw: string
};

export type ReturnedMediaQuery = MediaQuery | {
  /** The raw string value for the media query. */
  raw: string
};

type FindByType<Union, Name> = Union extends { type: Name } ? Union : never;
export type ReturnedRule = Rule<ReturnedDeclaration, ReturnedMediaQuery>;
type RequiredValue<Rule> = Rule extends { value: object }
  ? Rule['value'] extends StyleRule
  ? Rule & { value: Required<StyleRule> & { declarations: Required<DeclarationBlock> } }
  : Rule & { value: Required<Rule['value']> }
  : Rule;
type RuleVisitor<R = RequiredValue<Rule>> = ((rule: R) => ReturnedRule | ReturnedRule[] | void);
type MappedRuleVisitors = {
  [Name in Exclude<Rule['type'], 'unknown' | 'custom'>]?: RuleVisitor<RequiredValue<FindByType<Rule, Name>>>;
}

type UnknownVisitors<T> = {
  [name: string]: RuleVisitor<T>
}

type CustomVisitors<T extends CustomAtRules> = {
  [Name in keyof T]?: RuleVisitor<CustomAtRule<Name, T[Name]>>
};

type AnyCustomAtRule<C extends CustomAtRules> = {
  [Key in keyof C]: CustomAtRule<Key, C[Key]>
}[keyof C];

type RuleVisitors<C extends CustomAtRules> = MappedRuleVisitors & {
  unknown?: UnknownVisitors<UnknownAtRule> | Omit<RuleVisitor<UnknownAtRule>, keyof CallableFunction>,
  custom?: CustomVisitors<C> | Omit<RuleVisitor<AnyCustomAtRule<C>>, keyof CallableFunction>
};

type PreludeTypes = Exclude<ParsedComponent['type'], 'literal' | 'repeated' | 'token'>;
type SyntaxString = `<${PreludeTypes}>` | `<${PreludeTypes}>+` | `<${PreludeTypes}>#` | (string & {});
type ComponentTypes = {
  [Key in PreludeTypes as `<${Key}>`]: FindByType<ParsedComponent, Key>
};

type Repetitions = {
  [Key in PreludeTypes as `<${Key}>+` | `<${Key}>#`]: {
    type: "repeated",
    value: {
      components: FindByType<ParsedComponent, Key>[],
      multiplier: Multiplier
    }
  }
};

type MappedPrelude = ComponentTypes & Repetitions;
type MappedBody<P extends CustomAtRuleDefinition['body']> = P extends 'style-block' ? 'rule-list' : P;
interface CustomAtRule<N, R extends CustomAtRuleDefinition> {
  name: N,
  prelude: R['prelude'] extends keyof MappedPrelude ? MappedPrelude[R['prelude']] : ParsedComponent,
  body: FindByType<CustomAtRuleBody, MappedBody<R['body']>>,
  loc: Location2
}

type CustomAtRuleBody = {
  type: 'declaration-list',
  value: Required<DeclarationBlock>
} | {
  type: 'rule-list',
  value: RequiredValue<Rule>[]
};

type FindProperty<Union, Name> = Union extends { property: Name } ? Union : never;
type DeclarationVisitor<P = Declaration> = ((property: P) => ReturnedDeclaration | ReturnedDeclaration[] | void);
type MappedDeclarationVisitors = {
  [Name in Exclude<Declaration['property'], 'unparsed' | 'custom'>]?: DeclarationVisitor<FindProperty<Declaration, Name> | FindProperty<Declaration, 'unparsed'>>;
}

type CustomPropertyVisitors = {
  [name: string]: DeclarationVisitor<CustomProperty>
}

type DeclarationVisitors = MappedDeclarationVisitors & {
  custom?: CustomPropertyVisitors | DeclarationVisitor<CustomProperty>
}

interface RawValue {
  /** A raw string value which will be parsed like CSS. */
  raw: string
}

type TokenReturnValue = TokenOrValue | TokenOrValue[] | RawValue | void;
type TokenVisitor = (token: Token) => TokenReturnValue;
type VisitableTokenTypes = 'ident' | 'at-keyword' | 'hash' | 'id-hash' | 'string' | 'number' | 'percentage' | 'dimension';
type TokenVisitors = {
  [Name in VisitableTokenTypes]?: (token: FindByType<Token, Name>) => TokenReturnValue;
}

type FunctionVisitor = (fn: Function) => TokenReturnValue;
type EnvironmentVariableVisitor = (env: EnvironmentVariable) => TokenReturnValue;
type EnvironmentVariableVisitors = {
  [name: string]: EnvironmentVariableVisitor
};

export interface Visitor<C extends CustomAtRules> {
  StyleSheet?(stylesheet: StyleSheet): StyleSheet<ReturnedDeclaration, ReturnedMediaQuery> | void;
  StyleSheetExit?(stylesheet: StyleSheet): StyleSheet<ReturnedDeclaration, ReturnedMediaQuery> | void;
  Rule?: RuleVisitor | RuleVisitors<C>;
  RuleExit?: RuleVisitor | RuleVisitors<C>;
  Declaration?: DeclarationVisitor | DeclarationVisitors;
  DeclarationExit?: DeclarationVisitor | DeclarationVisitors;
  Url?(url: Url): Url | void;
  Color?(color: CssColor): CssColor | void;
  Image?(image: Image): Image | void;
  ImageExit?(image: Image): Image | void;
  Length?(length: LengthValue): LengthValue | void;
  Angle?(angle: Angle): Angle | void;
  Ratio?(ratio: Ratio): Ratio | void;
  Resolution?(resolution: Resolution): Resolution | void;
  Time?(time: Time): Time | void;
  CustomIdent?(ident: string): string | void;
  DashedIdent?(ident: string): string | void;
  MediaQuery?(query: MediaQuery): ReturnedMediaQuery | ReturnedMediaQuery[] | void;
  MediaQueryExit?(query: MediaQuery): ReturnedMediaQuery | ReturnedMediaQuery[] | void;
  SupportsCondition?(condition: SupportsCondition): SupportsCondition;
  SupportsConditionExit?(condition: SupportsCondition): SupportsCondition;
  Selector?(selector: Selector): Selector | Selector[] | void;
  Token?: TokenVisitor | TokenVisitors;
  Function?: FunctionVisitor | { [name: string]: FunctionVisitor };
  FunctionExit?: FunctionVisitor | { [name: string]: FunctionVisitor };
  Variable?(variable: Variable): TokenReturnValue;
  VariableExit?(variable: Variable): TokenReturnValue;
  EnvironmentVariable?: EnvironmentVariableVisitor | EnvironmentVariableVisitors;
  EnvironmentVariableExit?: EnvironmentVariableVisitor | EnvironmentVariableVisitors;
}

export interface CustomAtRules {
  [name: string]: CustomAtRuleDefinition
}

export interface CustomAtRuleDefinition {
  /**
   * Defines the syntax for a custom at-rule prelude. The value should be a
   * CSS [syntax string](https://drafts.css-houdini.org/css-properties-values-api/#syntax-strings)
   * representing the types of values that are accepted. This property may be omitted or
   * set to null to indicate that no prelude is accepted.
   */
  prelude?: SyntaxString | null,
  /**
   * Defines the type of body contained within the at-rule block.
   *   - declaration-list: A CSS declaration list, as in a style rule.
   *   - rule-list: A list of CSS rules, as supported within a non-nested
   *       at-rule such as `@media` or `@supports`.
   *   - style-block: Both a declaration list and rule list, as accepted within
   *       a nested at-rule within a style rule (e.g. `@media` inside a style rule
   *       with directly nested declarations).
   */
  body?: 'declaration-list' | 'rule-list' | 'style-block' | null
}

export interface DependencyOptions {
  /** Whether to preserve `@import` rules rather than removing them. */
  preserveImports?: boolean
}

export type BundleOptions<C extends CustomAtRules> = Omit<TransformOptions<C>, 'code'>;

export interface BundleAsyncOptions<C extends CustomAtRules> extends BundleOptions<C> {
  resolver?: Resolver;
}

/** Custom resolver to use when loading CSS files. */
export interface Resolver {
  /** Read the given file and return its contents as a string. */
  read?: (file: string) => string | Promise<string>;

  /**
   * Resolve the given CSS import specifier from the provided originating file to a
   * path which gets passed to `read()`.
   */
  resolve?: (specifier: string, originatingFile: string) => string | Promise<string>;
}

export interface Drafts {
  /** Whether to enable @custom-media rules. */
  customMedia?: boolean
}

export interface NonStandard {
  /** Whether to enable the non-standard >>> and /deep/ selector combinators used by Angular and Vue. */
  deepSelectorCombinator?: boolean
}

export interface PseudoClasses {
  hover?: string,
  active?: string,
  focus?: string,
  focusVisible?: string,
  focusWithin?: string
}

export interface TransformResult {
  /** The transformed code. */
  code: Uint8Array,
  /** The generated source map, if enabled. */
  map: Uint8Array | void,
  /** CSS module exports, if enabled. */
  exports: CSSModuleExports | void,
  /** CSS module references, if `dashedIdents` is enabled. */
  references: CSSModuleReferences,
  /** `@import` and `url()` dependencies, if enabled. */
  dependencies: Dependency[] | void,
  /** Warnings that occurred during compilation. */
  warnings: Warning[]
}

export interface Warning {
  message: string,
  type: string,
  value?: any,
  loc: ErrorLocation
}

export interface CSSModulesConfig {
  /** The pattern to use when renaming class names and other identifiers. Default is `[hash]_[local]`. */
  pattern?: string,
  /** Whether to rename dashed identifiers, e.g. custom properties. */
  dashedIdents?: boolean,
  /** Whether to enable hashing for `@keyframes`. */
  animation?: boolean,
  /** Whether to enable hashing for CSS grid identifiers. */
  grid?: boolean,
  /** Whether to enable hashing for `@container` names. */
  container?: boolean,
  /** Whether to enable hashing for custom identifiers. */
  customIdents?: boolean,
  /** Whether to require at least one class or id selector in each rule. */
  pure?: boolean
}

export type CSSModuleExports = {
  /** Maps exported (i.e. original) names to local names. */
  [name: string]: CSSModuleExport
};

export interface CSSModuleExport {
  /** The local (compiled) name for this export. */
  name: string,
  /** Whether the export is referenced in this file. */
  isReferenced: boolean,
  /** Other names that are composed by this export. */
  composes: CSSModuleReference[]
}

export type CSSModuleReferences = {
  /** Maps placeholder names to references. */
  [name: string]: DependencyCSSModuleReference,
};

export type CSSModuleReference = LocalCSSModuleReference | GlobalCSSModuleReference | DependencyCSSModuleReference;

export interface LocalCSSModuleReference {
  type: 'local',
  /** The local (compiled) name for the reference. */
  name: string,
}

export interface GlobalCSSModuleReference {
  type: 'global',
  /** The referenced global name. */
  name: string,
}

export interface DependencyCSSModuleReference {
  type: 'dependency',
  /** The name to reference within the dependency. */
  name: string,
  /** The dependency specifier for the referenced file. */
  specifier: string
}

export type Dependency = ImportDependency | UrlDependency;

export interface ImportDependency {
  type: 'import',
  /** The url of the `@import` dependency. */
  url: string,
  /** The media query for the `@import` rule. */
  media: string | null,
  /** The `supports()` query for the `@import` rule. */
  supports: string | null,
  /** The source location where the `@import` rule was found. */
  loc: SourceLocation,
  /** The placeholder that the import was replaced with. */
  placeholder: string
}

export interface UrlDependency {
  type: 'url',
  /** The url of the dependency. */
  url: string,
  /** The source location where the `url()` was found. */
  loc: SourceLocation,
  /** The placeholder that the url was replaced with. */
  placeholder: string
}

export interface SourceLocation {
  /** The file path in which the dependency exists. */
  filePath: string,
  /** The start location of the dependency. */
  start: Location,
  /** The end location (inclusive) of the dependency. */
  end: Location
}

export interface Location {
  /** The line number (1-based). */
  line: number,
  /** The column number (0-based). */
  column: number
}

export interface ErrorLocation extends Location {
  filename: string
}

/**
 * Compiles a CSS file, including optionally minifying and lowering syntax to the given
 * targets. A source map may also be generated, but this is not enabled by default.
 */
export declare function transform<C extends CustomAtRules>(options: TransformOptions<C>): TransformResult;

export interface TransformAttributeOptions {
  /** The filename in which the style attribute appeared. Used for error messages and dependencies. */
  filename?: string,
  /** The source code to transform. */
  code: Uint8Array,
  /** Whether to enable minification. */
  minify?: boolean,
  /** The browser targets for the generated code. */
  targets?: Targets,
  /**
   * Whether to analyze `url()` dependencies.
   * When enabled, `url()` dependencies are replaced with hashed placeholders
   * that can be replaced with the final urls later (after bundling).
   * Dependencies are returned as part of the result.
   */
  analyzeDependencies?: boolean,
  /**
   * Whether to ignore invalid rules and declarations rather than erroring.
   * When enabled, warnings are returned, and the invalid rule or declaration is
   * omitted from the output code.
   */
  errorRecovery?: boolean,
  /**
   * An AST visitor object. This allows custom transforms or analysis to be implemented in JavaScript.
   * Multiple visitors can be composed into one using the `composeVisitors` function.
   * For optimal performance, visitors should be as specific as possible about what types of values
   * they care about so that JavaScript has to be called as little as possible.
   */
  visitor?: Visitor<never>
}

export interface TransformAttributeResult {
  /** The transformed code. */
  code: Uint8Array,
  /** `@import` and `url()` dependencies, if enabled. */
  dependencies: Dependency[] | void,
  /** Warnings that occurred during compilation. */
  warnings: Warning[]
}

/**
 * Compiles a single CSS declaration list, such as an inline style attribute in HTML.
 */
export declare function transformStyleAttribute(options: TransformAttributeOptions): TransformAttributeResult;

/**
 * Converts a browserslist result into targets that can be passed to lightningcss.
 * @param browserslist the result of calling `browserslist`
 */
export declare function browserslistToTargets(browserslist: string[]): Targets;

/**
 * Bundles a CSS file and its dependencies, inlining @import rules.
 */
export declare function bundle<C extends CustomAtRules>(options: BundleOptions<C>): TransformResult;

/**
 * Bundles a CSS file and its dependencies asynchronously, inlining @import rules.
 */
export declare function bundleAsync<C extends CustomAtRules>(options: BundleAsyncOptions<C>): Promise<TransformResult>;

/**
 * Composes multiple visitor objects into a single one.
 */
export declare function composeVisitors<C extends CustomAtRules>(visitors: Visitor<C>[]): Visitor<C>;
