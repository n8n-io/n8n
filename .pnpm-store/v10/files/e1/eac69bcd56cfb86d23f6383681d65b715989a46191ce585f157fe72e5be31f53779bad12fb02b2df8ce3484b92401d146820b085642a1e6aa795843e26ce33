/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * See LICENSE file in root directory for full license.
 */
import { ScopeManager } from "eslint-scope";
import { TSESTree } from "@typescript-eslint/utils";
import { Rule, SourceCode } from "eslint";
import { VisitorKeys } from "eslint-visitor-keys";

//#region \0rolldown/runtime.js
//#endregion
//#region src/ast/errors.d.ts
/**
 * HTML parse errors.
 */
declare class ParseError extends SyntaxError {
  code?: ErrorCode;
  index: number;
  lineNumber: number;
  column: number;
  /**
   * Create new parser error object.
   * @param code The error code. See also: https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
   * @param offset The offset number of this error.
   * @param line The line number of this error.
   * @param column The column number of this error.
   */
  static fromCode(code: ErrorCode, offset: number, line: number, column: number): ParseError;
  /**
   * Normalize the error object.
   * @param x The error object to normalize.
   */
  static normalize(x: any): ParseError | null;
  /**
   * Initialize this ParseError instance.
   * @param message The error message.
   * @param code The error code. See also: https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
   * @param offset The offset number of this error.
   * @param line The line number of this error.
   * @param column The column number of this error.
   */
  constructor(message: string, code: ErrorCode | undefined, offset: number, line: number, column: number);
  /**
   * Type guard for ParseError.
   * @param x The value to check.
   * @returns `true` if the value has `message`, `pos`, `loc` properties.
   */
  static isParseError(x: any): x is ParseError;
}
/**
 * The error codes of HTML syntax errors.
 * https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
 */
type ErrorCode = "abrupt-closing-of-empty-comment" | "absence-of-digits-in-numeric-character-reference" | "cdata-in-html-content" | "character-reference-outside-unicode-range" | "control-character-in-input-stream" | "control-character-reference" | "eof-before-tag-name" | "eof-in-cdata" | "eof-in-comment" | "eof-in-tag" | "incorrectly-closed-comment" | "incorrectly-opened-comment" | "invalid-first-character-of-tag-name" | "missing-attribute-value" | "missing-end-tag-name" | "missing-semicolon-after-character-reference" | "missing-whitespace-between-attributes" | "nested-comment" | "noncharacter-character-reference" | "noncharacter-in-input-stream" | "null-character-reference" | "surrogate-character-reference" | "surrogate-in-input-stream" | "unexpected-character-in-attribute-name" | "unexpected-character-in-unquoted-attribute-value" | "unexpected-equals-sign-before-attribute-name" | "unexpected-null-character" | "unexpected-question-mark-instead-of-tag-name" | "unexpected-solidus-in-tag" | "unknown-named-character-reference" | "end-tag-with-attributes" | "duplicate-attribute" | "end-tag-with-trailing-solidus" | "non-void-html-element-start-tag-with-trailing-solidus" | "x-invalid-end-tag" | "x-invalid-namespace" | "x-missing-interpolation-end";
//#endregion
//#region src/ast/locations.d.ts
/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
/**
 * Location information in lines and columns.
 */
interface Location {
  /**
   * The line number. This is 1-based.
   */
  line: number;
  /**
   * The column number. This is 0-based.
   */
  column: number;
}
/**
 * Range information in lines and columns.
 */
interface LocationRange {
  /**
   * The start location.
   */
  start: Location;
  /**
   * The end location.
   */
  end: Location;
}
/**
 * Location information in offsets.
 * This is 0-based.
 */
type Offset = number;
/**
 * Range information in offsets.
 * The 1st element is the start offset.
 * The 2nd element is the end offset.
 *
 * This is 0-based.
 */
type OffsetRange = [Offset, Offset];
/**
 * Objects which have their location.
 */
interface HasLocation {
  range: OffsetRange;
  loc: LocationRange;
  start?: number;
  end?: number;
}
//#endregion
//#region src/ast/tokens.d.ts
/**
 * Tokens.
 */
interface Token extends HasLocation {
  /**
   * Token types.
   */
  type: string;
  /**
   * Processed values.
   */
  value: string;
}
//#endregion
//#region src/external/token-store/index.d.ts
type SkipOptions = number | ((token: Token) => boolean) | {
  includeComments?: boolean;
  filter?: (token: Token) => boolean;
  skip?: number;
};
type CountOptions = number | ((token: Token) => boolean) | {
  includeComments?: boolean;
  filter?: (token: Token) => boolean;
  count?: number;
};
/**
 * The token store.
 *
 * This class provides methods to get tokens by locations as fast as possible.
 * The methods are a part of public API, so we should be careful if it changes this class.
 *
 * People can get tokens in O(1) by the hash map which is mapping from the location of tokens/comments to tokens.
 * Also people can get a mix of tokens and comments in O(log k), the k is the number of comments.
 * Assuming that comments to be much fewer than tokens, this does not make hash map from token's locations to comments to reduce memory cost.
 * This uses binary-searching instead for comments.
 */
