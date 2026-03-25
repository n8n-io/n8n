export type TextContent = import("./api").TextContent;
/** @typedef {import("./api").TextContent} TextContent */
export class XfaText {
    /**
     * Walk an XFA tree and create an array of text nodes that is compatible
     * with a regular PDFs TextContent. Currently, only TextItem.str is supported,
     * all other fields and styles haven't been implemented.
     *
     * @param {Object} xfa - An XFA fake DOM object.
     *
     * @returns {TextContent}
     */
    static textContent(xfa: Object): TextContent;
    /**
     * @param {string} name - DOM node name. (lower case)
     *
     * @returns {boolean} true if the DOM node should have a corresponding text
     * node.
     */
    static shouldBuildText(name: string): boolean;
}
