import type { ParserContext } from './ParserContext';
/**
 * The main parser for TSDoc comments.
 */
export declare class NodeParser {
    private readonly _parserContext;
    private readonly _configuration;
    private _currentSection;
    constructor(parserContext: ParserContext);
    parse(): void;
    private _performValidationChecks;
    private _validateTagDefinition;
    private _pushAccumulatedPlainText;
    private _parseAndPushBlock;
    private _addBlockToDocComment;
    /**
     * Used by `_parseParamBlock()`, this parses a JSDoc expression remainder like `string}` or `="]"]` from
     * an input like `@param {string} [x="]"] - the X value`.  It detects nested balanced pairs of delimiters
     * and escaped string literals.
     */
    private _tryParseJSDocTypeOrValueRest;
    /**
     * Used by `_parseParamBlock()`, this parses a JSDoc expression like `{string}` from
     * an input like `@param {string} x - the X value`.
     */
    private _tryParseUnsupportedJSDocType;
    /**
     * Used by `_parseParamBlock()`, this parses a JSDoc expression remainder like `=[]]` from
     * an input like `@param {string} [x=[]] - the X value`.
     */
    private _tryParseJSDocOptionalNameRest;
    private _parseParamBlock;
    private _pushNode;
    private _parseBackslashEscape;
    private _parseBlockTag;
    private _parseInlineTag;
    private _parseInheritDocTag;
    private _parseLinkTag;
    private _parseLinkTagUrlDestination;
    private _parseLinkTagCodeDestination;
    private _parseDeclarationReference;
    private _parseMemberReference;
    private _parseMemberSymbol;
    private _parseMemberIdentifier;
    private _parseMemberSelector;
    private _parseHtmlStartTag;
    private _parseHtmlAttribute;
    private _parseHtmlString;
    private _parseHtmlEndTag;
    /**
     * Parses an HTML name such as an element name or attribute name.
     */
    private _parseHtmlName;
    private _parseFencedCode;
    private _parseCodeSpan;
    private _tryReadSpacingAndNewlines;
    /**
     * Read the next token, and report it as a DocErrorText node.
     */
    private _createError;
    /**
     * Rewind to the specified marker, read the next token, and report it as a DocErrorText node.
     */
    private _backtrackAndCreateError;
    /**
     * Rewind to the errorStartMarker, read the tokens up to and including errorInclusiveEndMarker,
     * and report it as a DocErrorText node.
     */
    private _backtrackAndCreateErrorRange;
    /**
     * Rewind to the specified marker, read the next token, and report it as a DocErrorText node
     * whose location is based on an IFailure.
     */
    private _backtrackAndCreateErrorForFailure;
    /**
     * Rewind to the errorStartMarker, read the tokens up to and including errorInclusiveEndMarker,
     * and report it as a DocErrorText node whose location is based on an IFailure.
     */
    private _backtrackAndCreateErrorRangeForFailure;
    /**
     * Creates an IFailure whose TokenSequence is a single token.  If a marker is not specified,
     * then it is the current token.
     */
    private _createFailureForToken;
    /**
     * Creates an IFailure whose TokenSequence starts from the specified marker and
     * encompasses all tokens read since then.  If none were read, then the next token used.
     */
    private _createFailureForTokensSince;
}
//# sourceMappingURL=NodeParser.d.ts.map