declare class TokenStore {
  private _tokens;
  private _comments;
  private _indexMap;
  /**
   * Initializes this token store.
   * @param tokens - The array of tokens.
   * @param comments - The array of comments.
   */
  constructor(tokens: Token[], comments: Token[]);
  /**
   * Gets the token starting at the specified index.
   * @param offset - Index of the start of the token's range.
   * @param options - The option object.
   * @returns The token starting at index, or null if no such token.
   */
  getTokenByRangeStart(offset: number, options?: {
    includeComments: boolean;
  }): Token | null;
  /**
   * Gets the first token of the given node.
   * @param node - The AST node.
   * @param options - The option object.
   * @returns An object representing the token.
   */
  getFirstToken(node: HasLocation, options?: SkipOptions): Token | null;
  /**
   * Gets the last token of the given node.
   * @param node - The AST node.
   * @param options - The option object.
   * @returns An object representing the token.
   */
  getLastToken(node: HasLocation, options?: SkipOptions): Token | null;
  /**
   * Gets the token that precedes a given node or token.
   * @param node - The AST node or token.
   * @param options - The option object.
   * @returns An object representing the token.
   */
  getTokenBefore(node: HasLocation, options?: SkipOptions): Token | null;
  /**
   * Gets the token that follows a given node or token.
   * @param node - The AST node or token.
   * @param options - The option object.
   * @returns An object representing the token.
   */
  getTokenAfter(node: HasLocation, options?: SkipOptions): Token | null;
  /**
   * Gets the first token between two non-overlapping nodes.
   * @param left - Node before the desired token range.
   * @param right - Node after the desired token range.
   * @param options - The option object.
   * @returns An object representing the token.
   */
  getFirstTokenBetween(left: HasLocation, right: HasLocation, options?: SkipOptions): Token | null;
  /**
   * Gets the last token between two non-overlapping nodes.
   * @param left Node before the desired token range.
   * @param right Node after the desired token range.
   * @param options - The option object.
   * @returns An object representing the token.
   */
  getLastTokenBetween(left: HasLocation, right: HasLocation, options?: SkipOptions): Token | null;
  /**
   * Gets the token that precedes a given node or token in the token stream.
   * This is defined for backward compatibility. Use `includeComments` option instead.
   * TODO: We have a plan to remove this in a future major version.
   * @param node The AST node or token.
   * @param skip A number of tokens to skip.
   * @returns An object representing the token.
   * @deprecated
   */
  getTokenOrCommentBefore(node: HasLocation, skip?: number): Token | null;
  /**
   * Gets the token that follows a given node or token in the token stream.
   * This is defined for backward compatibility. Use `includeComments` option instead.
   * TODO: We have a plan to remove this in a future major version.
   * @param node The AST node or token.
   * @param skip A number of tokens to skip.
   * @returns An object representing the token.
   * @deprecated
   */
  getTokenOrCommentAfter(node: HasLocation, skip?: number): Token | null;
  /**
   * Gets the first `count` tokens of the given node.
   * @param node - The AST node.
   * @param [options=0] - The option object. If this is a number then it's `options.count`. If this is a function then it's `options.filter`.
   * @param [options.includeComments=false] - The flag to iterate comments as well.
   * @param [options.filter=null] - The predicate function to choose tokens.
   * @param [options.count=0] - The maximum count of tokens the cursor iterates.
   * @returns Tokens.
   */
  getFirstTokens(node: HasLocation, options?: CountOptions): Token[];
  /**
   * Gets the last `count` tokens of the given node.
   * @param node - The AST node.
   * @param [options=0] - The option object. Same options as getFirstTokens()
   * @returns Tokens.
   */
  getLastTokens(node: HasLocation, options?: CountOptions): Token[];
  /**
   * Gets the `count` tokens that precedes a given node or token.
   * @param node - The AST node or token.
   * @param [options=0] - The option object. Same options as getFirstTokens()
   * @returns Tokens.
   */
  getTokensBefore(node: HasLocation, options?: CountOptions): Token[];
  /**
   * Gets the `count` tokens that follows a given node or token.
   * @param node - The AST node or token.
   * @param [options=0] - The option object. Same options as getFirstTokens()
   * @returns Tokens.
   */
  getTokensAfter(node: HasLocation, options?: CountOptions): Token[];
  /**
   * Gets the first `count` tokens between two non-overlapping nodes.
   * @param left - Node before the desired token range.
   * @param right - Node after the desired token range.
   * @param [options=0] - The option object. Same options as getFirstTokens()
   * @returns Tokens between left and right.
   */
  getFirstTokensBetween(left: HasLocation, right: HasLocation, options?: CountOptions): Token[];
  /**
   * Gets the last `count` tokens between two non-overlapping nodes.
   * @param left Node before the desired token range.
   * @param right Node after the desired token range.
   * @param [options=0] - The option object. Same options as getFirstTokens()
   * @returns Tokens between left and right.
   */
  getLastTokensBetween(left: HasLocation, right: HasLocation, options?: CountOptions): Token[];
  /**
   * Gets all tokens that are related to the given node.
   * @param node - The AST node.
   * @param beforeCount - The number of tokens before the node to retrieve.
   * @param afterCount - The number of tokens after the node to retrieve.
   * @returns Array of objects representing tokens.
   */
  getTokens(node: HasLocation, beforeCount?: CountOptions, afterCount?: number): Token[];
  /**
   * Gets all of the tokens between two non-overlapping nodes.
   * @param left Node before the desired token range.
   * @param right Node after the desired token range.
   * @param padding Number of extra tokens on either side of center.
   * @returns Tokens between left and right.
   */
  getTokensBetween(left: HasLocation, right: HasLocation, padding?: CountOptions): Token[];
  /**
   * Checks whether any comments exist or not between the given 2 nodes.
   *
   * @param left - The node to check.
   * @param right - The node to check.
   * @returns `true` if one or more comments exist.
   */
  commentsExistBetween(left: HasLocation, right: HasLocation): boolean;
  /**
   * Gets all comment tokens directly before the given node or token.
   * @param nodeOrToken The AST node or token to check for adjacent comment tokens.
   * @returns An array of comments in occurrence order.
   */
  getCommentsBefore(nodeOrToken: HasLocation): Token[];
  /**
   * Gets all comment tokens directly after the given node or token.
   * @param nodeOrToken The AST node or token to check for adjacent comment tokens.
   * @returns An array of comments in occurrence order.
   */
  getCommentsAfter(nodeOrToken: HasLocation): Token[];
  /**
   * Gets all comment tokens inside the given node.
   * @param node The AST node to get the comments for.
   * @returns An array of comments in occurrence order.
   */
  getCommentsInside(node: HasLocation): Token[];
  /**
   * Returns the location of the given node or token.
   * @param nodeOrToken The node or token to get the location of.
   * @returns The location of the node or token.
   */
  getLoc(nodeOrToken: HasLocation): LocationRange;
  /**
   * Returns the range of the given node or token.
   * @param nodeOrToken The node or token to get the range of.
   * @returns The range of the node or token.
   */
  getRange(nodeOrToken: HasLocation): OffsetRange;
}
//#endregion
//#region src/common/parser-object.d.ts
/**
 * The type of basic ESLint custom parser.
 * e.g. espree
 */
