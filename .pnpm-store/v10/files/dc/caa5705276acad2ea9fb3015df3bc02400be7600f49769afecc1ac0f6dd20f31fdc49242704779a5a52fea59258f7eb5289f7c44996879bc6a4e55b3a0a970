/**
 * Event that describes the changes on a YArray
 * @template T
 * @extends YEvent<YArray<T>>
 */
export class YArrayEvent<T> extends YEvent<YArray<T>> {
    constructor(target: YArray<T>, transaction: Transaction);
}
/**
 * A shared Array implementation.
 * @template T
 * @extends AbstractType<YArrayEvent<T>>
 * @implements {Iterable<T>}
 */
export class YArray<T> extends AbstractType<YArrayEvent<T>> implements Iterable<T> {
    /**
     * Construct a new YArray containing the specified items.
     * @template {Object<string,any>|Array<any>|number|null|string|Uint8Array} T
     * @param {Array<T>} items
     * @return {YArray<T>}
     */
    static from<T_1 extends string | number | any[] | Uint8Array | {
        [x: string]: any;
    } | null>(items: T_1[]): YArray<T_1>;
    /**
     * @type {Array<any>?}
     * @private
     */
    private _prelimContent;
    /**
     * @type {Array<ArraySearchMarker>}
     */
    _searchMarker: Array<ArraySearchMarker>;
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     *
     * @param {Doc} y The Yjs instance
     * @param {Item} item
     */
    _integrate(y: Doc, item: Item): void;
    /**
     * @return {YArray<T>}
     */
    _copy(): YArray<T>;
    /**
     * Makes a copy of this data type that can be included somewhere else.
     *
     * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
     *
     * @return {YArray<T>}
     */
    clone(): YArray<T>;
    get length(): number;
    /**
     * Inserts new content at an index.
     *
     * Important: This function expects an array of content. Not just a content
     * object. The reason for this "weirdness" is that inserting several elements
     * is very efficient when it is done as a single operation.
     *
     * @example
     *  // Insert character 'a' at position 0
     *  yarray.insert(0, ['a'])
     *  // Insert numbers 1, 2 at position 1
     *  yarray.insert(1, [1, 2])
     *
     * @param {number} index The index to insert content at.
     * @param {Array<T>} content The array of content
     */
    insert(index: number, content: Array<T>): void;
    /**
     * Appends content to this YArray.
     *
     * @param {Array<T>} content Array of content to append.
     *
     * @todo Use the following implementation in all types.
     */
    push(content: Array<T>): void;
    /**
     * Prepends content to this YArray.
     *
     * @param {Array<T>} content Array of content to prepend.
     */
    unshift(content: Array<T>): void;
    /**
     * Deletes elements starting from an index.
     *
     * @param {number} index Index at which to start deleting elements
     * @param {number} length The number of elements to remove. Defaults to 1.
     */
    delete(index: number, length?: number): void;
    /**
     * Returns the i-th element from a YArray.
     *
     * @param {number} index The index of the element to return from the YArray
     * @return {T}
     */
    get(index: number): T;
    /**
     * Transforms this YArray to a JavaScript Array.
     *
     * @return {Array<T>}
     */
    toArray(): Array<T>;
    /**
     * Returns a portion of this YArray into a JavaScript Array selected
     * from start to end (end not included).
     *
     * @param {number} [start]
     * @param {number} [end]
     * @return {Array<T>}
     */
    slice(start?: number | undefined, end?: number | undefined): Array<T>;
    /**
     * Transforms this Shared Type to a JSON object.
     *
     * @return {Array<any>}
     */
    toJSON(): Array<any>;
    /**
     * Returns an Array with the result of calling a provided function on every
     * element of this YArray.
     *
     * @template M
     * @param {function(T,number,YArray<T>):M} f Function that produces an element of the new Array
     * @return {Array<M>} A new array with each element being the result of the
     *                 callback function
     */
    map<M>(f: (arg0: T, arg1: number, arg2: YArray<T>) => M): M[];
    /**
     * Executes a provided function once on every element of this YArray.
     *
     * @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
     */
    forEach(f: (arg0: T, arg1: number, arg2: YArray<T>) => void): void;
    /**
     * @return {IterableIterator<T>}
     */
    [Symbol.iterator](): IterableIterator<T>;
}
export function readYArray(_decoder: UpdateDecoderV1 | UpdateDecoderV2): YArray<any>;
import { YEvent } from "../utils/YEvent.js";
import { Transaction } from "../utils/Transaction.js";
import { AbstractType } from "./AbstractType.js";
import { ArraySearchMarker } from "./AbstractType.js";
import { Doc } from "../utils/Doc.js";
import { Item } from "../structs/Item.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=YArray.d.ts.map