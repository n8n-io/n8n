/**
 * You can manage binding to a custom type with YXmlHook.
 *
 * @extends {YMap<any>}
 */
export class YXmlHook extends YMap<any> {
    /**
     * @param {string} hookName nodeName of the Dom Node.
     */
    constructor(hookName: string);
    /**
     * @type {string}
     */
    hookName: string;
    /**
     * Creates an Item with the same effect as this Item (without position effect)
     */
    _copy(): YXmlHook;
    /**
     * Makes a copy of this data type that can be included somewhere else.
     *
     * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
     *
     * @return {YXmlHook}
     */
    clone(): YXmlHook;
    /**
     * Creates a Dom Element that mirrors this YXmlElement.
     *
     * @param {Document} [_document=document] The document object (you must define
     *                                        this when calling this method in
     *                                        nodejs)
     * @param {Object.<string, any>} [hooks] Optional property to customize how hooks
     *                                             are presented in the DOM
     * @param {any} [binding] You should not set this property. This is
     *                               used if DomBinding wants to create a
     *                               association to the created DOM type
     * @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
     *
     * @public
     */
    public toDOM(_document?: Document | undefined, hooks?: {
        [x: string]: any;
    } | undefined, binding?: any): Element;
}
export function readYXmlHook(decoder: UpdateDecoderV1 | UpdateDecoderV2): YXmlHook;
import { YMap } from "./YMap.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=YXmlHook.d.ts.map