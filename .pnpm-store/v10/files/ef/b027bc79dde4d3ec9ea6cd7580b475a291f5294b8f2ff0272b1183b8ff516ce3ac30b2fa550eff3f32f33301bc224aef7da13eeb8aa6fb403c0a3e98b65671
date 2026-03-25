// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { TokenKind } from './Token';
import { Tokenizer } from './Tokenizer';
import { DocBlockTag, DocCodeSpan, DocErrorText, DocEscapedText, DocHtmlAttribute, DocHtmlEndTag, DocHtmlStartTag, DocInlineTag, DocPlainText, DocSoftBreak, EscapeStyle, DocBlock, DocNodeKind, DocParamBlock, DocFencedCode, DocLinkTag, DocMemberReference, DocDeclarationReference, DocMemberSymbol, DocMemberIdentifier, DocMemberSelector, DocInheritDocTag } from '../nodes';
import { TokenSequence } from './TokenSequence';
import { TokenReader } from './TokenReader';
import { StringChecks } from './StringChecks';
import { TSDocTagSyntaxKind } from '../configuration/TSDocTagDefinition';
import { StandardTags } from '../details/StandardTags';
import { PlainTextEmitter } from '../emitters/PlainTextEmitter';
import { TSDocMessageId } from './TSDocMessageId';
function isFailure(resultOrFailure) {
    return resultOrFailure !== undefined && Object.hasOwnProperty.call(resultOrFailure, 'failureMessage');
}
/**
 * The main parser for TSDoc comments.
 */
