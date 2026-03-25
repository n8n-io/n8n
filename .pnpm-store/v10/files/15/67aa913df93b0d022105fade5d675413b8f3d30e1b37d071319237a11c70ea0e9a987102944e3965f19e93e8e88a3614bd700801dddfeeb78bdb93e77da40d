declare module 'regexp-tree/ast' {
  export interface AstClassMap {
    'RegExp': AstRegExp;
    'Disjunction': Disjunction;
    'Alternative': Alternative;
    'Assertion': Assertion;
    'Char': Char;
    'CharacterClass': CharacterClass;
    'ClassRange': ClassRange;
    'Backreference': Backreference;
    'Group': Group;
    'Repetition': Repetition;
    'Quantifier': Quantifier;
  }

  export type AstClass = keyof AstClassMap;
  export type AstNode = AstClassMap[AstClass];
  export type AstNodeLocation = {
    line: number;
    column: number;
    offset: number;
  };

  export interface Base<T extends AstClass> {
    type: T;
    loc?: {
      source: string;
      start: AstNodeLocation;
      end: AstNodeLocation;
    };
  }

  export interface SimpleChar extends Base<'Char'> {
    value: string;
    kind: 'simple';
    escaped?: true;
    codePoint: number;
  }

  export interface SpecialChar extends Base<'Char'> {
    value: string;
    kind: 'meta' | 'control' | 'hex' | 'decimal' | 'oct' | 'unicode';
    codePoint: number;
  }

  export type Char =
    | SimpleChar
    | SpecialChar;

  export interface ClassRange extends Base<'ClassRange'> {
    from: Char;
    to: Char;
  }

  export interface CharacterClass extends Base<'CharacterClass'> {
    negative?: true;
    expressions: (Char | ClassRange)[];
  }

  export interface Alternative extends Base<'Alternative'> {
    expressions: Expression[];
  }

  export interface Disjunction extends Base<'Disjunction'> {
    left: Expression | null;
    right: Expression | null;
  }

  export interface CapturingGroup extends Base<'Group'> {
    capturing: true;
    number: number;
    name?: string;
    nameRaw?: string;
    expression: Expression | null;
  }

  export interface NoncapturingGroup extends Base<'Group'> {
    capturing: false;
    expression: Expression | null;
  }

  export type Group =
    | CapturingGroup
    | NoncapturingGroup;

  export interface NumericBackreference extends Base<'Backreference'> {
    kind: 'number';
    number: number;
    reference: number;
  }

  export interface NamedBackreference extends Base<'Backreference'> {
    kind: 'name';
    number: number;
    reference: string;
    referenceRaw: string;
  }

  export type Backreference =
    | NumericBackreference
    | NamedBackreference;

  export interface Repetition extends Base<'Repetition'> {
    expression: Expression;
    quantifier: Quantifier;
  }

  export interface SimpleQuantifier extends Base<'Quantifier'> {
    kind: '+' | '*' | '?';
    greedy: boolean;
  }

  export interface RangeQuantifier extends Base<'Quantifier'> {
    kind: 'Range';
    from: number;
    to?: number;
    greedy: boolean;
  }

  export type Quantifier =
    | SimpleQuantifier
    | RangeQuantifier;

  export interface SimpleAssertion extends Base<'Assertion'> {
    kind: '^' | '$' | '\\b' | '\\B';
  }

  export interface LookaroundAssertion extends Base<'Assertion'> {
    kind: 'Lookahead' | 'Lookbehind';
    negative?: true;
    assertion: Expression | null;
  }

  export type Assertion =
    | SimpleAssertion
    | LookaroundAssertion;

  export type Expression =
    | Char
    | CharacterClass
    | Alternative
    | Disjunction
    | Group
    | Backreference
    | Repetition
    | Assertion;

  export interface AstRegExp extends Base<'RegExp'> {
    body: Expression | null;
    flags: string;
  }
}

declare module 'regexp-tree' {
  import {
    AstRegExp,
    AstNode,
    AstClass,
    AstClassMap
  } from 'regexp-tree/ast'

  export interface ParserOptions {
    captureLocations?: boolean;
    allowGroupNameDuplicates?: boolean;
  }

  /**
   * Parses a regexp string, producing an AST.
   *
   * @param regexp a regular expression in different formats: string, AST, RegExp.
   * @param options parsing options for this parse call.
   */
  export function parse(regexp: string | RegExp, options?: ParserOptions): AstRegExp;

  /**
   * Generates a RegExp string from an AST.
   */
  export function generate(ast: AstNode | null | undefined): string;

  /**
   * Creates a RegExp object from a regexp string.
   */
  export function toRegExp(regexp: string): RegExp;