type BasicParserObject<R = ESLintProgram> = {
  parse(code: string, options: any): R;
  parseForESLint: undefined;
};
/**
 * The type of ESLint custom parser enhanced for ESLint.
 * e.g. @babel/eslint-parser, @typescript-eslint/parser
 */
type EnhancedParserObject<R = ESLintExtendedProgram> = {
  parseForESLint(code: string, options: any): R;
  parse: undefined;
};
/**
 * The type of ESLint (custom) parsers.
 */
type ParserObject<R1 = ESLintExtendedProgram, R2 = ESLintProgram> = EnhancedParserObject<R1> | BasicParserObject<R2>;
//#endregion
//#region src/sfc/custom-block/index.d.ts
type ESLintCustomBlockParser = ParserObject<any, any>;
type CustomBlockContext = {
  getSourceCode(): SourceCode;
  sourceCode: SourceCode;
  parserServices: any;
  getAncestors(): any[];
  getDeclaredVariables(node: any): any[];
  getScope(): any;
  markVariableAsUsed(name: string): boolean;
  id: string;
  options: any[];
  settings: {
    [name: string]: any;
  };
  parserPath: string;
  parserOptions: any;
  getFilename(): string;
  report(descriptor: Rule.ReportDescriptor): void;
};
//#endregion
//#region src/parser-services.d.ts
type CustomBlockVisitorFactory = (context: CustomBlockContext) => {
  [key: string]: (...args: any) => void;
} | null | undefined;
interface ParserServices {
  /**
   * Define handlers to traverse the template body.
   * @param templateBodyVisitor The template body handlers.
   * @param scriptVisitor The script handlers. This is optional.
   * @param options The options. This is optional.
   */
  defineTemplateBodyVisitor(templateBodyVisitor: {
    [key: string]: (...args: any) => void;
  }, scriptVisitor?: {
    [key: string]: (...args: any) => void;
  }, options?: {
    templateBodyTriggerSelector: "Program" | "Program:exit";
  }): object;
  /**
   * Define handlers to traverse the document.
   * @param documentVisitor The document handlers.
   * @param options The options. This is optional.
   */
  defineDocumentVisitor(documentVisitor: {
    [key: string]: (...args: any) => void;
  }, options?: {
    triggerSelector: "Program" | "Program:exit";
  }): object;
  /**
   * Define handlers to traverse custom blocks.
   * @param context The rule context.
   * @param parser The custom parser.
   * @param rule The custom block rule definition
   * @param scriptVisitor The script handlers. This is optional.
   */
  defineCustomBlocksVisitor(context: Rule.RuleContext, parser: ESLintCustomBlockParser, rule: {
    target: string | string[] | ((lang: string | null, customBlock: VElement) => boolean);
    create: CustomBlockVisitorFactory;
  }, scriptVisitor?: {
    [key: string]: (...args: any) => void;
  }): {
    [key: string]: (...args: any) => void;
  };
  /**
   * Get the token store of the template body.
   * @returns The token store of template body.
   */
  getTemplateBodyTokenStore(): TokenStore;
  /**
   * Get the root document fragment.
   * @returns The root document fragment.
   */
  getDocumentFragment(): VDocumentFragment | null;
}
//#endregion
//#region src/ast/nodes.d.ts
/**
 * Objects which have their parent.
 */
interface HasParent {
  parent?: Node | null;
}
/**
 * The union type for all nodes.
 */
type Node = ESLintNode | VNode | VForExpression | VOnExpression | VSlotScopeExpression | VGenericExpression | VFilterSequenceExpression | VFilter;
/**
 * The union type for ESLint nodes.
 */
type ESLintNode = ESLintIdentifier | ESLintLiteral | ESLintProgram | ESLintSwitchCase | ESLintCatchClause | ESLintVariableDeclarator | ESLintStatement | ESLintExpression | ESLintProperty | ESLintAssignmentProperty | ESLintSuper | ESLintTemplateElement | ESLintSpreadElement | ESLintPattern | ESLintClassBody | ESLintMethodDefinition | ESLintPropertyDefinition | ESLintStaticBlock | ESLintPrivateIdentifier | ESLintModuleDeclaration | ESLintModuleSpecifier | ESLintImportExpression | ESLintLegacyRestProperty;
/**
 * The parsing result of ESLint custom parsers.
 */
