export class ItemTextListPosition {
    /**
     * @param {Item|null} left
     * @param {Item|null} right
     * @param {number} index
     * @param {Map<string,any>} currentAttributes
     */
    constructor(left: Item | null, right: Item | null, index: number, currentAttributes: Map<string, any>);
    left: Item | null;
    right: Item | null;
    index: number;
    currentAttributes: Map<string, any>;
    /**
     * Only call this if you know that this.right is defined
     */
    forward(): void;
}
export function cleanupYTextFormatting(type: YText): number;
export function cleanupYTextAfterTransaction(transaction: Transaction): void;
/**
 * The Quill Delta format represents changes on a text document with
 * formatting information. For more information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
 *
 * @example
 *   {
 *     ops: [
 *       { insert: 'Gandalf', attributes: { bold: true } },
 *       { insert: ' the ' },
 *       { insert: 'Grey', attributes: { color: '#cccccc' } }
 *     ]
 *   }
 *
 */
/**
  * Attributes that can be assigned to a selection of text.
  *
  * @example
  *   {
  *     bold: true,
  *     font-size: '40px'
  *   }
  *
  * @typedef {Object} TextAttributes
  */
/**
 * @extends YEvent<YText>
 * Event that describes the changes on a YText type.
 */
export class YTextEvent extends YEvent<YText> {
    /**
     * @param {YText} ytext
     * @param {Transaction} transaction
     * @param {Set<any>} subs The keys that changed
     */
    constructor(ytext: YText, transaction: Transaction, subs: Set<any>);
    /**
     * Whether the children changed.
     * @type {Boolean}
     * @private
     */
    private childListChanged;
    /**
     * Set of all changed attributes.
     * @type {Set<string>}
     */
    keysChanged: Set<string>;
    /**
     * Compute the changes in the delta format.
     * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
     *
     * @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
     *
     * @public
     */
    public get delta(): {
        insert?: string | object | AbstractType<any> | undefined;
        delete?: number | undefined;
        retain?: number | undefined;
        attributes?: {
            [x: string]: any;
        } | undefined;
    }[];
}
/**
 * Type that represents text with formatting information.
 *
 * This type replaces y-richtext as this implementation is able to handle
 * block formats (format information on a paragraph), embeds (complex elements
 * like pictures and videos), and text formats (**bold**, *italic*).
 *
 * @extends AbstractType<YTextEvent>
 */
export class YText extends AbstractType<YTextEvent> {
    /**
     * @param {String} [string] The initial value of the YText.
     */
    constructor(string?: string | undefined);
    /**
     * Array of pending operations on this type
     * @type {Array<function():void>?}
     */
    _pending: (() => void)[] | null;
    /**
     * Whether this YText contains formatting attributes.
     * This flag is updated when a formatting item is integrated (see ContentFormat.integrate)
     */
    _hasFormatting: boolean;
    /**
     * Number of characters of this text type.
     *
     * @type {number}
     */
    get length(): number;
    /**
     * @param {Doc} y
     * @param {Item} item
     */
    _integrate(y: Doc, item: Item): void;
    _copy(): YText;
    /**
     * Makes a copy of this data type that can be included somewhere else.
     *
     * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
     *
     * @return {YText}
     */
    clone(): YText;
    /**
     * Returns the unformatted string representation of this YText type.
     *
     * @return {string}
     * @public
     */
    public toJSON(): string;
    /**
     * Apply a {@link Delta} on this shared YText type.
     *
     * @param {Array<any>} delta The changes to apply on this element.
     * @param {object}  opts
     * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
     *
     *
     * @public
     */
    public applyDelta(delta: Array<any>, { sanitize }?: {
        sanitize?: boolean | undefined;
    }): void;
    /**
     * Returns the Delta representation of this YText type.
     *
     * @param {Snapshot} [snapshot]
     * @param {Snapshot} [prevSnapshot]
     * @param {function('removed' | 'added', ID):any} [computeYChange]
     * @return {any} The Delta representation of this type.
     *
     * @public
     */
    public toDelta(snapshot?: Snapshot | undefined, prevSnapshot?: Snapshot | undefined, computeYChange?: ((arg0: 'removed' | 'added', arg1: ID) => any) | undefined): any;
    /**
     * Insert text at a given index.
     *
     * @param {number} index The index at which to start inserting.
     * @param {String} text The text to insert at the specified position.
     * @param {TextAttributes} [attributes] Optionally define some formatting
     *                                    information to apply on the inserted
     *                                    Text.
     * @public
     */
    public insert(index: number, text: string, attributes?: Object | undefined): void;
    /**
     * Inserts an embed at a index.
     *
     * @param {number} index The index to insert the embed at.
     * @param {Object | AbstractType<any>} embed The Object that represents the embed.
     * @param {TextAttributes} [attributes] Attribute information to apply on the
     *                                    embed
     *
     * @public
     */
    public insertEmbed(index: number, embed: Object | AbstractType<any>, attributes?: Object | undefined): void;
    /**
     * Deletes text starting from an index.
     *
     * @param {number} index Index at which to start deleting.
     * @param {number} length The number of characters to remove. Defaults to 1.
     *
     * @public
     */
    public delete(index: number, length: number): void;
    /**
     * Assigns properties to a range of text.
     *
     * @param {number} index The position where to start formatting.
     * @param {number} length The amount of characters to assign properties to.
     * @param {TextAttributes} attributes Attribute information to apply on the
     *                                    text.
     *
     * @public
     */
    public format(index: number, length: number, attributes: TextAttributes): void;
    /**
     * Removes an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be removed.
     *
     * @public
     */
    public removeAttribute(attributeName: string): void;
    /**
     * Sets or updates an attribute.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that is to be set.
     * @param {any} attributeValue The attribute value that is to be set.
     *
     * @public
     */
    public setAttribute(attributeName: string, attributeValue: any): void;
    /**
     * Returns an attribute value that belongs to the attribute name.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @param {String} attributeName The attribute name that identifies the
     *                               queried value.
     * @return {any} The queried attribute value.
     *
     * @public
     */
    public getAttribute(attributeName: string): any;
    /**
     * Returns all attribute name/value pairs in a JSON Object.
     *
     * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
     *
     * @return {Object<string, any>} A JSON Object that describes the attributes.
     *
     * @public
     */
    public getAttributes(): {
        [x: string]: any;
    };
}
export function readYText(_decoder: UpdateDecoderV1 | UpdateDecoderV2): YText;
/**
 * Attributes that can be assigned to a selection of text.
 */
export type TextAttributes = Object;
import { Item } from "../structs/Item.js";
import { Transaction } from "../utils/Transaction.js";
import { YEvent } from "../utils/YEvent.js";
import { AbstractType } from "./AbstractType.js";
import { Doc } from "../utils/Doc.js";
import { Snapshot } from "../utils/Snapshot.js";
import { ID } from "../utils/ID.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=YText.d.ts.map