  export interface NodePath<T extends AstNode = AstNode> {
    node: T;
    parent: AstNode | null;
    parentPath: NodePath | null;
    property: string | null;
    index: number | null;
    getParent(): NodePath | null;
    getChild(n?: number): NodePath | null;
    getPreviousSibling(): NodePath | null;
    getNextSibling(): NodePath | null;
    setChild<T extends AstNode>(node: T | null, index?: number | null, property?: string | null): NodePath<T> | null;
    appendChild<T extends AstNode>(node: T | null, property?: string | null): NodePath<T> | null;
    insertChildAt<T extends AstNode>(node: T | null, index: number, property?: string | null): void;
    replace<T extends AstNode>(node: T): NodePath<T> | null;
    update(nodeProps: Partial<T>): void;
    remove(): void;
    isRemoved(): boolean;
    hasEqualSource(path: NodePath<T>): boolean;
    jsonEncode(options?: { format?: string | number, useLoc?: boolean }): string;
  }

  export type NodeTraversalCallback<T extends AstNode = AstNode> = (node: T, parent: NodePath | null, property?: string, index?: number) => void | boolean;

  export interface NodeTraversalCallbacks<T extends AstNode = AstNode> {
    pre?: NodeTraversalCallback<T>;
    post?: NodeTraversalCallback<T>;
  }

  export type SpecificNodeTraversalHandlers = {
    [P in AstClass]?: NodeTraversalCallback<AstClassMap[P]> | NodeTraversalCallbacks<AstClassMap[P]>;
  };

  export interface NodeTraversalHandlers<T extends AstNode = AstNode> extends SpecificNodeTraversalHandlers {
    '*'?: NodeTraversalCallback;
    shouldRun?(ast: T): boolean;
    init?(ast: T): void;
  }

  export type TraversalCallback<T extends AstNode = AstNode> = (path: NodePath<T>) => void | boolean;

  export interface TraversalCallbacks<T extends AstNode = AstNode> {
    pre?: TraversalCallback<T>;
    post?: TraversalCallback<T>;
  }

  export type SpecificTraversalHandlers = {
    [P in AstClass]?: TraversalCallback<AstClassMap[P]> | TraversalCallbacks<AstClassMap[P]>;
  };

  export interface TraversalHandlers<T extends AstNode = AstNode> extends SpecificTraversalHandlers {
    '*'?: TraversalCallback;
    shouldRun?(ast: T): boolean;
    init?(ast: T): void;
  }

  /**
   * Traverses a RegExp AST.
   *
   * @param handlers Each `handler` is an object containing handler function for needed
   * node types. The value for a node type may also be an object with functions pre and post.
	 * This enables more context-aware analyses, e.g. measuring star height.
   * 
   * @example
   * regexpTree.traverse(ast, {
   *   onChar(node) {
   *     ...
   *   },
   * });
   */
  export function traverse<T extends AstNode>(ast: T, handlers: NodeTraversalHandlers<T> | ReadonlyArray<NodeTraversalHandlers<T>>, options: { asNodes: true }): void;
  export function traverse<T extends AstNode>(ast: T, handlers: TraversalHandlers<T> | ReadonlyArray<TraversalHandlers<T>>, options?: { asNodes?: false }): void;

  export type TransformHandlers<T extends AstNode = AstNode> = TraversalHandlers<T>;

  export class TransformResult<T extends AstNode, E = unknown> {
      private _ast;
      private _source;
      private _string;
      private _regexp;
      private _extra;
      constructor(ast: T, extra?: E);
      getAST(): T;
      setExtra(extra: E): void;
      getExtra(): E;
      toRegExp(): RegExp;
      getSource(): string;
      getFlags(): string;
      toString(): string;
  }

  /**
   * Transforms a regular expression.
   *
   * A regexp can be passed in different formats (string, regexp or AST),
   * applying a set of transformations. It is a convenient wrapper
   * on top of "parse-traverse-generate" tool chain.
   */
  export function transform<T extends AstNode>(ast: T, handlers: TraversalHandlers<T> | ReadonlyArray<TraversalHandlers<T>>): TransformResult<T>;
  export function transform(regexp: string | RegExp, handlers: TransformHandlers<AstRegExp> | ReadonlyArray<TransformHandlers<AstRegExp>>): TransformResult<AstRegExp>;

  /**
   * Optimizes a regular expression by replacing some
   * sub-expressions with their idiomatic patterns.
   */
  export function optimize<T extends AstNode>(ast: T, whitelist?: string[]): TransformResult<T>;
  export function optimize(regexp: string | RegExp, whitelist?: string[]): TransformResult<AstRegExp>;

  /**
   * Translates a regular expression in new syntax or in new format
   * into equivalent expressions in old syntax.
   */
  export function compatTranspile<T extends AstNode>(ast: T, whitelist?: string[]): TransformResult<T>;
  export function compatTranspile(regexp: string | RegExp, whitelist?: string[]): TransformResult<AstRegExp>;

  /**
   * Executes a regular expression on a string.
   */
  export function exec(re: string | RegExp, string: string): RegExpExecArray;
}