interface ESLintExtendedProgram {
  ast: ESLintProgram;
  services?: ParserServices;
  visitorKeys?: {
    [type: string]: string[];
  };
  scopeManager?: ScopeManager;
}
interface ESLintProgram extends HasLocation, HasParent {
  type: "Program";
  sourceType: "script" | "module";
  body: (ESLintStatement | ESLintModuleDeclaration)[];
  templateBody?: VElement & HasConcreteInfo;
  tokens?: Token[];
  comments?: Token[];
  errors?: ParseError[];
}
type ESLintStatement = ESLintExpressionStatement | ESLintBlockStatement | ESLintEmptyStatement | ESLintDebuggerStatement | ESLintWithStatement | ESLintReturnStatement | ESLintLabeledStatement | ESLintBreakStatement | ESLintContinueStatement | ESLintIfStatement | ESLintSwitchStatement | ESLintThrowStatement | ESLintTryStatement | ESLintWhileStatement | ESLintDoWhileStatement | ESLintForStatement | ESLintForInStatement | ESLintForOfStatement | ESLintDeclaration;
interface ESLintEmptyStatement extends HasLocation, HasParent {
  type: "EmptyStatement";
}
interface ESLintBlockStatement extends HasLocation, HasParent {
  type: "BlockStatement";
  body: ESLintStatement[];
}
interface ESLintExpressionStatement extends HasLocation, HasParent {
  type: "ExpressionStatement";
  expression: ESLintExpression;
}
interface ESLintIfStatement extends HasLocation, HasParent {
  type: "IfStatement";
  test: ESLintExpression;
  consequent: ESLintStatement;
  alternate: ESLintStatement | null;
}
interface ESLintSwitchStatement extends HasLocation, HasParent {
  type: "SwitchStatement";
  discriminant: ESLintExpression;
  cases: ESLintSwitchCase[];
}
interface ESLintSwitchCase extends HasLocation, HasParent {
  type: "SwitchCase";
  test: ESLintExpression | null;
  consequent: ESLintStatement[];
}
interface ESLintWhileStatement extends HasLocation, HasParent {
  type: "WhileStatement";
  test: ESLintExpression;
  body: ESLintStatement;
}
interface ESLintDoWhileStatement extends HasLocation, HasParent {
  type: "DoWhileStatement";
  body: ESLintStatement;
  test: ESLintExpression;
}
interface ESLintForStatement extends HasLocation, HasParent {
  type: "ForStatement";
  init: ESLintVariableDeclaration | ESLintExpression | null;
  test: ESLintExpression | null;
  update: ESLintExpression | null;
  body: ESLintStatement;
}
interface ESLintForInStatement extends HasLocation, HasParent {
  type: "ForInStatement";
  left: ESLintVariableDeclaration | ESLintPattern;
  right: ESLintExpression;
  body: ESLintStatement;
}
interface ESLintForOfStatement extends HasLocation, HasParent {
  type: "ForOfStatement";
  left: ESLintVariableDeclaration | ESLintPattern;
  right: ESLintExpression;
  body: ESLintStatement;
  await: boolean;
}
interface ESLintLabeledStatement extends HasLocation, HasParent {
  type: "LabeledStatement";
  label: ESLintIdentifier;
  body: ESLintStatement;
}
interface ESLintBreakStatement extends HasLocation, HasParent {
  type: "BreakStatement";
  label: ESLintIdentifier | null;
}
interface ESLintContinueStatement extends HasLocation, HasParent {
  type: "ContinueStatement";
  label: ESLintIdentifier | null;
}
interface ESLintReturnStatement extends HasLocation, HasParent {
  type: "ReturnStatement";
  argument: ESLintExpression | null;
}
interface ESLintThrowStatement extends HasLocation, HasParent {
  type: "ThrowStatement";
  argument: ESLintExpression;
}
interface ESLintTryStatement extends HasLocation, HasParent {
  type: "TryStatement";
  block: ESLintBlockStatement;
  handler: ESLintCatchClause | null;
  finalizer: ESLintBlockStatement | null;
}
interface ESLintCatchClause extends HasLocation, HasParent {
  type: "CatchClause";
  param: ESLintPattern | null;
  body: ESLintBlockStatement;
}
interface ESLintWithStatement extends HasLocation, HasParent {
  type: "WithStatement";
  object: ESLintExpression;
  body: ESLintStatement;
}
interface ESLintDebuggerStatement extends HasLocation, HasParent {
  type: "DebuggerStatement";
}
type ESLintDeclaration = ESLintFunctionDeclaration | ESLintVariableDeclaration | ESLintClassDeclaration;
interface ESLintFunctionDeclaration extends HasLocation, HasParent {
  type: "FunctionDeclaration";
  async: boolean;
  generator: boolean;
  id: ESLintIdentifier | null;
  params: ESLintPattern[];
  body: ESLintBlockStatement;
}
interface ESLintVariableDeclaration extends HasLocation, HasParent {
  type: "VariableDeclaration";
  kind: "var" | "let" | "const";
  declarations: ESLintVariableDeclarator[];
}
interface ESLintVariableDeclarator extends HasLocation, HasParent {
  type: "VariableDeclarator";
  id: ESLintPattern;
  init: ESLintExpression | null;
}
interface ESLintClassDeclaration extends HasLocation, HasParent {
  type: "ClassDeclaration";
  id: ESLintIdentifier | null;
  superClass: ESLintExpression | null;
  body: ESLintClassBody;
}
interface ESLintClassBody extends HasLocation, HasParent {
  type: "ClassBody";
  body: (ESLintMethodDefinition | ESLintPropertyDefinition | ESLintStaticBlock)[];
}
interface ESLintMethodDefinition extends HasLocation, HasParent {
  type: "MethodDefinition";
  kind: "constructor" | "method" | "get" | "set";
  computed: boolean;
  static: boolean;
  key: ESLintExpression | ESLintPrivateIdentifier;
  value: ESLintFunctionExpression;
}
interface ESLintPropertyDefinition extends HasLocation, HasParent {
  type: "PropertyDefinition";
  computed: boolean;
  static: boolean;
  key: ESLintExpression | ESLintPrivateIdentifier;
  value: ESLintExpression | null;
}
interface ESLintStaticBlock extends HasLocation, HasParent, Omit<ESLintBlockStatement, "type"> {
  type: "StaticBlock";
  body: ESLintStatement[];
}
interface ESLintPrivateIdentifier extends HasLocation, HasParent {
  type: "PrivateIdentifier";
  name: string;
}
type ESLintModuleDeclaration = ESLintImportDeclaration | ESLintExportNamedDeclaration | ESLintExportDefaultDeclaration | ESLintExportAllDeclaration;
type ESLintModuleSpecifier = ESLintImportSpecifier | ESLintImportDefaultSpecifier | ESLintImportNamespaceSpecifier | ESLintExportSpecifier;
interface ESLintImportDeclaration extends HasLocation, HasParent {
  type: "ImportDeclaration";
  specifiers: (ESLintImportSpecifier | ESLintImportDefaultSpecifier | ESLintImportNamespaceSpecifier)[];
  source: ESLintLiteral;
}
interface ESLintImportSpecifier extends HasLocation, HasParent {
  type: "ImportSpecifier";
  imported: ESLintIdentifier | ESLintStringLiteral;
  local: ESLintIdentifier;
}
interface ESLintImportDefaultSpecifier extends HasLocation, HasParent {
  type: "ImportDefaultSpecifier";
  local: ESLintIdentifier;
}
interface ESLintImportNamespaceSpecifier extends HasLocation, HasParent {
  type: "ImportNamespaceSpecifier";
  local: ESLintIdentifier;
}
interface ESLintImportExpression extends HasLocation, HasParent {
  type: "ImportExpression";
  source: ESLintExpression;
}
interface ESLintExportNamedDeclaration extends HasLocation, HasParent {
  type: "ExportNamedDeclaration";
  declaration?: ESLintDeclaration | null;
  specifiers: ESLintExportSpecifier[];
  source?: ESLintLiteral | null;
}
interface ESLintExportSpecifier extends HasLocation, HasParent {
  type: "ExportSpecifier";
  local: ESLintIdentifier | ESLintStringLiteral;
  exported: ESLintIdentifier | ESLintStringLiteral;
}
interface ESLintExportDefaultDeclaration extends HasLocation, HasParent {
  type: "ExportDefaultDeclaration";
  declaration: ESLintDeclaration | ESLintExpression;
}
interface ESLintExportAllDeclaration extends HasLocation, HasParent {
  type: "ExportAllDeclaration";
  exported: ESLintIdentifier | ESLintStringLiteral | null;
  source: ESLintLiteral;
}
type ESLintExpression = ESLintThisExpression | ESLintArrayExpression | ESLintObjectExpression | ESLintFunctionExpression | ESLintArrowFunctionExpression | ESLintYieldExpression | ESLintLiteral | ESLintUnaryExpression | ESLintUpdateExpression | ESLintBinaryExpression | ESLintAssignmentExpression | ESLintLogicalExpression | ESLintMemberExpression | ESLintConditionalExpression | ESLintCallExpression | ESLintNewExpression | ESLintSequenceExpression | ESLintTemplateLiteral | ESLintTaggedTemplateExpression | ESLintClassExpression | ESLintMetaProperty | ESLintIdentifier | ESLintAwaitExpression | ESLintChainExpression;
interface ESLintIdentifier extends HasLocation, HasParent {
  type: "Identifier";
  name: string;
}
interface ESLintLiteralBase extends HasLocation, HasParent {
  type: "Literal";
  value: string | boolean | null | number | RegExp | bigint;
  raw: string;
  regex?: {
    pattern: string;
    flags: string;
  };
  bigint?: string;
}
interface ESLintStringLiteral extends ESLintLiteralBase {
  value: string;
  regex?: undefined;
  bigint?: undefined;
}
interface ESLintBooleanLiteral extends ESLintLiteralBase {
  value: boolean;
  regex?: undefined;
  bigint?: undefined;
}
interface ESLintNullLiteral extends ESLintLiteralBase {
  value: null;
  regex?: undefined;
  bigint?: undefined;
}
interface ESLintNumberLiteral extends ESLintLiteralBase {
  value: number;
  regex?: undefined;
  bigint?: undefined;
}
interface ESLintRegExpLiteral extends ESLintLiteralBase {
  value: null | RegExp;
  regex: {
    pattern: string;
    flags: string;
  };
  bigint?: undefined;
}
interface ESLintBigIntLiteral extends ESLintLiteralBase {
  value: null | bigint;
  regex?: undefined;
  bigint: string;
}
type ESLintLiteral = ESLintStringLiteral | ESLintBooleanLiteral | ESLintNullLiteral | ESLintNumberLiteral | ESLintRegExpLiteral | ESLintBigIntLiteral;
interface ESLintThisExpression extends HasLocation, HasParent {
  type: "ThisExpression";
}
interface ESLintArrayExpression extends HasLocation, HasParent {
  type: "ArrayExpression";
  elements: (ESLintExpression | ESLintSpreadElement)[];
}
interface ESLintObjectExpression extends HasLocation, HasParent {
  type: "ObjectExpression";
  properties: (ESLintProperty | ESLintSpreadElement | ESLintLegacySpreadProperty)[];
}
interface ESLintProperty extends HasLocation, HasParent {
  type: "Property";
  kind: "init" | "get" | "set";
  method: boolean;
  shorthand: boolean;
  computed: boolean;
  key: ESLintExpression;
  value: ESLintExpression | ESLintPattern;
}
interface ESLintFunctionExpression extends HasLocation, HasParent {
  type: "FunctionExpression";
  async: boolean;
  generator: boolean;
  id: ESLintIdentifier | null;
  params: ESLintPattern[];
  body: ESLintBlockStatement;
}
interface ESLintArrowFunctionExpression extends HasLocation, HasParent {
  type: "ArrowFunctionExpression";
  async: boolean;
  generator: boolean;
  id: ESLintIdentifier | null;
  params: ESLintPattern[];
  body: ESLintBlockStatement | ESLintExpression;
}
interface ESLintSequenceExpression extends HasLocation, HasParent {
  type: "SequenceExpression";
  expressions: ESLintExpression[];
}
interface ESLintUnaryExpression extends HasLocation, HasParent {
  type: "UnaryExpression";
  operator: "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";
  prefix: boolean;
  argument: ESLintExpression;
}
interface ESLintBinaryExpression extends HasLocation, HasParent {
  type: "BinaryExpression";
  operator: "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "**" | "|" | "^" | "&" | "in" | "instanceof";
  left: ESLintExpression | ESLintPrivateIdentifier;
  right: ESLintExpression;
}
interface ESLintAssignmentExpression extends HasLocation, HasParent {
  type: "AssignmentExpression";
  operator: "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "**=" | "<<=" | ">>=" | ">>>=" | "|=" | "^=" | "&=" | "||=" | "&&=" | "??=";
  left: ESLintPattern;
  right: ESLintExpression;
}
interface ESLintUpdateExpression extends HasLocation, HasParent {
  type: "UpdateExpression";
  operator: "++" | "--";
  argument: ESLintExpression;
  prefix: boolean;
}
interface ESLintLogicalExpression extends HasLocation, HasParent {
  type: "LogicalExpression";
  operator: "||" | "&&" | "??";
  left: ESLintExpression;
  right: ESLintExpression;
}
interface ESLintConditionalExpression extends HasLocation, HasParent {
  type: "ConditionalExpression";
  test: ESLintExpression;
  alternate: ESLintExpression;
  consequent: ESLintExpression;
}
interface ESLintCallExpression extends HasLocation, HasParent {
  type: "CallExpression";
  optional: boolean;
  callee: ESLintExpression | ESLintSuper;
  arguments: (ESLintExpression | ESLintSpreadElement)[];
}
interface ESLintSuper extends HasLocation, HasParent {
  type: "Super";
}
interface ESLintNewExpression extends HasLocation, HasParent {
  type: "NewExpression";
  callee: ESLintExpression;
  arguments: (ESLintExpression | ESLintSpreadElement)[];
}
interface ESLintMemberExpression extends HasLocation, HasParent {
  type: "MemberExpression";
  optional: boolean;
  computed: boolean;
  object: ESLintExpression | ESLintSuper;
  property: ESLintExpression | ESLintPrivateIdentifier;
}
interface ESLintYieldExpression extends HasLocation, HasParent {
  type: "YieldExpression";
  delegate: boolean;
  argument: ESLintExpression | null;
}
interface ESLintAwaitExpression extends HasLocation, HasParent {
  type: "AwaitExpression";
  argument: ESLintExpression;
}
interface ESLintTemplateLiteral extends HasLocation, HasParent {
  type: "TemplateLiteral";
  quasis: ESLintTemplateElement[];
  expressions: ESLintExpression[];
}
interface ESLintTaggedTemplateExpression extends HasLocation, HasParent {
  type: "TaggedTemplateExpression";
  tag: ESLintExpression;
  quasi: ESLintTemplateLiteral;
}
interface ESLintTemplateElement extends HasLocation, HasParent {
  type: "TemplateElement";
  tail: boolean;
  value: {
    cooked: string | null;
    raw: string;
  };
}
interface ESLintClassExpression extends HasLocation, HasParent {
  type: "ClassExpression";
  id: ESLintIdentifier | null;
  superClass: ESLintExpression | null;
  body: ESLintClassBody;
}
interface ESLintMetaProperty extends HasLocation, HasParent {
  type: "MetaProperty";
  meta: ESLintIdentifier;
  property: ESLintIdentifier;
}
type ESLintPattern = ESLintIdentifier | ESLintObjectPattern | ESLintArrayPattern | ESLintRestElement | ESLintAssignmentPattern | ESLintMemberExpression | ESLintLegacyRestProperty;
interface ESLintObjectPattern extends HasLocation, HasParent {
  type: "ObjectPattern";
  properties: (ESLintAssignmentProperty | ESLintRestElement | ESLintLegacyRestProperty)[];
}
interface ESLintAssignmentProperty extends ESLintProperty {
  value: ESLintPattern;
  kind: "init";
  method: false;
}
interface ESLintArrayPattern extends HasLocation, HasParent {
  type: "ArrayPattern";
  elements: ESLintPattern[];
}
interface ESLintRestElement extends HasLocation, HasParent {
  type: "RestElement";
  argument: ESLintPattern;
}
interface ESLintSpreadElement extends HasLocation, HasParent {
  type: "SpreadElement";
  argument: ESLintExpression;
}
interface ESLintAssignmentPattern extends HasLocation, HasParent {
  type: "AssignmentPattern";
  left: ESLintPattern;
  right: ESLintExpression;
}
type ESLintChainElement = ESLintCallExpression | ESLintMemberExpression;
interface ESLintChainExpression extends HasLocation, HasParent {
  type: "ChainExpression";
  expression: ESLintChainElement;
}
/**
 * Legacy for babel-eslint and espree.
 */
