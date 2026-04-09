/**
 * @import * as acorn from "acorn";
 * @import { Options, EspreeTokens } from "../espree.js";
 */

/**
 * @typedef {acorn.tokTypes & {
 *   jsxName: acorn.TokenType,
 *   jsxText: acorn.TokenType,
 *   jsxTagEnd: acorn.TokenType,
 *   jsxTagStart: acorn.TokenType
 * }} TokTypes
 */

/**
 * @typedef {new (
 *   token: string,
 *   isExpr: boolean,
 *   preserveSpace: boolean,
 *   override?: (parser: any) => void
 * ) => void} TokContext
 */

/**
 * @typedef {{
 *   tc_oTag: TokContext,
 *   tc_cTag: TokContext,
 *   tc_expr: TokContext
 * }} TokContexts
 */

/**
 * @typedef {{
 *   generator?: boolean
 * } & acorn.Node} EsprimaNode
 */

/**
 * @typedef {"Block"|"Hashbang"|"Line"} CommentType
 */

/**
 * @typedef {{
 *   tokenize: () => EspreeTokens,
 *   parse: () => acorn.Program
 * }} EspreeParser
 */

/* eslint-disable jsdoc/valid-types -- Waiting on jsdoc plugin update */
/**
 * @typedef {acorn.Parser & {
 *   jsx_readToken(): string;
 *   jsx_readNewLine(normalizeCRLF: boolean): void;
 *   jsx_readString(quote: number): void;
 *   jsx_readEntity(): string;
 *   jsx_readWord(): void;
 *   jsx_parseIdentifier(): acorn.Node;
 *   jsx_parseNamespacedName(): acorn.Node;
 *   jsx_parseElementName(): acorn.Node | string;
 *   jsx_parseAttributeValue(): acorn.Node;
 *   jsx_parseEmptyExpression(): acorn.Node;
 *   jsx_parseExpressionContainer(): acorn.Node;
 *   jsx_parseAttribute(): acorn.Node;
 *   jsx_parseOpeningElementAt(startPos: number, startLoc?: acorn.SourceLocation): acorn.Node;
 *   jsx_parseClosingElementAt(startPos: number, startLoc?: acorn.SourceLocation): acorn.Node;
 *   jsx_parseElementAt(startPos: number, startLoc?: acorn.SourceLocation): acorn.Node;
 *   jsx_parseText(): acorn.Node;
 *   jsx_parseElement(): acorn.Node;
 * }} AcornJsxParser
 */

/**
 * We pick (statics) from acorn rather than plain extending to avoid complaint
 *   about base constructors needing the same return type (i.e., we return
 *   `AcornJsxParser` here)
 * @typedef {Pick<typeof acorn.Parser, keyof typeof acorn.Parser> & {
 *   readonly acornJsx: {
 *     tokTypes: TokTypes;
 *     tokContexts: TokContexts
 *   };
 *   new (options: acorn.Options, input: string, startPos?: number): AcornJsxParser;
 * }} AcornJsxParserCtor
 */
/**
 * @typedef {{
 *   new (opts: Options | null | undefined, code: string | object): EspreeParser
 * } & Pick<typeof acorn.Parser, keyof typeof acorn.Parser>} EspreeParserCtor
 */
/**
 * @typedef {{
 *   new (opts: Options | null | undefined, code: string | object): EspreeParser
 * } & Pick<AcornJsxParserCtor, keyof AcornJsxParserCtor>} EspreeParserJsxCtor
 */

/**
 * @typedef {Pick<AcornJsxParserCtor, keyof AcornJsxParserCtor> & {
 *   acorn: {
 *     tokTypes: TokTypes,
 *     getLineInfo: (input: string, pos: number) => {
 *       line: number,
 *       column: number
 *     }
 *   }
 *   new (options: acorn.Options, input: string, startPos?: number): AcornJsxParser & {
 *     next: () => void,
 *     type: acorn.TokenType,
 *     curLine: number,
 *     start: number,
 *     end: number,
 *     finishNode (node: acorn.Node, type: string): acorn.Node,
 *     finishNodeAt (node: acorn.Node, type: string, pos: number, loc: acorn.Position): acorn.Node,
 *     parseTopLevel (node: acorn.Node): acorn.Node,
 *     nextToken (): void
 *   }
 * }} AcornJsxParserCtorEnhanced
 */

/* eslint-enable jsdoc/valid-types -- Bug in older versions */
