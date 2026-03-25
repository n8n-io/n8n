import { Stringable } from "./stringable";
/**
 * @internal
 *
 * Represents an XML node.
 */
export declare class XmlNode {
    private name;
    readonly children: Stringable[];
    private attributes;
    static of(name: string, childText?: string, withName?: string): XmlNode;
    constructor(name: string, children?: Stringable[]);
    withName(name: string): XmlNode;
    addAttribute(name: string, value: any): XmlNode;
    addChildNode(child: Stringable): XmlNode;
    removeAttribute(name: string): XmlNode;
    /**
     * @internal
     * Alias of {@link XmlNode#withName(string)} for codegen brevity.
     */
    n(name: string): XmlNode;
    /**
     * @internal
     * Alias of {@link XmlNode#addChildNode(string)} for codegen brevity.
     */
    c(child: Stringable): XmlNode;
    /**
     * @internal
     * Checked version of {@link XmlNode#addAttribute(string)} for codegen brevity.
     */
    a(name: string, value: any): XmlNode;
    /**
     * Create a child node.
     * Used in serialization of string fields.
     * @internal
     */
    cc(input: any, field: string, withName?: string): void;
    /**
     * Creates list child nodes.
     * @internal
     */
    l(input: any, listName: string, memberName: string, valueProvider: Function): void;
    /**
     * Creates list child nodes with container.
     * @internal
     */
    lc(input: any, listName: string, memberName: string, valueProvider: Function): void;
    toString(): string;
}