interface ESLintLegacyRestProperty extends HasLocation, HasParent {
  type: "RestProperty" | "ExperimentalRestProperty";
  argument: ESLintPattern;
}
/**
 * Legacy for babel-eslint and espree.
 */
interface ESLintLegacySpreadProperty extends HasLocation, HasParent {
  type: "SpreadProperty" | "ExperimentalSpreadProperty";
  argument: ESLintExpression;
}
/**
 * Constants of namespaces.
 * @see https://infra.spec.whatwg.org/#namespaces
 */
declare const NS: Readonly<{
  HTML: "http://www.w3.org/1999/xhtml";
  MathML: "http://www.w3.org/1998/Math/MathML";
  SVG: "http://www.w3.org/2000/svg";
  XLink: "http://www.w3.org/1999/xlink";
  XML: "http://www.w3.org/XML/1998/namespace";
  XMLNS: "http://www.w3.org/2000/xmlns/";
}>;
/**
 * Type of namespaces.
 */
type Namespace = typeof NS.HTML | typeof NS.MathML | typeof NS.SVG | typeof NS.XLink | typeof NS.XML | typeof NS.XMLNS;
/**
 * Type of variable definitions.
 */
interface Variable {
  id: ESLintIdentifier;
  kind: "v-for" | "scope" | "generic";
  references: Reference[];
}
/**
 * Type of variable references.
 */
