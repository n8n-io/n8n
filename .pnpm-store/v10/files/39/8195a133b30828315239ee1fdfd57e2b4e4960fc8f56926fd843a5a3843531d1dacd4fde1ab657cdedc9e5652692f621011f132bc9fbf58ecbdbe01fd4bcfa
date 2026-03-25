import { Preprocessor } from './preprocessor.js';
import { type CharacterToken, type DoctypeToken, type TagToken, type EOFToken, type CommentToken } from '../common/token.js';
import { type ParserErrorHandler } from '../common/error-codes.js';
declare const enum State {
    DATA = 0,
    RCDATA = 1,
    RAWTEXT = 2,
    SCRIPT_DATA = 3,
    PLAINTEXT = 4,
    TAG_OPEN = 5,
    END_TAG_OPEN = 6,
    TAG_NAME = 7,
    RCDATA_LESS_THAN_SIGN = 8,
    RCDATA_END_TAG_OPEN = 9,
    RCDATA_END_TAG_NAME = 10,
    RAWTEXT_LESS_THAN_SIGN = 11,
    RAWTEXT_END_TAG_OPEN = 12,
    RAWTEXT_END_TAG_NAME = 13,
    SCRIPT_DATA_LESS_THAN_SIGN = 14,
    SCRIPT_DATA_END_TAG_OPEN = 15,
    SCRIPT_DATA_END_TAG_NAME = 16,
    SCRIPT_DATA_ESCAPE_START = 17,
    SCRIPT_DATA_ESCAPE_START_DASH = 18,
    SCRIPT_DATA_ESCAPED = 19,
    SCRIPT_DATA_ESCAPED_DASH = 20,
    SCRIPT_DATA_ESCAPED_DASH_DASH = 21,
    SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 22,
    SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 23,
    SCRIPT_DATA_ESCAPED_END_TAG_NAME = 24,
    SCRIPT_DATA_DOUBLE_ESCAPE_START = 25,
    SCRIPT_DATA_DOUBLE_ESCAPED = 26,
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 27,
    SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 28,
    SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 29,
    SCRIPT_DATA_DOUBLE_ESCAPE_END = 30,
    BEFORE_ATTRIBUTE_NAME = 31,
    ATTRIBUTE_NAME = 32,
    AFTER_ATTRIBUTE_NAME = 33,
    BEFORE_ATTRIBUTE_VALUE = 34,
    ATTRIBUTE_VALUE_DOUBLE_QUOTED = 35,
    ATTRIBUTE_VALUE_SINGLE_QUOTED = 36,
    ATTRIBUTE_VALUE_UNQUOTED = 37,
    AFTER_ATTRIBUTE_VALUE_QUOTED = 38,
    SELF_CLOSING_START_TAG = 39,
    BOGUS_COMMENT = 40,
    MARKUP_DECLARATION_OPEN = 41,
    COMMENT_START = 42,
    COMMENT_START_DASH = 43,
    COMMENT = 44,
    COMMENT_LESS_THAN_SIGN = 45,
    COMMENT_LESS_THAN_SIGN_BANG = 46,
    COMMENT_LESS_THAN_SIGN_BANG_DASH = 47,
    COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 48,
    COMMENT_END_DASH = 49,
    COMMENT_END = 50,
    COMMENT_END_BANG = 51,
    DOCTYPE = 52,
    BEFORE_DOCTYPE_NAME = 53,
    DOCTYPE_NAME = 54,
    AFTER_DOCTYPE_NAME = 55,
    AFTER_DOCTYPE_PUBLIC_KEYWORD = 56,
    BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 57,
    DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 58,
    DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 59,
    AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 60,
    BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 61,
    AFTER_DOCTYPE_SYSTEM_KEYWORD = 62,
    BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 63,
    DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 64,
    DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 65,
    AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 66,
    BOGUS_DOCTYPE = 67,
    CDATA_SECTION = 68,
    CDATA_SECTION_BRACKET = 69,
    CDATA_SECTION_END = 70,
    CHARACTER_REFERENCE = 71,
    NAMED_CHARACTER_REFERENCE = 72,
    AMBIGUOUS_AMPERSAND = 73,
    NUMERIC_CHARACTER_REFERENCE = 74,
    HEXADEMICAL_CHARACTER_REFERENCE_START = 75,
    HEXADEMICAL_CHARACTER_REFERENCE = 76,
    DECIMAL_CHARACTER_REFERENCE = 77,
    NUMERIC_CHARACTER_REFERENCE_END = 78
}
export declare const TokenizerMode: {
    readonly DATA: State.DATA;
    readonly RCDATA: State.RCDATA;
    readonly RAWTEXT: State.RAWTEXT;
    readonly SCRIPT_DATA: State.SCRIPT_DATA;
    readonly PLAINTEXT: State.PLAINTEXT;
    readonly CDATA_SECTION: State.CDATA_SECTION;
};
export interface TokenizerOptions {
    sourceCodeLocationInfo?: boolean;
}
export interface TokenHandler {
    onComment(token: CommentToken): void;
    onDoctype(token: DoctypeToken): void;
    onStartTag(token: TagToken): void;
    onEndTag(token: TagToken): void;
    onEof(token: EOFToken): void;
    onCharacter(token: CharacterToken): void;
    onNullCharacter(token: CharacterToken): void;
    onWhitespaceCharacter(token: CharacterToken): void;
    onParseError?: ParserErrorHandler | null;
}
export declare class Tokenizer {
    private options;
    private handler;
    preprocessor: Preprocessor;
    private paused;
    /** Ensures that the parsing loop isn't run multiple times at once. */
    private inLoop;
    /**
     * Indicates that the current adjusted node exists, is not an element in the HTML namespace,
     * and that it is not an integration point for either MathML or HTML.
     *
     * @see {@link https://html.spec.whatwg.org/multipage/parsing.html#tree-construction}
     */
    inForeignNode: boolean;
    lastStartTagName: string;
    active: boolean;
    state: State;
    private returnState;
    private charRefCode;
    private consumedAfterSnapshot;
    private currentLocation;
    private currentCharacterToken;
    private currentToken;
    private currentAttr;
    constructor(options: TokenizerOptions, handler: TokenHandler);
    private _err;
    private getCurrentLocation;
    private _runParsingLoop;
    pause(): void;
    resume(writeCallback?: () => void): void;
    write(chunk: string, isLastChunk: boolean, writeCallback?: () => void): void;
    insertHtmlAtCurrentPos(chunk: string): void;
    private _ensureHibernation;
    private _consume;
    private _unconsume;
    private _reconsumeInState;
    private _advanceBy;
    private _consumeSequenceIfMatch;
    private _createStartTagToken;
    private _createEndTagToken;
    private _createCommentToken;
    private _createDoctypeToken;
    private _createCharacterToken;
    private _createAttr;
    private _leaveAttrName;
    private _leaveAttrValue;
    private prepareToken;
    private emitCurrentTagToken;
    private emitCurrentComment;
    private emitCurrentDoctype;
    private _emitCurrentCharacterToken;
    private _emitEOFToken;
    private _appendCharToCurrentCharacterToken;
    private _emitCodePoint;
    private _emitChars;
    private _matchNamedCharacterReference;
    private _isCharacterReferenceInAttribute;
    private _flushCodePointConsumedAsCharacterReference;
    private _callState;
    private _stateData;
    private _stateRcdata;
    private _stateRawtext;
    private _stateScriptData;
    private _statePlaintext;
    private _stateTagOpen;
    private _stateEndTagOpen;
    private _stateTagName;
    private _stateRcdataLessThanSign;
    private _stateRcdataEndTagOpen;
    private handleSpecialEndTag;
    private _stateRcdataEndTagName;
    private _stateRawtextLessThanSign;
    private _stateRawtextEndTagOpen;
    private _stateRawtextEndTagName;
    private _stateScriptDataLessThanSign;
    private _stateScriptDataEndTagOpen;
    private _stateScriptDataEndTagName;
    private _stateScriptDataEscapeStart;
    private _stateScriptDataEscapeStartDash;
    private _stateScriptDataEscaped;
    private _stateScriptDataEscapedDash;
    private _stateScriptDataEscapedDashDash;
    private _stateScriptDataEscapedLessThanSign;
    private _stateScriptDataEscapedEndTagOpen;
    private _stateScriptDataEscapedEndTagName;
    private _stateScriptDataDoubleEscapeStart;
    private _stateScriptDataDoubleEscaped;
    private _stateScriptDataDoubleEscapedDash;
    private _stateScriptDataDoubleEscapedDashDash;
    private _stateScriptDataDoubleEscapedLessThanSign;
    private _stateScriptDataDoubleEscapeEnd;
    private _stateBeforeAttributeName;
    private _stateAttributeName;
    private _stateAfterAttributeName;
    private _stateBeforeAttributeValue;
    private _stateAttributeValueDoubleQuoted;
    private _stateAttributeValueSingleQuoted;
    private _stateAttributeValueUnquoted;
    private _stateAfterAttributeValueQuoted;
    private _stateSelfClosingStartTag;
    private _stateBogusComment;
    private _stateMarkupDeclarationOpen;
    private _stateCommentStart;
    private _stateCommentStartDash;
    private _stateComment;
    private _stateCommentLessThanSign;
    private _stateCommentLessThanSignBang;
    private _stateCommentLessThanSignBangDash;
    private _stateCommentLessThanSignBangDashDash;
    private _stateCommentEndDash;
    private _stateCommentEnd;
    private _stateCommentEndBang;
    private _stateDoctype;
    private _stateBeforeDoctypeName;
    private _stateDoctypeName;
    private _stateAfterDoctypeName;
    private _stateAfterDoctypePublicKeyword;
    private _stateBeforeDoctypePublicIdentifier;
    private _stateDoctypePublicIdentifierDoubleQuoted;
    private _stateDoctypePublicIdentifierSingleQuoted;
    private _stateAfterDoctypePublicIdentifier;
    private _stateBetweenDoctypePublicAndSystemIdentifiers;
    private _stateAfterDoctypeSystemKeyword;
    private _stateBeforeDoctypeSystemIdentifier;
    private _stateDoctypeSystemIdentifierDoubleQuoted;
    private _stateDoctypeSystemIdentifierSingleQuoted;
    private _stateAfterDoctypeSystemIdentifier;
    private _stateBogusDoctype;
    private _stateCdataSection;
    private _stateCdataSectionBracket;
    private _stateCdataSectionEnd;
    private _stateCharacterReference;
    private _stateNamedCharacterReference;
    private _stateAmbiguousAmpersand;
    private _stateNumericCharacterReference;
    private _stateHexademicalCharacterReferenceStart;
    private _stateHexademicalCharacterReference;
    private _stateDecimalCharacterReference;
    private _stateNumericCharacterReferenceEnd;
}
export {};
//# sourceMappingURL=index.d.ts.map