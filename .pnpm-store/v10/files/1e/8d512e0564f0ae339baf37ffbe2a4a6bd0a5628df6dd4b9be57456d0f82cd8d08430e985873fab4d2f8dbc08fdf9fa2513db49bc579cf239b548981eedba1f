/** The level of entities to support. */
export declare enum EntityLevel {
    /** Support only XML entities. */
    XML = 0,
    /** Support HTML entities, which are a superset of XML entities. */
    HTML = 1
}
/** Determines whether some entities are allowed to be written without a trailing `;`. */
export declare enum DecodingMode {
    /** Support legacy HTML entities. */
    Legacy = 0,
    /** Do not support legacy HTML entities. */
    Strict = 1
}
export declare enum EncodingMode {
    /**
     * The output is UTF-8 encoded. Only characters that need escaping within
     * HTML will be escaped.
     */
    UTF8 = 0,
    /**
     * The output consists only of ASCII characters. Characters that need
     * escaping within HTML, and characters that aren't ASCII characters will
     * be escaped.
     */
    ASCII = 1,
    /**
     * Encode all characters that have an equivalent entity, as well as all
     * characters that are not ASCII characters.
     */
    Extensive = 2
}
interface DecodingOptions {
    /**
     * The level of entities to support.
     * @default EntityLevel.XML
     */
    level?: EntityLevel;
    /**
     * Decoding mode. If `Legacy`, will support legacy entities not terminated
     * with a semicolon (`;`).
     *
     * Always `Strict` for XML. For HTML, set this to `true` if you are parsing
     * an attribute value.
     *
     * The deprecated `decodeStrict` function defaults this to `Strict`.
     *
     * @default DecodingMode.Legacy
     */
    mode?: DecodingMode;
}
/**
 * Decodes a string with entities.
 *
 * @param data String to decode.
 * @param options Decoding options.
 */
export declare function decode(data: string, options?: DecodingOptions | EntityLevel): string;
/**
 * Decodes a string with entities. Does not allow missing trailing semicolons for entities.
 *
 * @param data String to decode.
 * @param options Decoding options.
 * @deprecated Use `decode` with the `mode` set to `Strict`.
 */
export declare function decodeStrict(data: string, options?: DecodingOptions | EntityLevel): string;
/**
 * Options for `encode`.
 */
export interface EncodingOptions {
    /**
     * The level of entities to support.
     * @default EntityLevel.XML
     */
    level?: EntityLevel;
    /**
     * Output format.
     * @default EncodingMode.Extensive
     */
    mode?: EncodingMode;
}
/**
 * Encodes a string with entities.
 *
 * @param data String to encode.
 * @param options Encoding options.
 */
export declare function encode(data: string, options?: EncodingOptions | EntityLevel): string;
export { encodeXML, encodeHTML, encodeNonAsciiHTML, escape, escapeUTF8, encodeHTML as encodeHTML4, encodeHTML as encodeHTML5, } from "./encode";
export { decodeXML, decodeHTML, decodeHTMLStrict, decodeHTML as decodeHTML4, decodeHTML as decodeHTML5, decodeHTMLStrict as decodeHTML4Strict, decodeHTMLStrict as decodeHTML5Strict, decodeXML as decodeXMLStrict, } from "./decode";
//# sourceMappingURL=index.d.ts.map