interface Reference {
  id: ESLintIdentifier;
  mode: "rw" | "r" | "w";
  variable: Variable | null;
  isValueReference?: boolean;
  isTypeReference?: boolean;
}
/**
 * The node of `v-for` directives.
 */
interface VForExpression extends HasLocation, HasParent {
  type: "VForExpression";
  parent: VExpressionContainer;
  left: ESLintPattern[];
  right: ESLintExpression;
}
/**
 * The node of `v-on` directives.
 */
interface VOnExpression extends HasLocation, HasParent {
  type: "VOnExpression";
  parent: VExpressionContainer;
  body: ESLintStatement[];
}
/**
 * The node of `slot-scope` directives.
 */
interface VSlotScopeExpression extends HasLocation, HasParent {
  type: "VSlotScopeExpression";
  parent: VExpressionContainer;
  params: ESLintPattern[];
}
/**
 * The node of `generic` directives.
 */
interface VGenericExpression extends HasLocation, HasParent {
  type: "VGenericExpression";
  parent: VExpressionContainer;
  params: TSESTree.TSTypeParameterDeclaration["params"];
  rawParams: string[];
}
/**
 * The node of a filter sequence which is separated by `|`.
 */
interface VFilterSequenceExpression extends HasLocation, HasParent {
  type: "VFilterSequenceExpression";
  parent: VExpressionContainer;
  expression: ESLintExpression;
  filters: VFilter[];
}
/**
 * The node of a filter sequence which is separated by `|`.
 */
