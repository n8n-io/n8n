import { NodeHtmlMarkdownOptions } from './options';
import { ElementNode, HtmlNode } from './nodes';
export declare const trimNewLines: (s: string) => string;
export declare const surround: (source: string, surroundStr: string) => string;
export declare const isWhiteSpaceOnly: (s: string) => boolean;
/**
 * Split string, preserving specific newline used for each line
 */
export declare function splitSpecial(s: string): {
    text: string;
    newLineChar: '\r' | '\n' | '\r\n' | '';
}[];
/**
 * Surround tag content with delimiter (moving any leading/trailing space to outside the tag
 */
export declare function tagSurround(content: string, surroundStr: string): string;
export declare const getTrailingWhitespaceInfo: (s: string) => {
    whitespace: number;
    newLines: number;
};
/**
 * If value is truthy, returns `value` (or `v` if no `value` provided), otherwise, returns an empty string
 * @param v - Var to check for truthiness
 * @param value - Value to return if true
 */
export declare const truthyStr: (v: any, value?: string | undefined) => string;
/**
 * Parser string to HTMLElement
 */
export declare function parseHTML(html: string, options: NodeHtmlMarkdownOptions): ElementNode;
export declare function getChildNodes<T extends HtmlNode | Node>(node: T): T[];
export declare function perfStart(label: string): void;
export declare function perfStop(label: string): void;
