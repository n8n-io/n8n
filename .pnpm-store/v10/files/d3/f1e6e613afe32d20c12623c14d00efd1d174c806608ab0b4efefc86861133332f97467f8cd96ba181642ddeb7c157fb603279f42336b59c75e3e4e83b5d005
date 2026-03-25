/**
 * @typedef {Object|number|null|Array<any>|string|Uint8Array|AbstractType<any>} ValueTypes
 */
/**
 * An YXmlElement imitates the behavior of a
 * https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element
 *
 * * An YXmlElement has attributes (key value pairs)
 * * An YXmlElement has childElements that must inherit from YXmlElement
 *
 * @template {{ [key: string]: ValueTypes }} [KV={ [key: string]: string }]
 */
export class YXmlElement<KV extends {
    [key: string]: ValueTypes;
} = {
    [key: string]: string;
}> extends YXmlFragment {
    constructor(nodeName?: string);
    nodeName: string;
    /**
     * @type {Map<string, any>|null}
     */
    _prelimAttrs: Map<string, any> | null;
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
    /**
     * Creates an Item with the same effect as this Item (without position effect)
     *
     * @return {YXmlElement}
     */
    _copy(): YXmlElement;
    /**
     * Makes a copy of this data type that can be included somewhere else.
     *
     * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
     *
     * @return {YXmlElement<KV>}
     */
    clone(): YXmlElement<KV>;
    /**
     * Removes an attribute from this YXmlElement.
     *
     * @param {string} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    public removeAttribute(attributeName: string): void;
    /**
     * Sets or updates an attribute.
     *
     * @template {keyof KV & string} KEY
     *
     * @param {KEY} attributeName The attribute name that is to be set.
     * @param {KV[KEY]} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    public setAttribute<KEY extends keyof KV & string>(attributeName: KEY, attributeValue: KV[KEY]): void;
    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @template {keyof KV & string} KEY
     *
     * @param {KEY} attributeName The attribute name that identifies the
     *                               queried value.
     * @return {KV[KEY]|undefined} The queried attribute value.
     *
     * @public
     */
    public getAttribute<KEY_1 extends keyof KV & string>(attributeName: KEY_1): KV[KEY_1] | undefined;
    /**
     * Returns whether an attribute exists
     *
     * @param {string} attributeName The attribute name to check for existence.
     * @return {boolean} whether the attribute exists.
     *
     * @public
     */
    public hasAttribute(attributeName: string): boolean;
    /**
     * Returns all attribute name/value pairs in a JSON Object.
     *
     * @param {Snapshot} [snapshot]
     * @return {{ [Key in Extract<keyof KV,string>]?: KV[Key]}} A JSON Object that describes the attributes.
     *
     * @public
     */
    public getAttributes(snapshot?: Snapshot | undefined): { [Key in Extract<keyof KV, string>]?: KV[Key] | undefined; };
}
export function readYXmlElement(decoder: UpdateDecoderV1 | UpdateDecoderV2): YXmlElement;
export type ValueTypes = Object | number | null | Array<any> | string | Uint8Array | AbstractType<any>;
import { YXmlFragment } from "./YXmlFragment.js";
import { YXmlText } from "./YXmlText.js";
import { Snapshot } from "../utils/Snapshot.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
import { AbstractType } from "./AbstractType.js";
//# sourceMappingURL=YXmlElement.d.ts.map