interface VFilter extends HasLocation, HasParent {
  type: "VFilter";
  parent: VFilterSequenceExpression;
  callee: ESLintIdentifier;
  arguments: (ESLintExpression | ESLintSpreadElement)[];
}
/**
 * The union type of any nodes.
 */
type VNode = VAttribute | VDirective | VDirectiveKey | VDocumentFragment | VElement | VEndTag | VExpressionContainer | VIdentifier | VLiteral | VStartTag | VText;
/**
 * Text nodes.
 */
interface VText extends HasLocation, HasParent {
  type: "VText";
  parent: VDocumentFragment | VElement;
  value: string;
}
/**
 * The node of JavaScript expression in text.
 * e.g. `{{ name }}`
 */
interface VExpressionContainer extends HasLocation, HasParent {
  type: "VExpressionContainer";
  parent: VDocumentFragment | VElement | VDirective | VDirectiveKey;
  expression: ESLintExpression | VFilterSequenceExpression | VForExpression | VOnExpression | VSlotScopeExpression | VGenericExpression | null;
  references: Reference[];
}
/**
 * Attribute name nodes.
 */
interface VIdentifier extends HasLocation, HasParent {
  type: "VIdentifier";
  parent: VAttribute | VDirectiveKey;
  name: string;
  rawName: string;
}
/**
 * Attribute name nodes.
 */
interface VDirectiveKey extends HasLocation, HasParent {
  type: "VDirectiveKey";
  parent: VDirective;
  name: VIdentifier;
  argument: VExpressionContainer | VIdentifier | null;
  modifiers: VIdentifier[];
}
/**
 * Attribute value nodes.
 */
interface VLiteral extends HasLocation, HasParent {
  type: "VLiteral";
  parent: VAttribute;
  value: string;
}
/**
 * Static attribute nodes.
 */
interface VAttribute extends HasLocation, HasParent {
  type: "VAttribute";
  parent: VStartTag;
  directive: false;
  key: VIdentifier;
  value: VLiteral | null;
}
/**
 * Directive nodes.
 */
interface VDirective extends HasLocation, HasParent {
  type: "VAttribute";
  parent: VStartTag;
  directive: true;
  key: VDirectiveKey;
  value: VExpressionContainer | null;
}
/**
 * Start tag nodes.
 */
interface VStartTag extends HasLocation, HasParent {
  type: "VStartTag";
  parent: VElement;
  selfClosing: boolean;
  attributes: (VAttribute | VDirective)[];
}
/**
 * End tag nodes.
 */
