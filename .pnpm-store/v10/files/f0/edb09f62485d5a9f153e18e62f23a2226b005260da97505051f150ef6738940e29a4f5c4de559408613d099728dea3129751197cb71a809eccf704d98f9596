import { Options as CSSSelectOptions } from "css-select";
import type { Element, Node, Document } from "domhandler";
export { filters, pseudos, aliases } from "css-select";
export interface Options extends CSSSelectOptions<Node, Element> {
    /** Optional reference to the root of the document. If not set, this will be computed when needed. */
    root?: Document;
}
export declare function is(element: Element, selector: string | ((el: Element) => boolean), options?: Options): boolean;
export declare function some(elements: Element[], selector: string | ((el: Element) => boolean), options?: Options): boolean;
export declare function filter(selector: string, elements: Node[], options?: Options): Element[];
export declare function select(selector: string | ((el: Element) => boolean), root: Node | Node[], options?: Options): Element[];
//# sourceMappingURL=index.d.ts.map