var NodeParser = /** @class */ (function () {
    function NodeParser(parserContext) {
        this._parserContext = parserContext;
        this._configuration = parserContext.configuration;
        this._currentSection = parserContext.docComment.summarySection;
    }
    NodeParser.prototype.parse = function () {
        var tokenReader = new TokenReader(this._parserContext);
        var done = false;
        while (!done) {
            // Extract the next token
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.EndOfInput:
                    done = true;
                    break;
                case TokenKind.Newline:
                    this._pushAccumulatedPlainText(tokenReader);
                    tokenReader.readToken();
                    this._pushNode(new DocSoftBreak({
                        parsed: true,
                        configuration: this._configuration,
                        softBreakExcerpt: tokenReader.extractAccumulatedSequence()
                    }));
                    break;
                case TokenKind.Backslash:
                    this._pushAccumulatedPlainText(tokenReader);
                    this._pushNode(this._parseBackslashEscape(tokenReader));
                    break;
                case TokenKind.AtSign:
                    this._pushAccumulatedPlainText(tokenReader);
                    this._parseAndPushBlock(tokenReader);
                    break;
                case TokenKind.LeftCurlyBracket: {
                    this._pushAccumulatedPlainText(tokenReader);
                    var marker = tokenReader.createMarker();
                    var docNode = this._parseInlineTag(tokenReader);
                    var docComment = this._parserContext.docComment;
                    if (docNode instanceof DocInheritDocTag) {
                        // The @inheritDoc tag is irregular because it looks like an inline tag, but
                        // it actually represents the entire comment body
                        var tagEndMarker = tokenReader.createMarker() - 1;
                        if (docComment.inheritDocTag === undefined) {
                            this._parserContext.docComment.inheritDocTag = docNode;
                        }
                        else {
                            this._pushNode(this._backtrackAndCreateErrorRange(tokenReader, marker, tagEndMarker, TSDocMessageId.ExtraInheritDocTag, 'A doc comment cannot have more than one @inheritDoc tag'));
                        }
                    }
                    else {
                        this._pushNode(docNode);
                    }
                    break;
                }
                case TokenKind.RightCurlyBracket:
                    this._pushAccumulatedPlainText(tokenReader);
                    this._pushNode(this._createError(tokenReader, TSDocMessageId.EscapeRightBrace, 'The "}" character should be escaped using a backslash to avoid confusion with a TSDoc inline tag'));
                    break;
                case TokenKind.LessThan:
                    this._pushAccumulatedPlainText(tokenReader);
                    // Look ahead two tokens to see if this is "<a>" or "</a>".
                    if (tokenReader.peekTokenAfterKind() === TokenKind.Slash) {
                        this._pushNode(this._parseHtmlEndTag(tokenReader));
                    }
                    else {
                        this._pushNode(this._parseHtmlStartTag(tokenReader));
                    }
                    break;
                case TokenKind.GreaterThan:
                    this._pushAccumulatedPlainText(tokenReader);
                    this._pushNode(this._createError(tokenReader, TSDocMessageId.EscapeGreaterThan, 'The ">" character should be escaped using a backslash to avoid confusion with an HTML tag'));
                    break;
                case TokenKind.Backtick:
                    this._pushAccumulatedPlainText(tokenReader);
                    if (tokenReader.peekTokenAfterKind() === TokenKind.Backtick &&
                        tokenReader.peekTokenAfterAfterKind() === TokenKind.Backtick) {
                        this._pushNode(this._parseFencedCode(tokenReader));
                    }
                    else {
                        this._pushNode(this._parseCodeSpan(tokenReader));
                    }
                    break;
                default:
                    // If nobody recognized this token, then accumulate plain text
                    tokenReader.readToken();
                    break;
            }
        }
        this._pushAccumulatedPlainText(tokenReader);
        this._performValidationChecks();
    };
    NodeParser.prototype._performValidationChecks = function () {
        var docComment = this._parserContext.docComment;
        if (docComment.deprecatedBlock) {
            if (!PlainTextEmitter.hasAnyTextContent(docComment.deprecatedBlock)) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.MissingDeprecationMessage, "The ".concat(docComment.deprecatedBlock.blockTag.tagName, " block must include a deprecation message,") +
                    " e.g. describing the recommended alternative", docComment.deprecatedBlock.blockTag.getTokenSequence(), docComment.deprecatedBlock);
            }
        }
        if (docComment.inheritDocTag) {
            if (docComment.remarksBlock) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.InheritDocIncompatibleTag, "A \"".concat(docComment.remarksBlock.blockTag.tagName, "\" block must not be used, because that") +
                    " content is provided by the @inheritDoc tag", docComment.remarksBlock.blockTag.getTokenSequence(), docComment.remarksBlock.blockTag);
            }
            if (PlainTextEmitter.hasAnyTextContent(docComment.summarySection)) {
                this._parserContext.log.addMessageForTextRange(TSDocMessageId.InheritDocIncompatibleSummary, 'The summary section must not have any content, because that' +
                    ' content is provided by the @inheritDoc tag', this._parserContext.commentRange);
            }
        }
    };
    NodeParser.prototype._validateTagDefinition = function (tagDefinition, tagName, expectingInlineTag, tokenSequenceForErrorContext, nodeForErrorContext) {
        if (tagDefinition) {
            var isInlineTag = tagDefinition.syntaxKind === TSDocTagSyntaxKind.InlineTag;
            if (isInlineTag !== expectingInlineTag) {
                // The tag is defined, but it is used incorrectly
                if (expectingInlineTag) {
                    this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.TagShouldNotHaveBraces, "The TSDoc tag \"".concat(tagName, "\" is not an inline tag; it must not be enclosed in \"{ }\" braces"), tokenSequenceForErrorContext, nodeForErrorContext);
                }
                else {
                    this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.InlineTagMissingBraces, "The TSDoc tag \"".concat(tagName, "\" is an inline tag; it must be enclosed in \"{ }\" braces"), tokenSequenceForErrorContext, nodeForErrorContext);
                }
            }
            else {
                if (this._parserContext.configuration.validation.reportUnsupportedTags) {
                    if (!this._parserContext.configuration.isTagSupported(tagDefinition)) {
                        // The tag is defined, but not supported
                        this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.UnsupportedTag, "The TSDoc tag \"".concat(tagName, "\" is not supported by this tool"), tokenSequenceForErrorContext, nodeForErrorContext);
                    }
                }
            }
        }
        else {
            // The tag is not defined
            if (!this._parserContext.configuration.validation.ignoreUndefinedTags) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.UndefinedTag, "The TSDoc tag \"".concat(tagName, "\" is not defined in this configuration"), tokenSequenceForErrorContext, nodeForErrorContext);
            }
        }
    };
    NodeParser.prototype._pushAccumulatedPlainText = function (tokenReader) {
        if (!tokenReader.isAccumulatedSequenceEmpty()) {
            this._pushNode(new DocPlainText({
                parsed: true,
                configuration: this._configuration,
                textExcerpt: tokenReader.extractAccumulatedSequence()
            }));
        }
    };
    NodeParser.prototype._parseAndPushBlock = function (tokenReader) {
        var docComment = this._parserContext.docComment;
        var configuration = this._parserContext.configuration;
        var modifierTagSet = docComment.modifierTagSet;
        var parsedBlockTag = this._parseBlockTag(tokenReader);
        if (parsedBlockTag.kind !== DocNodeKind.BlockTag) {
            this._pushNode(parsedBlockTag);
            return;
        }
        var docBlockTag = parsedBlockTag;
        // Do we have a definition for this tag?
        var tagDefinition = configuration.tryGetTagDefinitionWithUpperCase(docBlockTag.tagNameWithUpperCase);
        this._validateTagDefinition(tagDefinition, docBlockTag.tagName, 
        /* expectingInlineTag */ false, docBlockTag.getTokenSequence(), docBlockTag);
        if (tagDefinition) {
            switch (tagDefinition.syntaxKind) {
                case TSDocTagSyntaxKind.BlockTag:
                    if (docBlockTag.tagNameWithUpperCase === StandardTags.param.tagNameWithUpperCase) {
                        var docParamBlock = this._parseParamBlock(tokenReader, docBlockTag, StandardTags.param.tagName);
                        this._parserContext.docComment.params.add(docParamBlock);
                        this._currentSection = docParamBlock.content;
                        return;
                    }
                    else if (docBlockTag.tagNameWithUpperCase === StandardTags.typeParam.tagNameWithUpperCase) {
                        var docParamBlock = this._parseParamBlock(tokenReader, docBlockTag, StandardTags.typeParam.tagName);
                        this._parserContext.docComment.typeParams.add(docParamBlock);
                        this._currentSection = docParamBlock.content;
                        return;
                    }
                    else {
                        var newBlock = new DocBlock({
                            configuration: this._configuration,
                            blockTag: docBlockTag
                        });
                        this._addBlockToDocComment(newBlock);
                        this._currentSection = newBlock.content;
                    }
                    return;
                case TSDocTagSyntaxKind.ModifierTag:
                    // The block tag was recognized as a modifier, so add it to the modifier tag set
                    // and do NOT call currentSection.appendNode(parsedNode)
                    modifierTagSet.addTag(docBlockTag);
                    return;
            }
        }
        this._pushNode(docBlockTag);
    };
    NodeParser.prototype._addBlockToDocComment = function (block) {
        var docComment = this._parserContext.docComment;
        switch (block.blockTag.tagNameWithUpperCase) {
            case StandardTags.remarks.tagNameWithUpperCase:
                docComment.remarksBlock = block;
                break;
            case StandardTags.privateRemarks.tagNameWithUpperCase:
                docComment.privateRemarks = block;
                break;
            case StandardTags.deprecated.tagNameWithUpperCase:
                docComment.deprecatedBlock = block;
                break;
            case StandardTags.returns.tagNameWithUpperCase:
                docComment.returnsBlock = block;
                break;
            case StandardTags.see.tagNameWithUpperCase:
                docComment._appendSeeBlock(block);
                break;
            default:
                docComment.appendCustomBlock(block);
        }
    };
    /**
     * Used by `_parseParamBlock()`, this parses a JSDoc expression remainder like `string}` or `="]"]` from
     * an input like `@param {string} [x="]"] - the X value`.  It detects nested balanced pairs of delimiters
     * and escaped string literals.
     */
    NodeParser.prototype._tryParseJSDocTypeOrValueRest = function (tokenReader, openKind, closeKind, startMarker) {
        var quoteKind;
        var openCount = 1;
        while (openCount > 0) {
            var tokenKind = tokenReader.peekTokenKind();
            switch (tokenKind) {
                case openKind:
                    // ignore open bracket/brace inside of a quoted string
                    if (quoteKind === undefined)
                        openCount++;
                    break;
                case closeKind:
                    // ignore close bracket/brace inside of a quoted string
                    if (quoteKind === undefined)
                        openCount--;
                    break;
                case TokenKind.Backslash:
                    // ignore backslash outside of quoted string
                    if (quoteKind !== undefined) {
                        // skip the backslash and the next character.
                        tokenReader.readToken();
                        tokenKind = tokenReader.peekTokenKind();
                    }
                    break;
                case TokenKind.DoubleQuote:
                case TokenKind.SingleQuote:
                case TokenKind.Backtick:
                    if (quoteKind === tokenKind) {
                        // exit quoted string if quote character matches.
                        quoteKind = undefined;
                    }
                    else if (quoteKind === undefined) {
                        // start quoted string if not in a quoted string.
                        quoteKind = tokenKind;
                    }
                    break;
            }
            // give up at end of input and backtrack to start.
            if (tokenKind === TokenKind.EndOfInput) {
                tokenReader.backtrackToMarker(startMarker);
                return undefined;
            }
            tokenReader.readToken();
        }
        return tokenReader.tryExtractAccumulatedSequence();
    };
    /**
     * Used by `_parseParamBlock()`, this parses a JSDoc expression like `{string}` from
     * an input like `@param {string} x - the X value`.
     */
    NodeParser.prototype._tryParseUnsupportedJSDocType = function (tokenReader, docBlockTag, tagName) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        // do not parse `{@...` as a JSDoc type
        if (tokenReader.peekTokenKind() !== TokenKind.LeftCurlyBracket ||
            tokenReader.peekTokenAfterKind() === TokenKind.AtSign) {
            return undefined;
        }
        var startMarker = tokenReader.createMarker();
        tokenReader.readToken(); // read the "{"
        var jsdocTypeExcerpt = this._tryParseJSDocTypeOrValueRest(tokenReader, TokenKind.LeftCurlyBracket, TokenKind.RightCurlyBracket, startMarker);
        if (jsdocTypeExcerpt) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ParamTagWithInvalidType, 'The ' + tagName + " block should not include a JSDoc-style '{type}'", jsdocTypeExcerpt, docBlockTag);
            var spacingAfterJsdocTypeExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
            if (spacingAfterJsdocTypeExcerpt) {
                jsdocTypeExcerpt = jsdocTypeExcerpt.getNewSequence(jsdocTypeExcerpt.startIndex, spacingAfterJsdocTypeExcerpt.endIndex);
            }
        }
        return jsdocTypeExcerpt;
    };
    /**
     * Used by `_parseParamBlock()`, this parses a JSDoc expression remainder like `=[]]` from
     * an input like `@param {string} [x=[]] - the X value`.
     */
    NodeParser.prototype._tryParseJSDocOptionalNameRest = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        if (tokenReader.peekTokenKind() !== TokenKind.EndOfInput) {
            var startMarker = tokenReader.createMarker();
            return this._tryParseJSDocTypeOrValueRest(tokenReader, TokenKind.LeftSquareBracket, TokenKind.RightSquareBracket, startMarker);
        }
        return undefined;
    };
    NodeParser.prototype._parseParamBlock = function (tokenReader, docBlockTag, tagName) {
        var startMarker = tokenReader.createMarker();
        var spacingBeforeParameterNameExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Skip past a JSDoc type (i.e., '@param {type} paramName') if found, and report a warning.
        var unsupportedJsdocTypeBeforeParameterNameExcerpt = this._tryParseUnsupportedJSDocType(tokenReader, docBlockTag, tagName);
        // Parse opening of invalid JSDoc optional parameter name (e.g., '[')
        var unsupportedJsdocOptionalNameOpenBracketExcerpt;
        if (tokenReader.peekTokenKind() === TokenKind.LeftSquareBracket) {
            tokenReader.readToken(); // read the "["
            unsupportedJsdocOptionalNameOpenBracketExcerpt = tokenReader.extractAccumulatedSequence();
        }
        var parameterName = '';
        var done = false;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.AsciiWord:
                case TokenKind.Period:
                case TokenKind.DollarSign:
                    parameterName += tokenReader.readToken();
                    break;
                default:
                    done = true;
                    break;
            }
        }
        var explanation = StringChecks.explainIfInvalidUnquotedIdentifier(parameterName);
        if (explanation !== undefined) {
            tokenReader.backtrackToMarker(startMarker);
            var errorParamBlock = new DocParamBlock({
                configuration: this._configuration,
                blockTag: docBlockTag,
                parameterName: ''
            });
            var errorMessage = parameterName.length > 0
                ? 'The ' + tagName + ' block should be followed by a valid parameter name: ' + explanation
                : 'The ' + tagName + ' block should be followed by a parameter name';
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ParamTagWithInvalidName, errorMessage, docBlockTag.getTokenSequence(), docBlockTag);
            return errorParamBlock;
        }
        var parameterNameExcerpt = tokenReader.extractAccumulatedSequence();
        // Parse closing of invalid JSDoc optional parameter name (e.g., ']', '=default]').
        var unsupportedJsdocOptionalNameRestExcerpt;
        if (unsupportedJsdocOptionalNameOpenBracketExcerpt) {
            unsupportedJsdocOptionalNameRestExcerpt = this._tryParseJSDocOptionalNameRest(tokenReader);
            var errorSequence = unsupportedJsdocOptionalNameOpenBracketExcerpt;
            if (unsupportedJsdocOptionalNameRestExcerpt) {
                errorSequence = docBlockTag
                    .getTokenSequence()
                    .getNewSequence(unsupportedJsdocOptionalNameOpenBracketExcerpt.startIndex, unsupportedJsdocOptionalNameRestExcerpt.endIndex);
            }
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ParamTagWithInvalidOptionalName, 'The ' +
                tagName +
                " should not include a JSDoc-style optional name; it must not be enclosed in '[ ]' brackets.", errorSequence, docBlockTag);
        }
        var spacingAfterParameterNameExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Skip past a trailing JSDoc type (i.e., '@param paramName {type}') if found, and report a warning.
        var unsupportedJsdocTypeAfterParameterNameExcerpt = this._tryParseUnsupportedJSDocType(tokenReader, docBlockTag, tagName);
        // TODO: Warn if there is no space before or after the hyphen
        var hyphenExcerpt;
        var spacingAfterHyphenExcerpt;
        var unsupportedJsdocTypeAfterHyphenExcerpt;
        if (tokenReader.peekTokenKind() === TokenKind.Hyphen) {
            tokenReader.readToken();
            hyphenExcerpt = tokenReader.extractAccumulatedSequence();
            // TODO: Only read one space
            spacingAfterHyphenExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
            // Skip past a JSDoc type (i.e., '@param paramName - {type}') if found, and report a warning.
            unsupportedJsdocTypeAfterHyphenExcerpt = this._tryParseUnsupportedJSDocType(tokenReader, docBlockTag, tagName);
        }
        else {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ParamTagMissingHyphen, 'The ' + tagName + ' block should be followed by a parameter name and then a hyphen', docBlockTag.getTokenSequence(), docBlockTag);
        }
        return new DocParamBlock({
            parsed: true,
            configuration: this._configuration,
            blockTag: docBlockTag,
            spacingBeforeParameterNameExcerpt: spacingBeforeParameterNameExcerpt,
            unsupportedJsdocTypeBeforeParameterNameExcerpt: unsupportedJsdocTypeBeforeParameterNameExcerpt,
            unsupportedJsdocOptionalNameOpenBracketExcerpt: unsupportedJsdocOptionalNameOpenBracketExcerpt,
            parameterNameExcerpt: parameterNameExcerpt,
            parameterName: parameterName,
            unsupportedJsdocOptionalNameRestExcerpt: unsupportedJsdocOptionalNameRestExcerpt,
            spacingAfterParameterNameExcerpt: spacingAfterParameterNameExcerpt,
            unsupportedJsdocTypeAfterParameterNameExcerpt: unsupportedJsdocTypeAfterParameterNameExcerpt,
            hyphenExcerpt: hyphenExcerpt,
            spacingAfterHyphenExcerpt: spacingAfterHyphenExcerpt,
            unsupportedJsdocTypeAfterHyphenExcerpt: unsupportedJsdocTypeAfterHyphenExcerpt
        });
    };
    NodeParser.prototype._pushNode = function (docNode) {
        if (this._configuration.docNodeManager.isAllowedChild(DocNodeKind.Paragraph, docNode.kind)) {
            this._currentSection.appendNodeInParagraph(docNode);
        }
        else {
            this._currentSection.appendNode(docNode);
        }
    };
    NodeParser.prototype._parseBackslashEscape = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var marker = tokenReader.createMarker();
        tokenReader.readToken(); // read the backslash
        if (tokenReader.peekTokenKind() === TokenKind.EndOfInput) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.UnnecessaryBackslash, 'A backslash must precede another character that is being escaped');
        }
        var escapedToken = tokenReader.readToken(); // read the escaped character
        // In CommonMark, a backslash is only allowed before a punctuation
        // character.  In all other contexts, the backslash is interpreted as a
        // literal character.
        if (!Tokenizer.isPunctuation(escapedToken.kind)) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.UnnecessaryBackslash, 'A backslash can only be used to escape a punctuation character');
        }
        var encodedTextExcerpt = tokenReader.extractAccumulatedSequence();
        return new DocEscapedText({
            parsed: true,
            configuration: this._configuration,
            escapeStyle: EscapeStyle.CommonMarkBackslash,
            encodedTextExcerpt: encodedTextExcerpt,
            decodedText: escapedToken.toString()
        });
    };
    NodeParser.prototype._parseBlockTag = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var marker = tokenReader.createMarker();
        if (tokenReader.peekTokenKind() !== TokenKind.AtSign) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.MissingTag, 'Expecting a TSDoc tag starting with "@"');
        }
        // "@one" is a valid TSDoc tag at the start of a line, but "@one@two" is
        // a syntax error.  For two tags it should be "@one @two", or for literal text it
        // should be "\@one\@two".
        switch (tokenReader.peekPreviousTokenKind()) {
            case TokenKind.EndOfInput:
            case TokenKind.Spacing:
            case TokenKind.Newline:
                break;
            default:
                return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.AtSignInWord, 'The "@" character looks like part of a TSDoc tag; use a backslash to escape it');
        }
        // Include the "@" as part of the tagName
        var tagName = tokenReader.readToken().toString();
        if (tokenReader.peekTokenKind() !== TokenKind.AsciiWord) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.AtSignWithoutTagName, 'Expecting a TSDoc tag name after "@"; if it is not a tag, use a backslash to escape this character');
        }
        var tagNameMarker = tokenReader.createMarker();
        while (tokenReader.peekTokenKind() === TokenKind.AsciiWord) {
            tagName += tokenReader.readToken().toString();
        }
        switch (tokenReader.peekTokenKind()) {
            case TokenKind.Spacing:
            case TokenKind.Newline:
            case TokenKind.EndOfInput:
                break;
            default:
                var badCharacter = tokenReader.peekToken().range.toString()[0];
                return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.CharactersAfterBlockTag, "The token \"".concat(tagName, "\" looks like a TSDoc tag but contains an invalid character") +
                    " ".concat(JSON.stringify(badCharacter), "; if it is not a tag, use a backslash to escape the \"@\""));
        }
        if (StringChecks.explainIfInvalidTSDocTagName(tagName)) {
            var failure = this._createFailureForTokensSince(tokenReader, TSDocMessageId.MalformedTagName, 'A TSDoc tag name must start with a letter and contain only letters and numbers', tagNameMarker);
            return this._backtrackAndCreateErrorForFailure(tokenReader, marker, '', failure);
        }
        return new DocBlockTag({
            parsed: true,
            configuration: this._configuration,
            tagName: tagName,
            tagNameExcerpt: tokenReader.extractAccumulatedSequence()
        });
    };
    NodeParser.prototype._parseInlineTag = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var marker = tokenReader.createMarker();
        if (tokenReader.peekTokenKind() !== TokenKind.LeftCurlyBracket) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.MissingTag, 'Expecting a TSDoc tag starting with "{"');
        }
        tokenReader.readToken();
        var openingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        // For inline tags, if we handle errors by backtracking to the "{"  token, then the main loop
        // will then interpret the "@" as a block tag, which is almost certainly incorrect.  So the
        // DocErrorText needs to include both the "{" and "@" tokens.
        // We will use _backtrackAndCreateErrorRangeForFailure() for that.
        var atSignMarker = tokenReader.createMarker();
        if (tokenReader.peekTokenKind() !== TokenKind.AtSign) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.MalformedInlineTag, 'Expecting a TSDoc tag starting with "{@"');
        }
        // Include the "@" as part of the tagName
        var tagName = tokenReader.readToken().toString();
        while (tokenReader.peekTokenKind() === TokenKind.AsciiWord) {
            tagName += tokenReader.readToken().toString();
        }
        if (tagName === '@') {
            // This is an unusual case
            var failure = this._createFailureForTokensSince(tokenReader, TSDocMessageId.MalformedInlineTag, 'Expecting a TSDoc inline tag name after the "{@" characters', atSignMarker);
            return this._backtrackAndCreateErrorRangeForFailure(tokenReader, marker, atSignMarker, '', failure);
        }
        if (StringChecks.explainIfInvalidTSDocTagName(tagName)) {
            var failure = this._createFailureForTokensSince(tokenReader, TSDocMessageId.MalformedTagName, 'A TSDoc tag name must start with a letter and contain only letters and numbers', atSignMarker);
            return this._backtrackAndCreateErrorRangeForFailure(tokenReader, marker, atSignMarker, '', failure);
        }
        var tagNameExcerpt = tokenReader.extractAccumulatedSequence();
        var spacingAfterTagNameExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        if (spacingAfterTagNameExcerpt === undefined) {
            // If there were no spaces at all, that's an error unless it's the degenerate "{@tag}" case
            if (tokenReader.peekTokenKind() !== TokenKind.RightCurlyBracket) {
                var badCharacter = tokenReader.peekToken().range.toString()[0];
                var failure = this._createFailureForToken(tokenReader, TSDocMessageId.CharactersAfterInlineTag, "The character ".concat(JSON.stringify(badCharacter), " cannot appear after the TSDoc tag name; expecting a space"));
                return this._backtrackAndCreateErrorRangeForFailure(tokenReader, marker, atSignMarker, '', failure);
            }
        }
        var done = false;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.EndOfInput:
                    return this._backtrackAndCreateErrorRange(tokenReader, marker, atSignMarker, TSDocMessageId.InlineTagMissingRightBrace, 'The TSDoc inline tag name is missing its closing "}"');
                case TokenKind.Backslash:
                    // http://usejsdoc.org/about-block-inline-tags.html
                    // "If your tag's text includes a closing curly brace (}), you must escape it with
                    // a leading backslash (\)."
                    tokenReader.readToken(); // discard the backslash
                    // In CommonMark, a backslash is only allowed before a punctuation
                    // character.  In all other contexts, the backslash is interpreted as a
                    // literal character.
                    if (!Tokenizer.isPunctuation(tokenReader.peekTokenKind())) {
                        var failure = this._createFailureForToken(tokenReader, TSDocMessageId.UnnecessaryBackslash, 'A backslash can only be used to escape a punctuation character');
                        return this._backtrackAndCreateErrorRangeForFailure(tokenReader, marker, atSignMarker, 'Error reading inline TSDoc tag: ', failure);
                    }
                    tokenReader.readToken();
                    break;
                case TokenKind.LeftCurlyBracket: {
                    var failure = this._createFailureForToken(tokenReader, TSDocMessageId.InlineTagUnescapedBrace, 'The "{" character must be escaped with a backslash when used inside a TSDoc inline tag');
                    return this._backtrackAndCreateErrorRangeForFailure(tokenReader, marker, atSignMarker, '', failure);
                }
                case TokenKind.RightCurlyBracket:
                    done = true;
                    break;
                default:
                    tokenReader.readToken();
                    break;
            }
        }
        var tagContentExcerpt = tokenReader.tryExtractAccumulatedSequence();
        // Read the right curly bracket
        tokenReader.readToken();
        var closingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        var docInlineTagParsedParameters = {
            parsed: true,
            configuration: this._configuration,
            openingDelimiterExcerpt: openingDelimiterExcerpt,
            tagNameExcerpt: tagNameExcerpt,
            tagName: tagName,
            spacingAfterTagNameExcerpt: spacingAfterTagNameExcerpt,
            tagContentExcerpt: tagContentExcerpt,
            closingDelimiterExcerpt: closingDelimiterExcerpt
        };
        var tagNameWithUpperCase = tagName.toUpperCase();
        // Create a new TokenReader that will reparse the tokens corresponding to the tagContent.
        var embeddedTokenReader = new TokenReader(this._parserContext, tagContentExcerpt ? tagContentExcerpt : TokenSequence.createEmpty(this._parserContext));
        var docNode;
        switch (tagNameWithUpperCase) {
            case StandardTags.inheritDoc.tagNameWithUpperCase:
                docNode = this._parseInheritDocTag(docInlineTagParsedParameters, embeddedTokenReader);
                break;
            case StandardTags.link.tagNameWithUpperCase:
                docNode = this._parseLinkTag(docInlineTagParsedParameters, embeddedTokenReader);
                break;
            default:
                docNode = new DocInlineTag(docInlineTagParsedParameters);
        }
        // Validate the tag
        var tagDefinition = this._parserContext.configuration.tryGetTagDefinitionWithUpperCase(tagNameWithUpperCase);
        this._validateTagDefinition(tagDefinition, tagName, 
        /* expectingInlineTag */ true, tagNameExcerpt, docNode);
        return docNode;
    };
    NodeParser.prototype._parseInheritDocTag = function (docInlineTagParsedParameters, embeddedTokenReader) {
        // If an error occurs, then return a generic DocInlineTag instead of DocInheritDocTag
        var errorTag = new DocInlineTag(docInlineTagParsedParameters);
        var parameters = __assign({}, docInlineTagParsedParameters);
        if (embeddedTokenReader.peekTokenKind() !== TokenKind.EndOfInput) {
            parameters.declarationReference = this._parseDeclarationReference(embeddedTokenReader, docInlineTagParsedParameters.tagNameExcerpt, errorTag);
            if (!parameters.declarationReference) {
                return errorTag;
            }
            if (embeddedTokenReader.peekTokenKind() !== TokenKind.EndOfInput) {
                embeddedTokenReader.readToken();
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.InheritDocTagSyntax, 'Unexpected character after declaration reference', embeddedTokenReader.extractAccumulatedSequence(), errorTag);
                return errorTag;
            }
        }
        return new DocInheritDocTag(parameters);
    };
    NodeParser.prototype._parseLinkTag = function (docInlineTagParsedParameters, embeddedTokenReader) {
        // If an error occurs, then return a generic DocInlineTag instead of DocInheritDocTag
        var errorTag = new DocInlineTag(docInlineTagParsedParameters);
        var parameters = __assign({}, docInlineTagParsedParameters);
        if (!docInlineTagParsedParameters.tagContentExcerpt) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.LinkTagEmpty, 'The @link tag content is missing', parameters.tagNameExcerpt, errorTag);
            return errorTag;
        }
        // Is the link destination a URL or a declaration reference?
        //
        // The JSDoc "@link" tag allows URLs, however supporting full URLs would be highly
        // ambiguous, for example "microsoft.windows.camera:" is an actual valid URI scheme,
        // and even the common "mailto:example.com" looks suspiciously like a declaration reference.
        // In practice JSDoc URLs are nearly always HTTP or HTTPS, so it seems fairly reasonable to
        // require the URL to have "://" and a scheme without any punctuation in it.  If a more exotic
        // URL is needed, the HTML "<a>" tag can always be used.
        // We start with a fairly broad classifier heuristic, and then the parsers will refine this:
        // 1. Does it start with "//"?
        // 2. Does it contain "://"?
        var looksLikeUrl = embeddedTokenReader.peekTokenKind() === TokenKind.Slash &&
            embeddedTokenReader.peekTokenAfterKind() === TokenKind.Slash;
        var marker = embeddedTokenReader.createMarker();
        var done = looksLikeUrl;
        while (!done) {
            switch (embeddedTokenReader.peekTokenKind()) {
                // An URI scheme can contain letters, numbers, minus, plus, and periods
                case TokenKind.AsciiWord:
                case TokenKind.Period:
                case TokenKind.Hyphen:
                case TokenKind.Plus:
                    embeddedTokenReader.readToken();
                    break;
                case TokenKind.Colon:
                    embeddedTokenReader.readToken();
                    // Once we a reach a colon, then it's a URL only if we see "://"
                    looksLikeUrl =
                        embeddedTokenReader.peekTokenKind() === TokenKind.Slash &&
                            embeddedTokenReader.peekTokenAfterKind() === TokenKind.Slash;
                    done = true;
                    break;
                default:
                    done = true;
            }
        }
        embeddedTokenReader.backtrackToMarker(marker);
        // Is the hyperlink a URL or a declaration reference?
        if (looksLikeUrl) {
            // It starts with something like "http://", so parse it as a URL
            if (!this._parseLinkTagUrlDestination(embeddedTokenReader, parameters, docInlineTagParsedParameters.tagNameExcerpt, errorTag)) {
                return errorTag;
            }
        }
        else {
            // Otherwise, assume it's a declaration reference
            if (!this._parseLinkTagCodeDestination(embeddedTokenReader, parameters, docInlineTagParsedParameters.tagNameExcerpt, errorTag)) {
                return errorTag;
            }
        }
        if (embeddedTokenReader.peekTokenKind() === TokenKind.Spacing) {
            // The above parser rules should have consumed any spacing before the pipe
            throw new Error('Unconsumed spacing encountered after construct');
        }
        if (embeddedTokenReader.peekTokenKind() === TokenKind.Pipe) {
            // Read the link text
            embeddedTokenReader.readToken();
            parameters.pipeExcerpt = embeddedTokenReader.extractAccumulatedSequence();
            parameters.spacingAfterPipeExcerpt = this._tryReadSpacingAndNewlines(embeddedTokenReader);
            // Read everything until the end
            // NOTE: Because we're using an embedded TokenReader, the TokenKind.EndOfInput occurs
            // when we reach the "}", not the end of the original input
            done = false;
            var spacingAfterLinkTextMarker = undefined;
            while (!done) {
                switch (embeddedTokenReader.peekTokenKind()) {
                    case TokenKind.EndOfInput:
                        done = true;
                        break;
                    case TokenKind.Pipe:
                    case TokenKind.LeftCurlyBracket:
                        var badCharacter = embeddedTokenReader.readToken().toString();
                        this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.LinkTagUnescapedText, "The \"".concat(badCharacter, "\" character may not be used in the link text without escaping it"), embeddedTokenReader.extractAccumulatedSequence(), errorTag);
                        return errorTag;
                    case TokenKind.Spacing:
                    case TokenKind.Newline:
                        embeddedTokenReader.readToken();
                        break;
                    default:
                        // We found a non-spacing character, so move the spacingAfterLinkTextMarker
                        spacingAfterLinkTextMarker = embeddedTokenReader.createMarker() + 1;
                        embeddedTokenReader.readToken();
                }
            }
            var linkTextAndSpacing = embeddedTokenReader.tryExtractAccumulatedSequence();
            if (linkTextAndSpacing) {
                if (spacingAfterLinkTextMarker === undefined) {
                    // We never found any non-spacing characters, so everything is trailing spacing
                    parameters.spacingAfterLinkTextExcerpt = linkTextAndSpacing;
                }
                else if (spacingAfterLinkTextMarker >= linkTextAndSpacing.endIndex) {
                    // We found no trailing spacing, so everything we found is the text
                    parameters.linkTextExcerpt = linkTextAndSpacing;
                }
                else {
                    // Split the trailing spacing from the link text
                    parameters.linkTextExcerpt = linkTextAndSpacing.getNewSequence(linkTextAndSpacing.startIndex, spacingAfterLinkTextMarker);
                    parameters.spacingAfterLinkTextExcerpt = linkTextAndSpacing.getNewSequence(spacingAfterLinkTextMarker, linkTextAndSpacing.endIndex);
                }
            }
        }
        else if (embeddedTokenReader.peekTokenKind() !== TokenKind.EndOfInput) {
            embeddedTokenReader.readToken();
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.LinkTagDestinationSyntax, 'Unexpected character after link destination', embeddedTokenReader.extractAccumulatedSequence(), errorTag);
            return errorTag;
        }
        return new DocLinkTag(parameters);
    };
    NodeParser.prototype._parseLinkTagUrlDestination = function (embeddedTokenReader, parameters, tokenSequenceForErrorContext, nodeForErrorContext) {
        // Simply accumulate everything up to the next space. We won't try to implement a proper
        // URI parser here.
        var urlDestination = '';
        var done = false;
        while (!done) {
            switch (embeddedTokenReader.peekTokenKind()) {
                case TokenKind.Spacing:
                case TokenKind.Newline:
                case TokenKind.EndOfInput:
                case TokenKind.Pipe:
                case TokenKind.RightCurlyBracket:
                    done = true;
                    break;
                default:
                    urlDestination += embeddedTokenReader.readToken();
                    break;
            }
        }
        if (urlDestination.length === 0) {
            // This should be impossible since the caller ensures that peekTokenKind() === TokenKind.AsciiWord
            throw new Error('Missing URL in _parseLinkTagUrlDestination()');
        }
        var urlDestinationExcerpt = embeddedTokenReader.extractAccumulatedSequence();
        var invalidUrlExplanation = StringChecks.explainIfInvalidLinkUrl(urlDestination);
        if (invalidUrlExplanation) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.LinkTagInvalidUrl, invalidUrlExplanation, urlDestinationExcerpt, nodeForErrorContext);
            return false;
        }
        parameters.urlDestinationExcerpt = urlDestinationExcerpt;
        parameters.spacingAfterDestinationExcerpt = this._tryReadSpacingAndNewlines(embeddedTokenReader);
        return true;
    };
    NodeParser.prototype._parseLinkTagCodeDestination = function (embeddedTokenReader, parameters, tokenSequenceForErrorContext, nodeForErrorContext) {
        parameters.codeDestination = this._parseDeclarationReference(embeddedTokenReader, tokenSequenceForErrorContext, nodeForErrorContext);
        return !!parameters.codeDestination;
    };
    NodeParser.prototype._parseDeclarationReference = function (tokenReader, tokenSequenceForErrorContext, nodeForErrorContext) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        // The package name can contain characters that look like a member reference.  This means we need to scan forwards
        // to see if there is a "#".  However, we need to be careful not to match a "#" that is part of a quoted expression.
        var marker = tokenReader.createMarker();
        var hasHash = false;
        // A common mistake is to forget the "#" for package name or import path.  The telltale sign
        // of this is mistake is that we see path-only characters such as "@" or "/" in the beginning
        // where this would be a syntax error for a member reference.
        var lookingForImportCharacters = true;
        var sawImportCharacters = false;
        var done = false;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.DoubleQuote:
                case TokenKind.EndOfInput:
                case TokenKind.LeftCurlyBracket:
                case TokenKind.LeftParenthesis:
                case TokenKind.LeftSquareBracket:
                case TokenKind.Newline:
                case TokenKind.Pipe:
                case TokenKind.RightCurlyBracket:
                case TokenKind.RightParenthesis:
                case TokenKind.RightSquareBracket:
                case TokenKind.SingleQuote:
                case TokenKind.Spacing:
                    done = true;
                    break;
                case TokenKind.PoundSymbol:
                    hasHash = true;
                    done = true;
                    break;
                case TokenKind.Slash:
                case TokenKind.AtSign:
                    if (lookingForImportCharacters) {
                        sawImportCharacters = true;
                    }
                    tokenReader.readToken();
                    break;
                case TokenKind.AsciiWord:
                case TokenKind.Period:
                case TokenKind.Hyphen:
                    // It's a character that looks like part of a package name or import path,
                    // so don't set lookingForImportCharacters = false
                    tokenReader.readToken();
                    break;
                default:
                    // Once we reach something other than AsciiWord and Period, then the meaning of
                    // slashes and at-signs is no longer obvious.
                    lookingForImportCharacters = false;
                    tokenReader.readToken();
            }
        }
        if (!hasHash && sawImportCharacters) {
            // We saw characters that will be a syntax error if interpreted as a member reference,
            // but would make sense as a package name or import path, but we did not find a "#"
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingHash, 'The declaration reference appears to contain a package name or import path,' +
                ' but it is missing the "#" delimiter', tokenReader.extractAccumulatedSequence(), nodeForErrorContext);
            return undefined;
        }
        tokenReader.backtrackToMarker(marker);
        var packageNameExcerpt;
        var importPathExcerpt;
        var importHashExcerpt;
        var spacingAfterImportHashExcerpt;
        if (hasHash) {
            // If it starts with a "." then it's a relative path, not a package name
            if (tokenReader.peekTokenKind() !== TokenKind.Period) {
                // Read the package name:
                var scopedPackageName = tokenReader.peekTokenKind() === TokenKind.AtSign;
                var finishedScope = false;
                done = false;
                while (!done) {
                    switch (tokenReader.peekTokenKind()) {
                        case TokenKind.EndOfInput:
                            // If hasHash=true, then we are expecting to stop when we reach the hash
                            throw new Error('Expecting pound symbol');
                        case TokenKind.Slash:
                            // Stop at the first slash, unless this is a scoped package, in which case we stop at the second slash
                            if (scopedPackageName && !finishedScope) {
                                tokenReader.readToken();
                                finishedScope = true;
                            }
                            else {
                                done = true;
                            }
                            break;
                        case TokenKind.PoundSymbol:
                            done = true;
                            break;
                        default:
                            tokenReader.readToken();
                    }
                }
                if (!tokenReader.isAccumulatedSequenceEmpty()) {
                    packageNameExcerpt = tokenReader.extractAccumulatedSequence();
                    // Check that the packageName is syntactically valid
                    var explanation = StringChecks.explainIfInvalidPackageName(packageNameExcerpt.toString());
                    if (explanation) {
                        this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMalformedPackageName, explanation, packageNameExcerpt, nodeForErrorContext);
                        return undefined;
                    }
                }
            }
            // Read the import path:
            done = false;
            while (!done) {
                switch (tokenReader.peekTokenKind()) {
                    case TokenKind.EndOfInput:
                        // If hasHash=true, then we are expecting to stop when we reach the hash
                        throw new Error('Expecting pound symbol');
                    case TokenKind.PoundSymbol:
                        done = true;
                        break;
                    default:
                        tokenReader.readToken();
                }
            }
            if (!tokenReader.isAccumulatedSequenceEmpty()) {
                importPathExcerpt = tokenReader.extractAccumulatedSequence();
                // Check that the importPath is syntactically valid
                var explanation = StringChecks.explainIfInvalidImportPath(importPathExcerpt.toString(), !!packageNameExcerpt);
                if (explanation) {
                    this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMalformedImportPath, explanation, importPathExcerpt, nodeForErrorContext);
                    return undefined;
                }
            }
            // Read the import hash
            if (tokenReader.peekTokenKind() !== TokenKind.PoundSymbol) {
                // The above logic should have left us at the PoundSymbol
                throw new Error('Expecting pound symbol');
            }
            tokenReader.readToken();
            importHashExcerpt = tokenReader.extractAccumulatedSequence();
            spacingAfterImportHashExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
            if (packageNameExcerpt === undefined && importPathExcerpt === undefined) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceHashSyntax, 'The hash character must be preceded by a package name or import path', importHashExcerpt, nodeForErrorContext);
                return undefined;
            }
        }
        // Read the member references:
        var memberReferences = [];
        done = false;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.Period:
                case TokenKind.LeftParenthesis:
                case TokenKind.AsciiWord:
                case TokenKind.Colon:
                case TokenKind.LeftSquareBracket:
                case TokenKind.DoubleQuote:
                    var expectingDot = memberReferences.length > 0;
                    var memberReference = this._parseMemberReference(tokenReader, expectingDot, tokenSequenceForErrorContext, nodeForErrorContext);
                    if (!memberReference) {
                        return undefined;
                    }
                    memberReferences.push(memberReference);
                    break;
                default:
                    done = true;
            }
        }
        if (packageNameExcerpt === undefined &&
            importPathExcerpt === undefined &&
            memberReferences.length === 0) {
            // We didn't find any parts of a declaration reference
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.MissingReference, 'Expecting a declaration reference', tokenSequenceForErrorContext, nodeForErrorContext);
            return undefined;
        }
        return new DocDeclarationReference({
            parsed: true,
            configuration: this._configuration,
            packageNameExcerpt: packageNameExcerpt,
            importPathExcerpt: importPathExcerpt,
            importHashExcerpt: importHashExcerpt,
            spacingAfterImportHashExcerpt: spacingAfterImportHashExcerpt,
            memberReferences: memberReferences
        });
    };
    NodeParser.prototype._parseMemberReference = function (tokenReader, expectingDot, tokenSequenceForErrorContext, nodeForErrorContext) {
        var parameters = {
            parsed: true,
            configuration: this._configuration
        };
        // Read the dot operator
        if (expectingDot) {
            if (tokenReader.peekTokenKind() !== TokenKind.Period) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingDot, 'Expecting a period before the next component of a declaration reference', tokenSequenceForErrorContext, nodeForErrorContext);
                return undefined;
            }
            tokenReader.readToken();
            parameters.dotExcerpt = tokenReader.extractAccumulatedSequence();
            parameters.spacingAfterDotExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        }
        // Read the left parenthesis if there is one
        if (tokenReader.peekTokenKind() === TokenKind.LeftParenthesis) {
            tokenReader.readToken();
            parameters.leftParenthesisExcerpt = tokenReader.extractAccumulatedSequence();
            parameters.spacingAfterLeftParenthesisExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        }
        // Read the member identifier or symbol
        if (tokenReader.peekTokenKind() === TokenKind.LeftSquareBracket) {
            parameters.memberSymbol = this._parseMemberSymbol(tokenReader, nodeForErrorContext);
            if (!parameters.memberSymbol) {
                return undefined;
            }
        }
        else {
            parameters.memberIdentifier = this._parseMemberIdentifier(tokenReader, tokenSequenceForErrorContext, nodeForErrorContext);
            if (!parameters.memberIdentifier) {
                return undefined;
            }
        }
        parameters.spacingAfterMemberExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Read the colon
        if (tokenReader.peekTokenKind() === TokenKind.Colon) {
            tokenReader.readToken();
            parameters.colonExcerpt = tokenReader.extractAccumulatedSequence();
            parameters.spacingAfterColonExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
            if (!parameters.leftParenthesisExcerpt) {
                // In the current TSDoc draft standard, a member reference with a selector requires the parentheses.
                // It would be reasonable to make the parentheses optional, and we are contemplating simplifying the
                // notation in the future.  But for now the parentheses are required.
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceSelectorMissingParens, 'Syntax error in declaration reference: the member selector must be enclosed in parentheses', parameters.colonExcerpt, nodeForErrorContext);
                return undefined;
            }
            // If there is a colon, then read the selector
            parameters.selector = this._parseMemberSelector(tokenReader, parameters.colonExcerpt, nodeForErrorContext);
            if (!parameters.selector) {
                return undefined;
            }
            parameters.spacingAfterSelectorExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        }
        else {
            if (parameters.leftParenthesisExcerpt) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingColon, 'Expecting a colon after the identifier because the expression is in parentheses', parameters.leftParenthesisExcerpt, nodeForErrorContext);
                return undefined;
            }
        }
        // Read the right parenthesis
        if (parameters.leftParenthesisExcerpt) {
            if (tokenReader.peekTokenKind() !== TokenKind.RightParenthesis) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingRightParen, 'Expecting a matching right parenthesis', parameters.leftParenthesisExcerpt, nodeForErrorContext);
                return undefined;
            }
            tokenReader.readToken();
            parameters.rightParenthesisExcerpt = tokenReader.extractAccumulatedSequence();
            parameters.spacingAfterRightParenthesisExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        }
        return new DocMemberReference(parameters);
    };
    NodeParser.prototype._parseMemberSymbol = function (tokenReader, nodeForErrorContext) {
        // Read the "["
        if (tokenReader.peekTokenKind() !== TokenKind.LeftSquareBracket) {
            // This should be impossible since the caller ensures that peekTokenKind() === TokenKind.LeftSquareBracket
            throw new Error('Expecting "["');
        }
        tokenReader.readToken();
        var leftBracketExcerpt = tokenReader.extractAccumulatedSequence();
        var spacingAfterLeftBracketExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Read the declaration reference
        var declarationReference = this._parseDeclarationReference(tokenReader, leftBracketExcerpt, nodeForErrorContext);
        if (!declarationReference) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceSymbolSyntax, 'Missing declaration reference in symbol reference', leftBracketExcerpt, nodeForErrorContext);
            return undefined;
        }
        // (We don't need to worry about spacing here since _parseDeclarationReference() absorbs trailing spaces)
        // Read the "]"
        if (tokenReader.peekTokenKind() !== TokenKind.RightSquareBracket) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingRightBracket, 'Missing closing square bracket for symbol reference', leftBracketExcerpt, nodeForErrorContext);
            return undefined;
        }
        tokenReader.readToken();
        var rightBracketExcerpt = tokenReader.extractAccumulatedSequence();
        return new DocMemberSymbol({
            parsed: true,
            configuration: this._configuration,
            leftBracketExcerpt: leftBracketExcerpt,
            spacingAfterLeftBracketExcerpt: spacingAfterLeftBracketExcerpt,
            symbolReference: declarationReference,
            rightBracketExcerpt: rightBracketExcerpt
        });
    };
    NodeParser.prototype._parseMemberIdentifier = function (tokenReader, tokenSequenceForErrorContext, nodeForErrorContext) {
        var leftQuoteExcerpt = undefined;
        var rightQuoteExcerpt = undefined;
        // Is this a quoted identifier?
        if (tokenReader.peekTokenKind() === TokenKind.DoubleQuote) {
            // Read the opening '"'
            tokenReader.readToken();
            leftQuoteExcerpt = tokenReader.extractAccumulatedSequence();
            // Read the text inside the quotes
            while (tokenReader.peekTokenKind() !== TokenKind.DoubleQuote) {
                if (tokenReader.peekTokenKind() === TokenKind.EndOfInput) {
                    this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingQuote, 'Unexpected end of input inside quoted member identifier', leftQuoteExcerpt, nodeForErrorContext);
                    return undefined;
                }
                tokenReader.readToken();
            }
            if (tokenReader.isAccumulatedSequenceEmpty()) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceEmptyIdentifier, 'The quoted identifier cannot be empty', leftQuoteExcerpt, nodeForErrorContext);
                return undefined;
            }
            var identifierExcerpt = tokenReader.extractAccumulatedSequence();
            // Read the closing '""
            tokenReader.readToken(); // read the quote
            rightQuoteExcerpt = tokenReader.extractAccumulatedSequence();
            return new DocMemberIdentifier({
                parsed: true,
                configuration: this._configuration,
                leftQuoteExcerpt: leftQuoteExcerpt,
                identifierExcerpt: identifierExcerpt,
                rightQuoteExcerpt: rightQuoteExcerpt
            });
        }
        else {
            // Otherwise assume it's a valid TypeScript identifier
            var done = false;
            while (!done) {
                switch (tokenReader.peekTokenKind()) {
                    case TokenKind.AsciiWord:
                    case TokenKind.DollarSign:
                        tokenReader.readToken();
                        break;
                    default:
                        done = true;
                        break;
                }
            }
            if (tokenReader.isAccumulatedSequenceEmpty()) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingIdentifier, 'Syntax error in declaration reference: expecting a member identifier', tokenSequenceForErrorContext, nodeForErrorContext);
                return undefined;
            }
            var identifierExcerpt = tokenReader.extractAccumulatedSequence();
            var identifier = identifierExcerpt.toString();
            var explanation = StringChecks.explainIfInvalidUnquotedMemberIdentifier(identifier);
            if (explanation) {
                this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceUnquotedIdentifier, explanation, identifierExcerpt, nodeForErrorContext);
                return undefined;
            }
            return new DocMemberIdentifier({
                parsed: true,
                configuration: this._configuration,
                leftQuoteExcerpt: leftQuoteExcerpt,
                identifierExcerpt: identifierExcerpt,
                rightQuoteExcerpt: rightQuoteExcerpt
            });
        }
    };
    NodeParser.prototype._parseMemberSelector = function (tokenReader, tokenSequenceForErrorContext, nodeForErrorContext) {
        if (tokenReader.peekTokenKind() !== TokenKind.AsciiWord) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceMissingLabel, 'Expecting a selector label after the colon', tokenSequenceForErrorContext, nodeForErrorContext);
        }
        var selector = tokenReader.readToken().toString();
        var selectorExcerpt = tokenReader.extractAccumulatedSequence();
        var docMemberSelector = new DocMemberSelector({
            parsed: true,
            configuration: this._configuration,
            selectorExcerpt: selectorExcerpt,
            selector: selector
        });
        if (docMemberSelector.errorMessage) {
            this._parserContext.log.addMessageForTokenSequence(TSDocMessageId.ReferenceSelectorSyntax, docMemberSelector.errorMessage, selectorExcerpt, nodeForErrorContext);
            return undefined;
        }
        return docMemberSelector;
    };
    NodeParser.prototype._parseHtmlStartTag = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var marker = tokenReader.createMarker();
        // Read the "<" delimiter
        var lessThanToken = tokenReader.readToken();
        if (lessThanToken.kind !== TokenKind.LessThan) {
            // This would be a parser bug -- the caller of _parseHtmlStartTag() should have verified this while
            // looking ahead
            throw new Error('Expecting an HTML tag starting with "<"');
        }
        // NOTE: CommonMark does not permit whitespace after the "<"
        var openingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        // Read the element name
        var nameExcerpt = this._parseHtmlName(tokenReader);
        if (isFailure(nameExcerpt)) {
            return this._backtrackAndCreateErrorForFailure(tokenReader, marker, 'Invalid HTML element: ', nameExcerpt);
        }
        var spacingAfterNameExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        var htmlAttributes = [];
        // Read the attributes until we see a ">" or "/>"
        while (tokenReader.peekTokenKind() === TokenKind.AsciiWord) {
            // Read the attribute
            var attributeNode = this._parseHtmlAttribute(tokenReader);
            if (isFailure(attributeNode)) {
                return this._backtrackAndCreateErrorForFailure(tokenReader, marker, 'The HTML element has an invalid attribute: ', attributeNode);
            }
            htmlAttributes.push(attributeNode);
        }
        // Read the closing "/>" or ">" as the Excerpt.suffix
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var endDelimiterMarker = tokenReader.createMarker();
        var selfClosingTag = false;
        if (tokenReader.peekTokenKind() === TokenKind.Slash) {
            tokenReader.readToken();
            selfClosingTag = true;
        }
        if (tokenReader.peekTokenKind() !== TokenKind.GreaterThan) {
            var failure = this._createFailureForTokensSince(tokenReader, TSDocMessageId.HtmlTagMissingGreaterThan, 'Expecting an attribute or ">" or "/>"', endDelimiterMarker);
            return this._backtrackAndCreateErrorForFailure(tokenReader, marker, 'The HTML tag has invalid syntax: ', failure);
        }
        tokenReader.readToken();
        var closingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        // NOTE: We don't read excerptParameters.separator here, since if there is any it
        // will be represented as DocPlainText.
        return new DocHtmlStartTag({
            parsed: true,
            configuration: this._configuration,
            openingDelimiterExcerpt: openingDelimiterExcerpt,
            nameExcerpt: nameExcerpt,
            spacingAfterNameExcerpt: spacingAfterNameExcerpt,
            htmlAttributes: htmlAttributes,
            selfClosingTag: selfClosingTag,
            closingDelimiterExcerpt: closingDelimiterExcerpt
        });
    };
    NodeParser.prototype._parseHtmlAttribute = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        // Read the attribute name
        var nameExcerpt = this._parseHtmlName(tokenReader);
        if (isFailure(nameExcerpt)) {
            return nameExcerpt;
        }
        var spacingAfterNameExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Read the equals
        if (tokenReader.peekTokenKind() !== TokenKind.Equals) {
            return this._createFailureForToken(tokenReader, TSDocMessageId.HtmlTagMissingEquals, 'Expecting "=" after HTML attribute name');
        }
        tokenReader.readToken();
        var equalsExcerpt = tokenReader.extractAccumulatedSequence();
        var spacingAfterEqualsExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Read the attribute value
        var attributeValue = this._parseHtmlString(tokenReader);
        if (isFailure(attributeValue)) {
            return attributeValue;
        }
        var valueExcerpt = tokenReader.extractAccumulatedSequence();
        var spacingAfterValueExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        return new DocHtmlAttribute({
            parsed: true,
            configuration: this._configuration,
            nameExcerpt: nameExcerpt,
            spacingAfterNameExcerpt: spacingAfterNameExcerpt,
            equalsExcerpt: equalsExcerpt,
            spacingAfterEqualsExcerpt: spacingAfterEqualsExcerpt,
            valueExcerpt: valueExcerpt,
            spacingAfterValueExcerpt: spacingAfterValueExcerpt
        });
    };
    NodeParser.prototype._parseHtmlString = function (tokenReader) {
        var marker = tokenReader.createMarker();
        var quoteTokenKind = tokenReader.peekTokenKind();
        if (quoteTokenKind !== TokenKind.DoubleQuote && quoteTokenKind !== TokenKind.SingleQuote) {
            return this._createFailureForToken(tokenReader, TSDocMessageId.HtmlTagMissingString, 'Expecting an HTML string starting with a single-quote or double-quote character');
        }
        tokenReader.readToken();
        var textWithoutQuotes = '';
        for (;;) {
            var peekedTokenKind = tokenReader.peekTokenKind();
            // Did we find the matching token?
            if (peekedTokenKind === quoteTokenKind) {
                tokenReader.readToken(); // extract the quote
                break;
            }
            if (peekedTokenKind === TokenKind.EndOfInput || peekedTokenKind === TokenKind.Newline) {
                return this._createFailureForToken(tokenReader, TSDocMessageId.HtmlStringMissingQuote, 'The HTML string is missing its closing quote', marker);
            }
            textWithoutQuotes += tokenReader.readToken().toString();
        }
        // The next attribute cannot start immediately after this one
        if (tokenReader.peekTokenKind() === TokenKind.AsciiWord) {
            return this._createFailureForToken(tokenReader, TSDocMessageId.TextAfterHtmlString, 'The next character after a closing quote must be spacing or punctuation');
        }
        return textWithoutQuotes;
    };
    NodeParser.prototype._parseHtmlEndTag = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var marker = tokenReader.createMarker();
        // Read the "</" delimiter
        var lessThanToken = tokenReader.peekToken();
        if (lessThanToken.kind !== TokenKind.LessThan) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.MissingHtmlEndTag, 'Expecting an HTML tag starting with "</"');
        }
        tokenReader.readToken();
        var slashToken = tokenReader.peekToken();
        if (slashToken.kind !== TokenKind.Slash) {
            return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.MissingHtmlEndTag, 'Expecting an HTML tag starting with "</"');
        }
        tokenReader.readToken();
        // NOTE: Spaces are not permitted here
        // https://www.w3.org/TR/html5/syntax.html#end-tags
        var openingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        // Read the tag name
        var nameExcerpt = this._parseHtmlName(tokenReader);
        if (isFailure(nameExcerpt)) {
            return this._backtrackAndCreateErrorForFailure(tokenReader, marker, 'Expecting an HTML element name: ', nameExcerpt);
        }
        var spacingAfterNameExcerpt = this._tryReadSpacingAndNewlines(tokenReader);
        // Read the closing ">"
        if (tokenReader.peekTokenKind() !== TokenKind.GreaterThan) {
            var failure = this._createFailureForToken(tokenReader, TSDocMessageId.HtmlTagMissingGreaterThan, 'Expecting a closing ">" for the HTML tag');
            return this._backtrackAndCreateErrorForFailure(tokenReader, marker, '', failure);
        }
        tokenReader.readToken();
        var closingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        return new DocHtmlEndTag({
            parsed: true,
            configuration: this._configuration,
            openingDelimiterExcerpt: openingDelimiterExcerpt,
            nameExcerpt: nameExcerpt,
            spacingAfterNameExcerpt: spacingAfterNameExcerpt,
            closingDelimiterExcerpt: closingDelimiterExcerpt
        });
    };
    /**
     * Parses an HTML name such as an element name or attribute name.
     */
    NodeParser.prototype._parseHtmlName = function (tokenReader) {
        var marker = tokenReader.createMarker();
        if (tokenReader.peekTokenKind() === TokenKind.Spacing) {
            return this._createFailureForTokensSince(tokenReader, TSDocMessageId.MalformedHtmlName, 'A space is not allowed here', marker);
        }
        var done = false;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.Hyphen:
                case TokenKind.Period:
                case TokenKind.AsciiWord:
                    tokenReader.readToken();
                    break;
                default:
                    done = true;
                    break;
            }
        }
        var excerpt = tokenReader.tryExtractAccumulatedSequence();
        if (!excerpt) {
            return this._createFailureForToken(tokenReader, TSDocMessageId.MalformedHtmlName, 'Expecting an HTML name');
        }
        var htmlName = excerpt.toString();
        var explanation = StringChecks.explainIfInvalidHtmlName(htmlName);
        if (explanation) {
            return this._createFailureForTokensSince(tokenReader, TSDocMessageId.MalformedHtmlName, explanation, marker);
        }
        if (this._configuration.validation.reportUnsupportedHtmlElements &&
            !this._configuration.isHtmlElementSupported(htmlName)) {
            return this._createFailureForToken(tokenReader, TSDocMessageId.UnsupportedHtmlElementName, "The HTML element name ".concat(JSON.stringify(htmlName), " is not defined by your TSDoc configuration"), marker);
        }
        return excerpt;
    };
    NodeParser.prototype._parseFencedCode = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var startMarker = tokenReader.createMarker();
        var endOfOpeningDelimiterMarker = startMarker + 2;
        switch (tokenReader.peekPreviousTokenKind()) {
            case TokenKind.Newline:
            case TokenKind.EndOfInput:
                break;
            default:
                return this._backtrackAndCreateErrorRange(tokenReader, startMarker, 
                // include the three backticks so they don't get reinterpreted as a code span
                endOfOpeningDelimiterMarker, TSDocMessageId.CodeFenceOpeningIndent, 'The opening backtick for a code fence must appear at the start of the line');
        }
        // Read the opening ``` delimiter
        var openingDelimiter = '';
        openingDelimiter += tokenReader.readToken();
        openingDelimiter += tokenReader.readToken();
        openingDelimiter += tokenReader.readToken();
        if (openingDelimiter !== '```') {
            // This would be a parser bug -- the caller of _parseFencedCode() should have verified this while
            // looking ahead to distinguish code spans/fences
            throw new Error('Expecting three backticks');
        }
        var openingFenceExcerpt = tokenReader.extractAccumulatedSequence();
        // Read any spaces after the delimiter,
        // but NOT the Newline since that goes with the spacingAfterLanguageExcerpt
        while (tokenReader.peekTokenKind() === TokenKind.Spacing) {
            tokenReader.readToken();
        }
        var spacingAfterOpeningFenceExcerpt = tokenReader.tryExtractAccumulatedSequence();
        // Read the language specifier (if present) and newline
        var done = false;
        var startOfPaddingMarker = undefined;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.Spacing:
                case TokenKind.Newline:
                    if (startOfPaddingMarker === undefined) {
                        // Starting a new run of spacing characters
                        startOfPaddingMarker = tokenReader.createMarker();
                    }
                    if (tokenReader.peekTokenKind() === TokenKind.Newline) {
                        done = true;
                    }
                    tokenReader.readToken();
                    break;
                case TokenKind.Backtick:
                    var failure = this._createFailureForToken(tokenReader, TSDocMessageId.CodeFenceSpecifierSyntax, 'The language specifier cannot contain backtick characters');
                    return this._backtrackAndCreateErrorRangeForFailure(tokenReader, startMarker, endOfOpeningDelimiterMarker, 'Error parsing code fence: ', failure);
                case TokenKind.EndOfInput:
                    var failure2 = this._createFailureForToken(tokenReader, TSDocMessageId.CodeFenceMissingDelimiter, 'Missing closing delimiter');
                    return this._backtrackAndCreateErrorRangeForFailure(tokenReader, startMarker, endOfOpeningDelimiterMarker, 'Error parsing code fence: ', failure2);
                default:
                    // more non-spacing content
                    startOfPaddingMarker = undefined;
                    tokenReader.readToken();
                    break;
            }
        }
        // At this point, we must have accumulated at least a newline token.
        // Example: "pov-ray sdl    \n"
        var restOfLineExcerpt = tokenReader.extractAccumulatedSequence();
        // Example: "pov-ray sdl"
        var languageExcerpt = restOfLineExcerpt.getNewSequence(restOfLineExcerpt.startIndex, startOfPaddingMarker);
        // Example: "    \n"
        var spacingAfterLanguageExcerpt = restOfLineExcerpt.getNewSequence(startOfPaddingMarker, restOfLineExcerpt.endIndex);
        // Read the code content until we see the closing ``` delimiter
        var codeEndMarker = -1;
        var closingFenceStartMarker = -1;
        done = false;
        var tokenBeforeDelimiter;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.EndOfInput:
                    var failure2 = this._createFailureForToken(tokenReader, TSDocMessageId.CodeFenceMissingDelimiter, 'Missing closing delimiter');
                    return this._backtrackAndCreateErrorRangeForFailure(tokenReader, startMarker, endOfOpeningDelimiterMarker, 'Error parsing code fence: ', failure2);
                case TokenKind.Newline:
                    tokenBeforeDelimiter = tokenReader.readToken();
                    codeEndMarker = tokenReader.createMarker();
                    while (tokenReader.peekTokenKind() === TokenKind.Spacing) {
                        tokenBeforeDelimiter = tokenReader.readToken();
                    }
                    if (tokenReader.peekTokenKind() !== TokenKind.Backtick) {
                        break;
                    }
                    closingFenceStartMarker = tokenReader.createMarker();
                    tokenReader.readToken(); // first backtick
                    if (tokenReader.peekTokenKind() !== TokenKind.Backtick) {
                        break;
                    }
                    tokenReader.readToken(); // second backtick
                    if (tokenReader.peekTokenKind() !== TokenKind.Backtick) {
                        break;
                    }
                    tokenReader.readToken(); // third backtick
                    done = true;
                    break;
                default:
                    tokenReader.readToken();
                    break;
            }
        }
        if (tokenBeforeDelimiter.kind !== TokenKind.Newline) {
            this._parserContext.log.addMessageForTextRange(TSDocMessageId.CodeFenceClosingIndent, 'The closing delimiter for a code fence must not be indented', tokenBeforeDelimiter.range);
        }
        // Example: "code 1\ncode 2\n  ```"
        var codeAndDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        // Example: "code 1\ncode 2\n"
        var codeExcerpt = codeAndDelimiterExcerpt.getNewSequence(codeAndDelimiterExcerpt.startIndex, codeEndMarker);
        // Example: "  "
        var spacingBeforeClosingFenceExcerpt = codeAndDelimiterExcerpt.getNewSequence(codeEndMarker, closingFenceStartMarker);
        // Example: "```"
        var closingFenceExcerpt = codeAndDelimiterExcerpt.getNewSequence(closingFenceStartMarker, codeAndDelimiterExcerpt.endIndex);
        // Read the spacing and newline after the closing delimiter
        done = false;
        while (!done) {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.Spacing:
                    tokenReader.readToken();
                    break;
                case TokenKind.Newline:
                    done = true;
                    tokenReader.readToken();
                    break;
                case TokenKind.EndOfInput:
                    done = true;
                    break;
                default:
                    this._parserContext.log.addMessageForTextRange(TSDocMessageId.CodeFenceClosingSyntax, 'Unexpected characters after closing delimiter for code fence', tokenReader.peekToken().range);
                    done = true;
                    break;
            }
        }
        // Example: "   \n"
        var spacingAfterClosingFenceExcerpt = tokenReader.tryExtractAccumulatedSequence();
        return new DocFencedCode({
            parsed: true,
            configuration: this._configuration,
            openingFenceExcerpt: openingFenceExcerpt,
            spacingAfterOpeningFenceExcerpt: spacingAfterOpeningFenceExcerpt,
            languageExcerpt: languageExcerpt,
            spacingAfterLanguageExcerpt: spacingAfterLanguageExcerpt,
            codeExcerpt: codeExcerpt,
            spacingBeforeClosingFenceExcerpt: spacingBeforeClosingFenceExcerpt,
            closingFenceExcerpt: closingFenceExcerpt,
            spacingAfterClosingFenceExcerpt: spacingAfterClosingFenceExcerpt
        });
    };
    NodeParser.prototype._parseCodeSpan = function (tokenReader) {
        tokenReader.assertAccumulatedSequenceIsEmpty();
        var marker = tokenReader.createMarker();
        // Parse the opening backtick
        if (tokenReader.peekTokenKind() !== TokenKind.Backtick) {
            // This would be a parser bug -- the caller of _parseCodeSpan() should have verified this while
            // looking ahead to distinguish code spans/fences
            throw new Error('Expecting a code span starting with a backtick character "`"');
        }
        tokenReader.readToken(); // read the backtick
        var openingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
        var codeExcerpt = undefined;
        var closingDelimiterExcerpt = undefined;
        // Parse the content backtick
        for (;;) {
            var peekedTokenKind = tokenReader.peekTokenKind();
            // Did we find the matching token?
            if (peekedTokenKind === TokenKind.Backtick) {
                if (tokenReader.isAccumulatedSequenceEmpty()) {
                    return this._backtrackAndCreateErrorRange(tokenReader, marker, marker + 1, TSDocMessageId.CodeSpanEmpty, 'A code span must contain at least one character between the backticks');
                }
                codeExcerpt = tokenReader.extractAccumulatedSequence();
                tokenReader.readToken();
                closingDelimiterExcerpt = tokenReader.extractAccumulatedSequence();
                break;
            }
            if (peekedTokenKind === TokenKind.EndOfInput || peekedTokenKind === TokenKind.Newline) {
                return this._backtrackAndCreateError(tokenReader, marker, TSDocMessageId.CodeSpanMissingDelimiter, 'The code span is missing its closing backtick');
            }
            tokenReader.readToken();
        }
        return new DocCodeSpan({
            parsed: true,
            configuration: this._configuration,
            openingDelimiterExcerpt: openingDelimiterExcerpt,
            codeExcerpt: codeExcerpt,
            closingDelimiterExcerpt: closingDelimiterExcerpt
        });
    };
    NodeParser.prototype._tryReadSpacingAndNewlines = function (tokenReader) {
        var done = false;
        do {
            switch (tokenReader.peekTokenKind()) {
                case TokenKind.Spacing:
                case TokenKind.Newline:
                    tokenReader.readToken();
                    break;
                default:
                    done = true;
                    break;
            }
        } while (!done);
        return tokenReader.tryExtractAccumulatedSequence();
    };
    /**
     * Read the next token, and report it as a DocErrorText node.
     */
    NodeParser.prototype._createError = function (tokenReader, messageId, errorMessage) {
        tokenReader.readToken();
        var textExcerpt = tokenReader.extractAccumulatedSequence();
        var docErrorText = new DocErrorText({
            parsed: true,
            configuration: this._configuration,
            textExcerpt: textExcerpt,
            messageId: messageId,
            errorMessage: errorMessage,
            errorLocation: textExcerpt
        });
        this._parserContext.log.addMessageForDocErrorText(docErrorText);
        return docErrorText;
    };
    /**
     * Rewind to the specified marker, read the next token, and report it as a DocErrorText node.
     */
    NodeParser.prototype._backtrackAndCreateError = function (tokenReader, marker, messageId, errorMessage) {
        tokenReader.backtrackToMarker(marker);
        return this._createError(tokenReader, messageId, errorMessage);
    };
    /**
     * Rewind to the errorStartMarker, read the tokens up to and including errorInclusiveEndMarker,
     * and report it as a DocErrorText node.
     */
    NodeParser.prototype._backtrackAndCreateErrorRange = function (tokenReader, errorStartMarker, errorInclusiveEndMarker, messageId, errorMessage) {
        tokenReader.backtrackToMarker(errorStartMarker);
        while (tokenReader.createMarker() !== errorInclusiveEndMarker) {
            tokenReader.readToken();
        }
        if (tokenReader.peekTokenKind() !== TokenKind.EndOfInput) {
            tokenReader.readToken();
        }
        var textExcerpt = tokenReader.extractAccumulatedSequence();
        var docErrorText = new DocErrorText({
            parsed: true,
            configuration: this._configuration,
            textExcerpt: textExcerpt,
            messageId: messageId,
            errorMessage: errorMessage,
            errorLocation: textExcerpt
        });
        this._parserContext.log.addMessageForDocErrorText(docErrorText);
        return docErrorText;
    };
    /**
     * Rewind to the specified marker, read the next token, and report it as a DocErrorText node
     * whose location is based on an IFailure.
     */
    NodeParser.prototype._backtrackAndCreateErrorForFailure = function (tokenReader, marker, errorMessagePrefix, failure) {
        tokenReader.backtrackToMarker(marker);
        tokenReader.readToken();
        var textExcerpt = tokenReader.extractAccumulatedSequence();
        var docErrorText = new DocErrorText({
            parsed: true,
            configuration: this._configuration,
            textExcerpt: textExcerpt,
            messageId: failure.failureMessageId,
            errorMessage: errorMessagePrefix + failure.failureMessage,
            errorLocation: failure.failureLocation
        });
        this._parserContext.log.addMessageForDocErrorText(docErrorText);
        return docErrorText;
    };
    /**
     * Rewind to the errorStartMarker, read the tokens up to and including errorInclusiveEndMarker,
     * and report it as a DocErrorText node whose location is based on an IFailure.
     */
    NodeParser.prototype._backtrackAndCreateErrorRangeForFailure = function (tokenReader, errorStartMarker, errorInclusiveEndMarker, errorMessagePrefix, failure) {
        tokenReader.backtrackToMarker(errorStartMarker);
        while (tokenReader.createMarker() !== errorInclusiveEndMarker) {
            tokenReader.readToken();
        }
        if (tokenReader.peekTokenKind() !== TokenKind.EndOfInput) {
            tokenReader.readToken();
        }
        var textExcerpt = tokenReader.extractAccumulatedSequence();
        var docErrorText = new DocErrorText({
            parsed: true,
            configuration: this._configuration,
            textExcerpt: textExcerpt,
            messageId: failure.failureMessageId,
            errorMessage: errorMessagePrefix + failure.failureMessage,
            errorLocation: failure.failureLocation
        });
        this._parserContext.log.addMessageForDocErrorText(docErrorText);
        return docErrorText;
    };
    /**
     * Creates an IFailure whose TokenSequence is a single token.  If a marker is not specified,
     * then it is the current token.
     */
    NodeParser.prototype._createFailureForToken = function (tokenReader, failureMessageId, failureMessage, tokenMarker) {
        if (!tokenMarker) {
            tokenMarker = tokenReader.createMarker();
        }
        var tokenSequence = new TokenSequence({
            parserContext: this._parserContext,
            startIndex: tokenMarker,
            endIndex: tokenMarker + 1
        });
        return {
            failureMessageId: failureMessageId,
            failureMessage: failureMessage,
            failureLocation: tokenSequence
        };
    };
    /**
     * Creates an IFailure whose TokenSequence starts from the specified marker and
     * encompasses all tokens read since then.  If none were read, then the next token used.
     */
    NodeParser.prototype._createFailureForTokensSince = function (tokenReader, failureMessageId, failureMessage, startMarker) {
        var endMarker = tokenReader.createMarker();
        if (endMarker < startMarker) {
            // This would be a parser bug
            throw new Error('Invalid startMarker');
        }
        if (endMarker === startMarker) {
            ++endMarker;
        }
        var tokenSequence = new TokenSequence({
            parserContext: this._parserContext,
            startIndex: startMarker,
            endIndex: endMarker
        });
        return {
            failureMessageId: failureMessageId,
            failureMessage: failureMessage,
            failureLocation: tokenSequence
        };
    };
    return NodeParser;
}());
export { NodeParser };
//# sourceMappingURL=NodeParser.js.map