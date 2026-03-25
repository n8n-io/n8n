import { type Options as CSSSelectOptions } from "css-select";
import type { Element, AnyNode, Document } from "domhandler";
export { filters, pseudos, aliases } from "css-select";
export interface Options extends CSSSelectOptions<AnyNode, Element> {
    /** Optional reference to the root of the document. If not set, this will be computed when needed. */
    root?: Document;
}
export declare function is(element: Element, selector: string | ((el: Element) => boolean), options?: Options): boolean;
export declare function some(elements: Element[], selector: string | ((el: Element) => boolean), options?: Options): boolean;
export declare function filter(selector: string, elements: AnyNode[], options?: Options): Element[];
export declare function select(selector: string | ((el: Element) => boolean), root: AnyNode | AnyNode[], options?: Options, limit?: number): Element[];
//# sourceMappingURL=index.d.ts.map