interface VEndTag extends HasLocation, HasParent {
  type: "VEndTag";
  parent: VElement;
}
/**
 * The property which has concrete information.
 */
interface HasConcreteInfo {
  tokens: Token[];
  comments: Token[];
  errors: ParseError[];
}
/**
 * Element nodes.
 */
interface VElement extends HasLocation, HasParent {
  type: "VElement";
  parent: VDocumentFragment | VElement;
  namespace: Namespace;
  name: string;
  rawName: string;
  startTag: VStartTag;
  children: (VElement | VText | VExpressionContainer)[];
  endTag: VEndTag | null;
  variables: Variable[];
}
/**
 * Root nodes.
 */
interface VDocumentFragment extends HasLocation, HasParent, HasConcreteInfo {
  type: "VDocumentFragment";
  parent: null;
  children: (VElement | VText | VExpressionContainer | VStyleElement)[];
}
/**
 * Style element nodes.
 */
interface VStyleElement extends VElement {
  type: "VElement";
  name: "style";
  style: true;
  children: (VText | VExpressionContainer)[];
}
//#endregion
//#region src/ast/traverse.d.ts
declare const KEYS: Readonly<{
  [type: string]: readonly string[] | undefined;
}>;
/**
 * Get the keys of the given node to traverse it.
 * @param node The node to get.
 * @returns The keys to traverse.
 */
declare function getFallbackKeys(node: Node): string[];
interface Visitor {
  visitorKeys?: VisitorKeys;
  enterNode(node: Node, parent: Node | null): void;
  leaveNode(node: Node, parent: Node | null): void;
}
/**
 * Traverse the given AST tree.
 * @param node Root node to traverse.
 * @param visitor Visitor.
 */
declare function traverseNodes(node: Node, visitor: Visitor): void;
declare namespace index_d_exports {
  export { ESLintArrayExpression, ESLintArrayPattern, ESLintArrowFunctionExpression, ESLintAssignmentExpression, ESLintAssignmentPattern, ESLintAssignmentProperty, ESLintAwaitExpression, ESLintBigIntLiteral, ESLintBinaryExpression, ESLintBlockStatement, ESLintBooleanLiteral, ESLintBreakStatement, ESLintCallExpression, ESLintCatchClause, ESLintChainElement, ESLintChainExpression, ESLintClassBody, ESLintClassDeclaration, ESLintClassExpression, ESLintConditionalExpression, ESLintContinueStatement, ESLintDebuggerStatement, ESLintDeclaration, ESLintDoWhileStatement, ESLintEmptyStatement, ESLintExportAllDeclaration, ESLintExportDefaultDeclaration, ESLintExportNamedDeclaration, ESLintExportSpecifier, ESLintExpression, ESLintExpressionStatement, ESLintExtendedProgram, ESLintForInStatement, ESLintForOfStatement, ESLintForStatement, ESLintFunctionDeclaration, ESLintFunctionExpression, ESLintIdentifier, ESLintIfStatement, ESLintImportDeclaration, ESLintImportDefaultSpecifier, ESLintImportExpression, ESLintImportNamespaceSpecifier, ESLintImportSpecifier, ESLintLabeledStatement, ESLintLegacyRestProperty, ESLintLegacySpreadProperty, ESLintLiteral, ESLintLogicalExpression, ESLintMemberExpression, ESLintMetaProperty, ESLintMethodDefinition, ESLintModuleDeclaration, ESLintModuleSpecifier, ESLintNewExpression, ESLintNode, ESLintNullLiteral, ESLintNumberLiteral, ESLintObjectExpression, ESLintObjectPattern, ESLintPattern, ESLintPrivateIdentifier, ESLintProgram, ESLintProperty, ESLintPropertyDefinition, ESLintRegExpLiteral, ESLintRestElement, ESLintReturnStatement, ESLintSequenceExpression, ESLintSpreadElement, ESLintStatement, ESLintStaticBlock, ESLintStringLiteral, ESLintSuper, ESLintSwitchCase, ESLintSwitchStatement, ESLintTaggedTemplateExpression, ESLintTemplateElement, ESLintTemplateLiteral, ESLintThisExpression, ESLintThrowStatement, ESLintTryStatement, ESLintUnaryExpression, ESLintUpdateExpression, ESLintVariableDeclaration, ESLintVariableDeclarator, ESLintWhileStatement, ESLintWithStatement, ESLintYieldExpression, ErrorCode, HasConcreteInfo, HasLocation, HasParent, KEYS, Location, LocationRange, NS, Namespace, Node, Offset, OffsetRange, ParseError, Reference, Token, VAttribute, VDirective, VDirectiveKey, VDocumentFragment, VElement, VEndTag, VExpressionContainer, VFilter, VFilterSequenceExpression, VForExpression, VGenericExpression, VIdentifier, VLiteral, VNode, VOnExpression, VSlotScopeExpression, VStartTag, VStyleElement, VText, Variable, Visitor, getFallbackKeys, traverseNodes };
}
//#endregion
//#region src/index.d.ts
/**
 * Parse the given source code.
 * @param code The source code to parse.
 * @param parserOptions The parser options.
 * @returns The parsing result.
 */
declare function parseForESLint(code: string, parserOptions: any): ESLintExtendedProgram;
/**
 * Parse the given source code.
 * @param code The source code to parse.
 * @param options The parser options.
 * @returns The parsing result.
 */
declare function parse(code: string, options?: any): ESLintProgram;
declare const meta: {
  name: string;
  version: string;
};
//#endregion
export { index_d_exports as AST, meta, parse, parseForESLint };
//# sourceMappingURL=index.d.cts.map