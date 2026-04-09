"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sniffer = exports.STRINGS = exports.ResultType = void 0;
exports.getEncoding = getEncoding;
const whatwg_encoding_1 = require("whatwg-encoding");
// https://html.spec.whatwg.org/multipage/syntax.html#prescan-a-byte-stream-to-determine-its-encoding
var State;
(function (State) {
    // Before anything starts; can be any of BOM, UTF-16 XML declarations or meta tags
    State[State["Begin"] = 0] = "Begin";
    // Inside of a BOM
    State[State["BOM16BE"] = 1] = "BOM16BE";
    State[State["BOM16LE"] = 2] = "BOM16LE";
    State[State["BOM8"] = 3] = "BOM8";
    // XML prefix
    State[State["UTF16LE_XML_PREFIX"] = 4] = "UTF16LE_XML_PREFIX";
    State[State["BeginLT"] = 5] = "BeginLT";
    State[State["UTF16BE_XML_PREFIX"] = 6] = "UTF16BE_XML_PREFIX";
    // Waiting for opening `<`
    State[State["BeforeTag"] = 7] = "BeforeTag";
    // After the opening `<`
    State[State["BeforeTagName"] = 8] = "BeforeTagName";
    // After `</`
    State[State["BeforeCloseTagName"] = 9] = "BeforeCloseTagName";
    // Beginning of a comment
    State[State["CommentStart"] = 10] = "CommentStart";
    // End of a comment
    State[State["CommentEnd"] = 11] = "CommentEnd";
    // A tag name that could be `meta`
    State[State["TagNameMeta"] = 12] = "TagNameMeta";
    // A tag name that is not `meta`
    State[State["TagNameOther"] = 13] = "TagNameOther";
    // XML declaration
    State[State["XMLDeclaration"] = 14] = "XMLDeclaration";
    State[State["XMLDeclarationBeforeEncoding"] = 15] = "XMLDeclarationBeforeEncoding";
    State[State["XMLDeclarationAfterEncoding"] = 16] = "XMLDeclarationAfterEncoding";
    State[State["XMLDeclarationBeforeValue"] = 17] = "XMLDeclarationBeforeValue";
    State[State["XMLDeclarationValue"] = 18] = "XMLDeclarationValue";
    // Anything that looks like a tag, but doesn't fit in the above categories
    State[State["WeirdTag"] = 19] = "WeirdTag";
    State[State["BeforeAttribute"] = 20] = "BeforeAttribute";
    /*
     * Attributes in meta tag — we compare them to our set here, and back out
     * We care about four attributes: http-equiv, content-type, content, charset
     */
    State[State["MetaAttribHttpEquiv"] = 21] = "MetaAttribHttpEquiv";
    // The value has to be `content-type`
    State[State["MetaAttribHttpEquivValue"] = 22] = "MetaAttribHttpEquivValue";
    State[State["MetaAttribC"] = 23] = "MetaAttribC";
    State[State["MetaAttribContent"] = 24] = "MetaAttribContent";
    State[State["MetaAttribCharset"] = 25] = "MetaAttribCharset";
    // Waiting for whitespace
    State[State["MetaAttribAfterName"] = 26] = "MetaAttribAfterName";
    State[State["MetaContentValueQuotedBeforeEncoding"] = 27] = "MetaContentValueQuotedBeforeEncoding";
    State[State["MetaContentValueQuotedAfterEncoding"] = 28] = "MetaContentValueQuotedAfterEncoding";
    State[State["MetaContentValueQuotedBeforeValue"] = 29] = "MetaContentValueQuotedBeforeValue";
    State[State["MetaContentValueQuotedValueQuoted"] = 30] = "MetaContentValueQuotedValueQuoted";
    State[State["MetaContentValueQuotedValueUnquoted"] = 31] = "MetaContentValueQuotedValueUnquoted";
    State[State["MetaContentValueUnquotedBeforeEncoding"] = 32] = "MetaContentValueUnquotedBeforeEncoding";
    State[State["MetaContentValueUnquotedBeforeValue"] = 33] = "MetaContentValueUnquotedBeforeValue";
    State[State["MetaContentValueUnquotedValueQuoted"] = 34] = "MetaContentValueUnquotedValueQuoted";
    State[State["MetaContentValueUnquotedValueUnquoted"] = 35] = "MetaContentValueUnquotedValueUnquoted";
    State[State["AnyAttribName"] = 36] = "AnyAttribName";
    // After the name of an attribute, before the equals sign
    State[State["AfterAttributeName"] = 37] = "AfterAttributeName";
    // After `=`
    State[State["BeforeAttributeValue"] = 38] = "BeforeAttributeValue";
    State[State["AttributeValueQuoted"] = 39] = "AttributeValueQuoted";
    State[State["AttributeValueUnquoted"] = 40] = "AttributeValueUnquoted";
})(State || (State = {}));
var ResultType;
(function (ResultType) {
    // Byte order mark
    ResultType[ResultType["BOM"] = 0] = "BOM";
    // User- or transport layer-defined
    ResultType[ResultType["PASSED"] = 1] = "PASSED";
    // XML prefixes
    ResultType[ResultType["XML_PREFIX"] = 2] = "XML_PREFIX";
    // Meta tag
    ResultType[ResultType["META_TAG"] = 3] = "META_TAG";
    // XML encoding
    ResultType[ResultType["XML_ENCODING"] = 4] = "XML_ENCODING";
    // Default
    ResultType[ResultType["DEFAULT"] = 5] = "DEFAULT";
})(ResultType || (exports.ResultType = ResultType = {}));
var AttribType;
(function (AttribType) {
    AttribType[AttribType["None"] = 0] = "None";
    AttribType[AttribType["HttpEquiv"] = 1] = "HttpEquiv";
    AttribType[AttribType["Content"] = 2] = "Content";
    AttribType[AttribType["Charset"] = 3] = "Charset";
})(AttribType || (AttribType = {}));
var Chars;
(function (Chars) {
    Chars[Chars["NIL"] = 0] = "NIL";
    Chars[Chars["TAB"] = 9] = "TAB";
    Chars[Chars["LF"] = 10] = "LF";
    Chars[Chars["CR"] = 13] = "CR";
    Chars[Chars["SPACE"] = 32] = "SPACE";
    Chars[Chars["EXCLAMATION"] = 33] = "EXCLAMATION";
    Chars[Chars["DQUOTE"] = 34] = "DQUOTE";
    Chars[Chars["SQUOTE"] = 39] = "SQUOTE";
    Chars[Chars["DASH"] = 45] = "DASH";
    Chars[Chars["SLASH"] = 47] = "SLASH";
    Chars[Chars["SEMICOLON"] = 59] = "SEMICOLON";
    Chars[Chars["LT"] = 60] = "LT";
    Chars[Chars["EQUALS"] = 61] = "EQUALS";
    Chars[Chars["GT"] = 62] = "GT";
    Chars[Chars["QUESTION"] = 63] = "QUESTION";
    Chars[Chars["UpperA"] = 65] = "UpperA";
    Chars[Chars["UpperZ"] = 90] = "UpperZ";
    Chars[Chars["LowerA"] = 97] = "LowerA";
    Chars[Chars["LowerZ"] = 122] = "LowerZ";
})(Chars || (Chars = {}));
const SPACE_CHARACTERS = new Set([Chars.SPACE, Chars.LF, Chars.CR, Chars.TAB]);
const END_OF_UNQUOTED_ATTRIBUTE_VALUE = new Set([
    Chars.SPACE,
    Chars.LF,
    Chars.CR,
    Chars.TAB,
    Chars.GT,
]);
function toUint8Array(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
    }
    return arr;
}
exports.STRINGS = {
    UTF8_BOM: new Uint8Array([0xef, 0xbb, 0xbf]),
    UTF16LE_BOM: new Uint8Array([0xff, 0xfe]),
    UTF16BE_BOM: new Uint8Array([0xfe, 0xff]),
    UTF16LE_XML_PREFIX: new Uint8Array([0x3c, 0x0, 0x3f, 0x0, 0x78, 0x0]),
    UTF16BE_XML_PREFIX: new Uint8Array([0x0, 0x3c, 0x0, 0x3f, 0x0, 0x78]),
    XML_DECLARATION: toUint8Array("<?xml"),
    ENCODING: toUint8Array("encoding"),
    META: toUint8Array("meta"),
    HTTP_EQUIV: toUint8Array("http-equiv"),
    CONTENT: toUint8Array("content"),
    CONTENT_TYPE: toUint8Array("content-type"),
    CHARSET: toUint8Array("charset"),
    COMMENT_START: toUint8Array("<!--"),
    COMMENT_END: toUint8Array("-->"),
};
function isAsciiAlpha(c) {
    return ((c >= Chars.UpperA && c <= Chars.UpperZ) ||
        (c >= Chars.LowerA && c <= Chars.LowerZ));
}
function isQuote(c) {
    return c === Chars.DQUOTE || c === Chars.SQUOTE;
}
class Sniffer {
    setResult(label, type) {
        if (this.resultType === ResultType.DEFAULT || this.resultType > type) {
            const encoding = (0, whatwg_encoding_1.labelToName)(label);
            if (encoding) {
                this.encoding =
                    // Check if we are in a meta tag and the encoding is `x-user-defined`
                    type === ResultType.META_TAG &&
                        encoding === "x-user-defined"
                        ? "windows-1252"
                        : // Check if we are in a meta tag or xml declaration, and the encoding is UTF-16
                            (type === ResultType.META_TAG ||
                                type === ResultType.XML_ENCODING) &&
                                (encoding === "UTF-16LE" || encoding === "UTF-16BE")
                                ? "UTF-8"
                                : encoding;
                this.resultType = type;
            }
        }
    }
    constructor({ maxBytes = 1024, userEncoding, transportLayerEncodingLabel, defaultEncoding, } = {}) {
        /** The offset of the previous buffers. */
        this.offset = 0;
        this.state = State.Begin;
        this.sectionIndex = 0;
        this.attribType = AttribType.None;
        /**
         * Indicates if the `http-equiv` is `content-type`.
         *
         * Initially `null`, a boolean when a value is found.
         */
        this.gotPragma = null;
        this.needsPragma = null;
        this.inMetaTag = false;
        this.encoding = "windows-1252";
        this.resultType = ResultType.DEFAULT;
        this.quoteCharacter = 0;
        this.attributeValue = [];
        this.maxBytes = maxBytes;
        if (userEncoding) {
            this.setResult(userEncoding, ResultType.PASSED);
        }
        if (transportLayerEncodingLabel) {
            this.setResult(transportLayerEncodingLabel, ResultType.PASSED);
        }
        if (defaultEncoding) {
            this.setResult(defaultEncoding, ResultType.DEFAULT);
        }
    }
    stateBegin(c) {
        switch (c) {
            case exports.STRINGS.UTF16BE_BOM[0]: {
                this.state = State.BOM16BE;
                break;
            }
            case exports.STRINGS.UTF16LE_BOM[0]: {
                this.state = State.BOM16LE;
                break;
            }
            case exports.STRINGS.UTF8_BOM[0]: {
                this.sectionIndex = 1;
                this.state = State.BOM8;
                break;
            }
            case Chars.NIL: {
                this.state = State.UTF16BE_XML_PREFIX;
                this.sectionIndex = 1;
                break;
            }
            case Chars.LT: {
                this.state = State.BeginLT;
                break;
            }
            default: {
                this.state = State.BeforeTag;
            }
        }
    }
    stateBeginLT(c) {
        if (c === Chars.NIL) {
            this.state = State.UTF16LE_XML_PREFIX;
            this.sectionIndex = 2;
        }
        else if (c === Chars.QUESTION) {
            this.state = State.XMLDeclaration;
            this.sectionIndex = 2;
        }
        else {
            this.state = State.BeforeTagName;
            this.stateBeforeTagName(c);
        }
    }
    stateUTF16BE_XML_PREFIX(c) {
        // Advance position in the section
        if (this.advanceSection(exports.STRINGS.UTF16BE_XML_PREFIX, c)) {
            if (this.sectionIndex === exports.STRINGS.UTF16BE_XML_PREFIX.length) {
                // We have the whole prefix
                this.setResult("utf-16be", ResultType.XML_PREFIX);
            }
        }
        else {
            this.state = State.BeforeTag;
            this.stateBeforeTag(c);
        }
    }
    stateUTF16LE_XML_PREFIX(c) {
        // Advance position in the section
        if (this.advanceSection(exports.STRINGS.UTF16LE_XML_PREFIX, c)) {
            if (this.sectionIndex === exports.STRINGS.UTF16LE_XML_PREFIX.length) {
                // We have the whole prefix
                this.setResult("utf-16le", ResultType.XML_PREFIX);
            }
        }
        else {
            this.state = State.BeforeTag;
            this.stateBeforeTag(c);
        }
    }
    stateBOM16LE(c) {
        if (c === exports.STRINGS.UTF16LE_BOM[1]) {
            this.setResult("utf-16le", ResultType.BOM);
        }
        else {
            this.state = State.BeforeTag;
            this.stateBeforeTag(c);
        }
    }
    stateBOM16BE(c) {
        if (c === exports.STRINGS.UTF16BE_BOM[1]) {
            this.setResult("utf-16be", ResultType.BOM);
        }
        else {
            this.state = State.BeforeTag;
            this.stateBeforeTag(c);
        }
    }
    stateBOM8(c) {
        if (this.advanceSection(exports.STRINGS.UTF8_BOM, c) &&
            this.sectionIndex === exports.STRINGS.UTF8_BOM.length) {
            this.setResult("utf-8", ResultType.BOM);
        }
    }
    stateBeforeTag(c) {
        if (c === Chars.LT) {
            this.state = State.BeforeTagName;
            this.inMetaTag = false;
        }
    }
    /**
     * We have seen a `<`, and now have to figure out what to do.
     *
     * Options:
     *  - `<meta`
     *  - Any other tag
     *  - A closing tag
     *  - `<!--`
     *  - An XML declaration
     *
     */
    stateBeforeTagName(c) {
        if (isAsciiAlpha(c)) {
            if ((c | 0x20) === exports.STRINGS.META[0]) {
                this.sectionIndex = 1;
                this.state = State.TagNameMeta;
            }
            else {
                this.state = State.TagNameOther;
            }
        }
        else
            switch (c) {
                case Chars.SLASH: {
                    this.state = State.BeforeCloseTagName;
                    break;
                }
                case Chars.EXCLAMATION: {
                    this.state = State.CommentStart;
                    this.sectionIndex = 2;
                    break;
                }
                case Chars.QUESTION: {
                    this.state = State.WeirdTag;
                    break;
                }
                default: {
                    this.state = State.BeforeTag;
                    this.stateBeforeTag(c);
                }
            }
    }
    stateBeforeCloseTagName(c) {
        this.state = isAsciiAlpha(c)
            ? // Switch to `TagNameOther`; the HTML spec allows attributes here as well.
                State.TagNameOther
            : State.WeirdTag;
    }
    stateCommentStart(c) {
        if (this.advanceSection(exports.STRINGS.COMMENT_START, c)) {
            if (this.sectionIndex === exports.STRINGS.COMMENT_START.length) {
                this.state = State.CommentEnd;
                // The -- of the comment start can be part of the end.
                this.sectionIndex = 2;
            }
        }
        else {
            this.state = State.WeirdTag;
            this.stateWeirdTag(c);
        }
    }
    stateCommentEnd(c) {
        if (this.advanceSection(exports.STRINGS.COMMENT_END, c)) {
            if (this.sectionIndex === exports.STRINGS.COMMENT_END.length) {
                this.state = State.BeforeTag;
            }
        }
        else if (c === Chars.DASH) {
            /*
             * If we are here, we know we expected a `>` above.
             * Set this to 2, to support many dashes before the closing `>`.
             */
            this.sectionIndex = 2;
        }
    }
    /**
     * Any section starting with `<!`, `<?`, `</`, without being a closing tag or comment.
     */
    stateWeirdTag(c) {
        if (c === Chars.GT) {
            this.state = State.BeforeTag;
        }
    }
    /**
     * Advances the section, ignoring upper/lower case.
     *
     * Make sure the section has left-over characters before calling.
     *
     * @returns `false` if we did not match the section.
     */
    advanceSectionIC(section, c) {
        return this.advanceSection(section, c | 0x20);
    }
    /**
     * Advances the section.
     *
     * Make sure the section has left-over characters before calling.
     *
     * @returns `false` if we did not match the section.
     */
    advanceSection(section, c) {
        if (section[this.sectionIndex] === c) {
            this.sectionIndex++;
            return true;
        }
        this.sectionIndex = 0;
        return false;
    }
    stateTagNameMeta(c) {
        if (this.sectionIndex < exports.STRINGS.META.length) {
            if (this.advanceSectionIC(exports.STRINGS.META, c)) {
                return;
            }
        }
        else if (SPACE_CHARACTERS.has(c)) {
            this.inMetaTag = true;
            this.gotPragma = null;
            this.needsPragma = null;
            this.state = State.BeforeAttribute;
            return;
        }
        this.state = State.TagNameOther;
        // Reconsume in case there is a `>`.
        this.stateTagNameOther(c);
    }
    stateTagNameOther(c) {
        if (SPACE_CHARACTERS.has(c)) {
            this.state = State.BeforeAttribute;
        }
        else if (c === Chars.GT) {
            this.state = State.BeforeTag;
        }
    }
    stateBeforeAttribute(c) {
        if (SPACE_CHARACTERS.has(c))
            return;
        if (this.inMetaTag) {
            const lower = c | 0x20;
            if (lower === exports.STRINGS.HTTP_EQUIV[0]) {
                this.sectionIndex = 1;
                this.state = State.MetaAttribHttpEquiv;
                return;
            }
            else if (lower === exports.STRINGS.CHARSET[0]) {
                this.sectionIndex = 1;
                this.state = State.MetaAttribC;
                return;
            }
        }
        this.state =
            c === Chars.SLASH || c === Chars.GT
                ? State.BeforeTag
                : State.AnyAttribName;
    }
    handleMetaAttrib(c, section, type) {
        if (this.advanceSectionIC(section, c)) {
            if (this.sectionIndex === section.length) {
                this.attribType = type;
                this.state = State.MetaAttribAfterName;
            }
        }
        else {
            this.state = State.AnyAttribName;
            this.stateAnyAttribName(c);
        }
    }
    stateMetaAttribHttpEquiv(c) {
        this.handleMetaAttrib(c, exports.STRINGS.HTTP_EQUIV, AttribType.HttpEquiv);
    }
    stateMetaAttribC(c) {
        const lower = c | 0x20;
        if (lower === exports.STRINGS.CHARSET[1]) {
            this.sectionIndex = 2;
            this.state = State.MetaAttribCharset;
        }
        else if (lower === exports.STRINGS.CONTENT[1]) {
            this.sectionIndex = 2;
            this.state = State.MetaAttribContent;
        }
        else {
            this.state = State.AnyAttribName;
            this.stateAnyAttribName(c);
        }
    }
    stateMetaAttribCharset(c) {
        this.handleMetaAttrib(c, exports.STRINGS.CHARSET, AttribType.Charset);
    }
    stateMetaAttribContent(c) {
        this.handleMetaAttrib(c, exports.STRINGS.CONTENT, AttribType.Content);
    }
    stateMetaAttribAfterName(c) {
        if (SPACE_CHARACTERS.has(c) || c === Chars.EQUALS) {
            this.state = State.AfterAttributeName;
            this.stateAfterAttributeName(c);
        }
        else {
            this.state = State.AnyAttribName;
            this.stateAnyAttribName(c);
        }
    }
    stateAnyAttribName(c) {
        if (SPACE_CHARACTERS.has(c)) {
            this.attribType = AttribType.None;
            this.state = State.AfterAttributeName;
        }
        else if (c === Chars.SLASH || c === Chars.GT) {
            this.state = State.BeforeTag;
        }
        else if (c === Chars.EQUALS) {
            this.state = State.BeforeAttributeValue;
        }
    }
    stateAfterAttributeName(c) {
        if (SPACE_CHARACTERS.has(c))
            return;
        if (c === Chars.EQUALS) {
            this.state = State.BeforeAttributeValue;
        }
        else {
            this.state = State.BeforeAttribute;
            this.stateBeforeAttribute(c);
        }
    }
    stateBeforeAttributeValue(c) {
        if (SPACE_CHARACTERS.has(c))
            return;
        this.attributeValue.length = 0;
        this.sectionIndex = 0;
        if (isQuote(c)) {
            this.quoteCharacter = c;
            this.state =
                this.attribType === AttribType.Content
                    ? State.MetaContentValueQuotedBeforeEncoding
                    : this.attribType === AttribType.HttpEquiv
                        ? State.MetaAttribHttpEquivValue
                        : State.AttributeValueQuoted;
        }
        else if (this.attribType === AttribType.Content) {
            this.state = State.MetaContentValueUnquotedBeforeEncoding;
            this.stateMetaContentValueUnquotedBeforeEncoding(c);
        }
        else if (this.attribType === AttribType.HttpEquiv) {
            // We use `quoteCharacter = 0` to signify that the value is unquoted.
            this.quoteCharacter = 0;
            this.sectionIndex = 0;
            this.state = State.MetaAttribHttpEquivValue;
            this.stateMetaAttribHttpEquivValue(c);
        }
        else {
            this.state = State.AttributeValueUnquoted;
            this.stateAttributeValueUnquoted(c);
        }
    }
    // The value has to be `content-type`
    stateMetaAttribHttpEquivValue(c) {
        if (this.sectionIndex === exports.STRINGS.CONTENT_TYPE.length) {
            if (this.quoteCharacter === 0
                ? END_OF_UNQUOTED_ATTRIBUTE_VALUE.has(c)
                : c === this.quoteCharacter) {
                if (this.needsPragma !== null) {
                    this.setResult(this.needsPragma, ResultType.META_TAG);
                }
                else if (this.gotPragma === null) {
                    this.gotPragma = true;
                }
                this.state = State.BeforeAttribute;
                return;
            }
        }
        else if (this.advanceSectionIC(exports.STRINGS.CONTENT_TYPE, c)) {
            return;
        }
        this.gotPragma = false;
        if (this.quoteCharacter === 0) {
            this.state = State.AttributeValueUnquoted;
            this.stateAttributeValueUnquoted(c);
        }
        else {
            this.state = State.AttributeValueQuoted;
            this.stateAttributeValueQuoted(c);
        }
    }
    handleMetaContentValue() {
        if (this.attributeValue.length === 0)
            return;
        const encoding = String.fromCharCode(...this.attributeValue);
        if (this.gotPragma) {
            this.setResult(encoding, ResultType.META_TAG);
        }
        else if (this.needsPragma === null) {
            // Don't override a previous result.
            this.needsPragma = encoding;
        }
        this.attributeValue.length = 0;
    }
    handleAttributeValue() {
        if (this.attribType === AttribType.Charset) {
            this.setResult(String.fromCharCode(...this.attributeValue), ResultType.META_TAG);
        }
    }
    stateAttributeValueUnquoted(c) {
        if (SPACE_CHARACTERS.has(c)) {
            this.handleAttributeValue();
            this.state = State.BeforeAttribute;
        }
        else if (c === Chars.SLASH || c === Chars.GT) {
            this.handleAttributeValue();
            this.state = State.BeforeTag;
        }
        else if (this.attribType === AttribType.Charset) {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    findMetaContentEncoding(c) {
        if (this.advanceSectionIC(exports.STRINGS.CHARSET, c)) {
            if (this.sectionIndex === exports.STRINGS.CHARSET.length) {
                return true;
            }
        }
        else {
            // If we encountered another `c`, assume we started over.
            this.sectionIndex = Number(c === exports.STRINGS.CHARSET[0]);
        }
        return false;
    }
    stateMetaContentValueUnquotedBeforeEncoding(c) {
        if (END_OF_UNQUOTED_ATTRIBUTE_VALUE.has(c)) {
            this.stateAttributeValueUnquoted(c);
        }
        else if (this.sectionIndex === exports.STRINGS.CHARSET.length) {
            if (c === Chars.EQUALS) {
                this.state = State.MetaContentValueUnquotedBeforeValue;
            }
        }
        else {
            this.findMetaContentEncoding(c);
        }
    }
    stateMetaContentValueUnquotedBeforeValue(c) {
        if (isQuote(c)) {
            this.quoteCharacter = c;
            this.state = State.MetaContentValueUnquotedValueQuoted;
        }
        else if (END_OF_UNQUOTED_ATTRIBUTE_VALUE.has(c)) {
            // Can't have spaces here, as it would no longer be part of the attribute value.
            this.stateAttributeValueUnquoted(c);
        }
        else {
            this.state = State.MetaContentValueUnquotedValueUnquoted;
            this.stateMetaContentValueUnquotedValueUnquoted(c);
        }
    }
    stateMetaContentValueUnquotedValueQuoted(c) {
        if (END_OF_UNQUOTED_ATTRIBUTE_VALUE.has(c)) {
            // Quotes weren't matched, so we're done.
            this.stateAttributeValueUnquoted(c);
        }
        else if (c === this.quoteCharacter) {
            this.handleMetaContentValue();
            this.state = State.AttributeValueUnquoted;
        }
        else {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    stateMetaContentValueUnquotedValueUnquoted(c) {
        if (END_OF_UNQUOTED_ATTRIBUTE_VALUE.has(c) || c === Chars.SEMICOLON) {
            this.handleMetaContentValue();
            this.state = State.AttributeValueUnquoted;
            this.stateAttributeValueUnquoted(c);
        }
        else {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    stateMetaContentValueQuotedValueUnquoted(c) {
        if (isQuote(c) || SPACE_CHARACTERS.has(c) || c === Chars.SEMICOLON) {
            this.handleMetaContentValue();
            // We are done with the value, but might not be at the end of the attribute
            this.state = State.AttributeValueQuoted;
            this.stateAttributeValueQuoted(c);
        }
        else {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    stateMetaContentValueQuotedValueQuoted(c) {
        if (isQuote(c)) {
            // We have reached the end of our value.
            if (c !== this.quoteCharacter) {
                // Only handle the value if inner quotes were matched.
                this.handleMetaContentValue();
            }
            this.state = State.AttributeValueQuoted;
            this.stateAttributeValueQuoted(c);
        }
        else {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    stateMetaContentValueQuotedBeforeEncoding(c) {
        if (c === this.quoteCharacter) {
            this.stateAttributeValueQuoted(c);
        }
        else if (this.findMetaContentEncoding(c)) {
            this.state = State.MetaContentValueQuotedAfterEncoding;
        }
    }
    stateMetaContentValueQuotedAfterEncoding(c) {
        if (c === Chars.EQUALS) {
            this.state = State.MetaContentValueQuotedBeforeValue;
        }
        else if (!SPACE_CHARACTERS.has(c)) {
            // Look for the next encoding
            this.state = State.MetaContentValueQuotedBeforeEncoding;
            this.stateMetaContentValueQuotedBeforeEncoding(c);
        }
    }
    stateMetaContentValueQuotedBeforeValue(c) {
        if (c === this.quoteCharacter) {
            this.stateAttributeValueQuoted(c);
        }
        else if (isQuote(c)) {
            this.state = State.MetaContentValueQuotedValueQuoted;
        }
        else if (!SPACE_CHARACTERS.has(c)) {
            this.state = State.MetaContentValueQuotedValueUnquoted;
            this.stateMetaContentValueQuotedValueUnquoted(c);
        }
    }
    stateAttributeValueQuoted(c) {
        if (c === this.quoteCharacter) {
            this.handleAttributeValue();
            this.state = State.BeforeAttribute;
        }
        else if (this.attribType === AttribType.Charset) {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    // Read STRINGS.XML_DECLARATION
    stateXMLDeclaration(c) {
        if (this.advanceSection(exports.STRINGS.XML_DECLARATION, c)) {
            if (this.sectionIndex === exports.STRINGS.XML_DECLARATION.length) {
                this.sectionIndex = 0;
                this.state = State.XMLDeclarationBeforeEncoding;
            }
        }
        else {
            this.state = State.WeirdTag;
        }
    }
    stateXMLDeclarationBeforeEncoding(c) {
        if (this.advanceSection(exports.STRINGS.ENCODING, c)) {
            if (this.sectionIndex === exports.STRINGS.ENCODING.length) {
                this.state = State.XMLDeclarationAfterEncoding;
            }
        }
        else if (c === Chars.GT) {
            this.state = State.BeforeTag;
        }
        else {
            // If we encountered another `c`, assume we started over.
            this.sectionIndex = Number(c === exports.STRINGS.ENCODING[0]);
        }
    }
    stateXMLDeclarationAfterEncoding(c) {
        if (c === Chars.EQUALS) {
            this.state = State.XMLDeclarationBeforeValue;
        }
        else if (c > Chars.SPACE) {
            this.state = State.WeirdTag;
            this.stateWeirdTag(c);
        }
    }
    stateXMLDeclarationBeforeValue(c) {
        if (isQuote(c)) {
            this.attributeValue.length = 0;
            this.state = State.XMLDeclarationValue;
        }
        else if (c > Chars.SPACE) {
            this.state = State.WeirdTag;
            this.stateWeirdTag(c);
        }
    }
    stateXMLDeclarationValue(c) {
        if (isQuote(c)) {
            this.setResult(String.fromCharCode(...this.attributeValue), ResultType.XML_ENCODING);
            this.state = State.WeirdTag;
        }
        else if (c === Chars.GT) {
            this.state = State.BeforeTag;
        }
        else if (c <= Chars.SPACE) {
            this.state = State.WeirdTag;
        }
        else {
            this.attributeValue.push(c | (c >= 0x41 && c <= 0x5a ? 0x20 : 0));
        }
    }
    write(buffer) {
        let index = 0;
        for (; index < buffer.length && this.offset + index < this.maxBytes; index++) {
            const c = buffer[index];
            switch (this.state) {
                case State.Begin: {
                    this.stateBegin(c);
                    break;
                }
                case State.BOM16BE: {
                    this.stateBOM16BE(c);
                    break;
                }
                case State.BOM16LE: {
                    this.stateBOM16LE(c);
                    break;
                }
                case State.BOM8: {
                    this.stateBOM8(c);
                    break;
                }
                case State.UTF16LE_XML_PREFIX: {
                    this.stateUTF16LE_XML_PREFIX(c);
                    break;
                }
                case State.BeginLT: {
                    this.stateBeginLT(c);
                    break;
                }
                case State.UTF16BE_XML_PREFIX: {
                    this.stateUTF16BE_XML_PREFIX(c);
                    break;
                }
                case State.BeforeTag: {
                    // Optimization: Skip all characters until we find a `<`
                    const idx = buffer.indexOf(Chars.LT, index);
                    if (idx === -1) {
                        // We are done with this buffer. Stay in the state and try on the next one.
                        index = buffer.length;
                    }
                    else {
                        index = idx;
                        this.stateBeforeTag(Chars.LT);
                    }
                    break;
                }
                case State.BeforeTagName: {
                    this.stateBeforeTagName(c);
                    break;
                }
                case State.BeforeCloseTagName: {
                    this.stateBeforeCloseTagName(c);
                    break;
                }
                case State.CommentStart: {
                    this.stateCommentStart(c);
                    break;
                }
                case State.CommentEnd: {
                    this.stateCommentEnd(c);
                    break;
                }
                case State.TagNameMeta: {
                    this.stateTagNameMeta(c);
                    break;
                }
                case State.TagNameOther: {
                    this.stateTagNameOther(c);
                    break;
                }
                case State.XMLDeclaration: {
                    this.stateXMLDeclaration(c);
                    break;
                }
                case State.XMLDeclarationBeforeEncoding: {
                    this.stateXMLDeclarationBeforeEncoding(c);
                    break;
                }
                case State.XMLDeclarationAfterEncoding: {
                    this.stateXMLDeclarationAfterEncoding(c);
                    break;
                }
                case State.XMLDeclarationBeforeValue: {
                    this.stateXMLDeclarationBeforeValue(c);
                    break;
                }
                case State.XMLDeclarationValue: {
                    this.stateXMLDeclarationValue(c);
                    break;
                }
                case State.WeirdTag: {
                    this.stateWeirdTag(c);
                    break;
                }
                case State.BeforeAttribute: {
                    this.stateBeforeAttribute(c);
                    break;
                }
                case State.MetaAttribHttpEquiv: {
                    this.stateMetaAttribHttpEquiv(c);
                    break;
                }
                case State.MetaAttribHttpEquivValue: {
                    this.stateMetaAttribHttpEquivValue(c);
                    break;
                }
                case State.MetaAttribC: {
                    this.stateMetaAttribC(c);
                    break;
                }
                case State.MetaAttribContent: {
                    this.stateMetaAttribContent(c);
                    break;
                }
                case State.MetaAttribCharset: {
                    this.stateMetaAttribCharset(c);
                    break;
                }
                case State.MetaAttribAfterName: {
                    this.stateMetaAttribAfterName(c);
                    break;
                }
                case State.MetaContentValueQuotedBeforeEncoding: {
                    this.stateMetaContentValueQuotedBeforeEncoding(c);
                    break;
                }
                case State.MetaContentValueQuotedAfterEncoding: {
                    this.stateMetaContentValueQuotedAfterEncoding(c);
                    break;
                }
                case State.MetaContentValueQuotedBeforeValue: {
                    this.stateMetaContentValueQuotedBeforeValue(c);
                    break;
                }
                case State.MetaContentValueQuotedValueQuoted: {
                    this.stateMetaContentValueQuotedValueQuoted(c);
                    break;
                }
                case State.MetaContentValueQuotedValueUnquoted: {
                    this.stateMetaContentValueQuotedValueUnquoted(c);
                    break;
                }
                case State.MetaContentValueUnquotedBeforeEncoding: {
                    this.stateMetaContentValueUnquotedBeforeEncoding(c);
                    break;
                }
                case State.MetaContentValueUnquotedBeforeValue: {
                    this.stateMetaContentValueUnquotedBeforeValue(c);
                    break;
                }
                case State.MetaContentValueUnquotedValueQuoted: {
                    this.stateMetaContentValueUnquotedValueQuoted(c);
                    break;
                }
                case State.MetaContentValueUnquotedValueUnquoted: {
                    this.stateMetaContentValueUnquotedValueUnquoted(c);
                    break;
                }
                case State.AnyAttribName: {
                    this.stateAnyAttribName(c);
                    break;
                }
                case State.AfterAttributeName: {
                    this.stateAfterAttributeName(c);
                    break;
                }
                case State.BeforeAttributeValue: {
                    this.stateBeforeAttributeValue(c);
                    break;
                }
                case State.AttributeValueQuoted: {
                    this.stateAttributeValueQuoted(c);
                    break;
                }
                case State.AttributeValueUnquoted: {
                    this.stateAttributeValueUnquoted(c);
                    break;
                }
            }
        }
        this.offset += index;
    }
}
exports.Sniffer = Sniffer;
/** Get the encoding for the passed buffer. */
function getEncoding(buffer, options) {
    const sniffer = new Sniffer(options);
    sniffer.write(buffer);
    return sniffer.encoding;
}
//# sourceMappingURL=sniffer.js.map