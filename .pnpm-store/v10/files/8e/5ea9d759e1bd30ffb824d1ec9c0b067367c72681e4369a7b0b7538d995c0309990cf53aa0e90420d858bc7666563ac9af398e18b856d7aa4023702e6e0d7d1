export declare enum ResultType {
    BOM = 0,
    PASSED = 1,
    XML_PREFIX = 2,
    META_TAG = 3,
    XML_ENCODING = 4,
    DEFAULT = 5
}
export declare const STRINGS: {
    UTF8_BOM: Uint8Array;
    UTF16LE_BOM: Uint8Array;
    UTF16BE_BOM: Uint8Array;
    UTF16LE_XML_PREFIX: Uint8Array;
    UTF16BE_XML_PREFIX: Uint8Array;
    XML_DECLARATION: Uint8Array;
    ENCODING: Uint8Array;
    META: Uint8Array;
    HTTP_EQUIV: Uint8Array;
    CONTENT: Uint8Array;
    CONTENT_TYPE: Uint8Array;
    CHARSET: Uint8Array;
    COMMENT_START: Uint8Array;
    COMMENT_END: Uint8Array;
};
export interface SnifferOptions {
    /**
     * The maximum number of bytes to sniff.
     *
     * @default 1024
     */
    maxBytes?: number;
    /**
     * The encoding specified by the user.
     */
    userEncoding?: string;
    /**
     * The encoding specified by the transport layer.
     */
    transportLayerEncodingLabel?: string;
    /**
     * The default encoding to use.
     *
     * @default "windows-1252"
     */
    defaultEncoding?: string;
}
export declare class Sniffer {
    /** The maximum number of bytes to sniff. */
    private readonly maxBytes;
    /** The offset of the previous buffers. */
    private offset;
    private state;
    private sectionIndex;
    private attribType;
    /**
     * Indicates if the `http-equiv` is `content-type`.
     *
     * Initially `null`, a boolean when a value is found.
     */
    private gotPragma;
    private needsPragma;
    private inMetaTag;
    encoding: string;
    resultType: ResultType;
    private setResult;
    constructor({ maxBytes, userEncoding, transportLayerEncodingLabel, defaultEncoding, }?: SnifferOptions);
    private stateBegin;
    private stateBeginLT;
    private stateUTF16BE_XML_PREFIX;
    private stateUTF16LE_XML_PREFIX;
    private stateBOM16LE;
    private stateBOM16BE;
    private stateBOM8;
    private stateBeforeTag;
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
    private stateBeforeTagName;
    private stateBeforeCloseTagName;
    private stateCommentStart;
    private stateCommentEnd;
    /**
     * Any section starting with `<!`, `<?`, `</`, without being a closing tag or comment.
     */
    private stateWeirdTag;
    /**
     * Advances the section, ignoring upper/lower case.
     *
     * Make sure the section has left-over characters before calling.
     *
     * @returns `false` if we did not match the section.
     */
    private advanceSectionIC;
    /**
     * Advances the section.
     *
     * Make sure the section has left-over characters before calling.
     *
     * @returns `false` if we did not match the section.
     */
    private advanceSection;
    private stateTagNameMeta;
    private stateTagNameOther;
    private stateBeforeAttribute;
    private handleMetaAttrib;
    private stateMetaAttribHttpEquiv;
    private stateMetaAttribC;
    private stateMetaAttribCharset;
    private stateMetaAttribContent;
    private stateMetaAttribAfterName;
    private stateAnyAttribName;
    private stateAfterAttributeName;
    private quoteCharacter;
    private readonly attributeValue;
    private stateBeforeAttributeValue;
    private stateMetaAttribHttpEquivValue;
    private handleMetaContentValue;
    private handleAttributeValue;
    private stateAttributeValueUnquoted;
    private findMetaContentEncoding;
    private stateMetaContentValueUnquotedBeforeEncoding;
    private stateMetaContentValueUnquotedBeforeValue;
    private stateMetaContentValueUnquotedValueQuoted;
    private stateMetaContentValueUnquotedValueUnquoted;
    private stateMetaContentValueQuotedValueUnquoted;
    private stateMetaContentValueQuotedValueQuoted;
    private stateMetaContentValueQuotedBeforeEncoding;
    private stateMetaContentValueQuotedAfterEncoding;
    private stateMetaContentValueQuotedBeforeValue;
    private stateAttributeValueQuoted;
    private stateXMLDeclaration;
    private stateXMLDeclarationBeforeEncoding;
    private stateXMLDeclarationAfterEncoding;
    private stateXMLDeclarationBeforeValue;
    private stateXMLDeclarationValue;
    write(buffer: Uint8Array): void;
}
/** Get the encoding for the passed buffer. */
export declare function getEncoding(buffer: Uint8Array, options?: SnifferOptions): string;
//# sourceMappingURL=sniffer.d.ts.map