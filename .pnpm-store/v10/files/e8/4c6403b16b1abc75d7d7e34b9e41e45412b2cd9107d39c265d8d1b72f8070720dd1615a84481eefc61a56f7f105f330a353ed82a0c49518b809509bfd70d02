/**
 * Represents text in a Dom Element. In the future this type will also handle
 * simple formatting information like bold and italic.
 */
export class YXmlText extends YText {
    /**
     * @type {YXmlElement|YXmlText|null}
     */
    get nextSibling(): YXmlElement<{
        [key: string]: string;
    }> | YXmlText | null;
    /**
     * @type {YXmlElement|YXmlText|null}
     */
    get prevSibling(): YXmlElement<{
        [key: string]: string;
    }> | YXmlText | null;
    _copy(): YXmlText;
    /**
     * Makes a copy of this data type that can be included somewhere else.
     *
     * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
     *
     * @return {YXmlText}
     */
    clone(): YXmlText;
    /**
     * Creates a Dom Element that mirrors this YXmlText.
     *
     * @param {Document} [_document=document] The document object (you must define
     *                                        this when calling this method in
     *                                        nodejs)
     * @param {Object<string, any>} [hooks] Optional property to customize how hooks
     *                                             are presented in the DOM
     * @param {any} [binding] You should not set this property. This is
     *                               used if DomBinding wants to create a
     *                               association to the created DOM type.
     * @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
     *
     * @public
     */
    public toDOM(_document?: Document | undefined, hooks?: {
        [x: string]: any;
    } | undefined, binding?: any): Text;
    toString(): any;
}
export function readYXmlText(decoder: UpdateDecoderV1 | UpdateDecoderV2): YXmlText;
import { YText } from "./YText.js";
import { YXmlElement } from "./YXmlElement.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=YXmlText.d.ts.map