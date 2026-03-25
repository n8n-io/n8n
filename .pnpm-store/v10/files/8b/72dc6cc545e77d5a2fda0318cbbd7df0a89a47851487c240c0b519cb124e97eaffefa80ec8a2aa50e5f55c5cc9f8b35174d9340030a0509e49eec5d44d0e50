export function followRedone(store: StructStore, id: ID): {
    item: Item;
    diff: number;
};
export function keepItem(item: Item | null, keep: boolean): void;
export function splitItem(transaction: Transaction, leftItem: Item, diff: number): Item;
export function redoItem(transaction: Transaction, item: Item, redoitems: Set<Item>, itemsToDelete: DeleteSet, ignoreRemoteMapChanges: boolean, um: import('../utils/UndoManager.js').UndoManager): Item | null;
/**
 * Abstract class that represents any content.
 */
export class Item extends AbstractStruct {
    /**
     * @param {ID} id
     * @param {Item | null} left
     * @param {ID | null} origin
     * @param {Item | null} right
     * @param {ID | null} rightOrigin
     * @param {AbstractType<any>|ID|null} parent Is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.
     * @param {string | null} parentSub
     * @param {AbstractContent} content
     */
    constructor(id: ID, left: Item | null, origin: ID | null, right: Item | null, rightOrigin: ID | null, parent: AbstractType<any> | ID | null, parentSub: string | null, content: AbstractContent);
    /**
     * The item that was originally to the left of this item.
     * @type {ID | null}
     */
    origin: ID | null;
    /**
     * The item that is currently to the left of this item.
     * @type {Item | null}
     */
    left: Item | null;
    /**
     * The item that is currently to the right of this item.
     * @type {Item | null}
     */
    right: Item | null;
    /**
     * The item that was originally to the right of this item.
     * @type {ID | null}
     */
    rightOrigin: ID | null;
    /**
     * @type {AbstractType<any>|ID|null}
     */
    parent: AbstractType<any> | ID | null;
    /**
     * If the parent refers to this item with some kind of key (e.g. YMap, the
     * key is specified here. The key is then used to refer to the list in which
     * to insert this item. If `parentSub = null` type._start is the list in
     * which to insert to. Otherwise it is `parent._map`.
     * @type {String | null}
     */
    parentSub: string | null;
    /**
     * If this type's effect is redone this type refers to the type that undid
     * this operation.
     * @type {ID | null}
     */
    redone: ID | null;
    /**
     * @type {AbstractContent}
     */
    content: AbstractContent;
    /**
     * bit1: keep
     * bit2: countable
     * bit3: deleted
     * bit4: mark - mark node as fast-search-marker
     * @type {number} byte
     */
    info: number;
    /**
     * This is used to mark the item as an indexed fast-search marker
     *
     * @type {boolean}
     */
    set marker(arg: boolean);
    get marker(): boolean;
    set keep(arg: boolean);
    /**
     * If true, do not garbage collect this Item.
     */
    get keep(): boolean;
    get countable(): boolean;
    set deleted(arg: boolean);
    /**
     * Whether this item was deleted or not.
     * @type {Boolean}
     */
    get deleted(): boolean;
    markDeleted(): void;
    /**
     * Return the creator clientID of the missing op or define missing items and return null.
     *
     * @param {Transaction} transaction
     * @param {StructStore} store
     * @return {null | number}
     */
    getMissing(transaction: Transaction, store: StructStore): null | number;
    /**
     * Returns the next non-deleted item
     */
    get next(): Item | null;
    /**
     * Returns the previous non-deleted item
     */
    get prev(): Item | null;
    /**
     * Computes the last content address of this Item.
     */
    get lastId(): ID;
    /**
     * Try to merge two items
     *
     * @param {Item} right
     * @return {boolean}
     */
    mergeWith(right: Item): boolean;
    /**
     * Mark this Item as deleted.
     *
     * @param {Transaction} transaction
     */
    delete(transaction: Transaction): void;
    /**
     * @param {StructStore} store
     * @param {boolean} parentGCd
     */
    gc(store: StructStore, parentGCd: boolean): void;
    /**
     * Transform the properties of this type to binary and write it to an
     * BinaryEncoder.
     *
     * This is called when this Item is sent to a remote peer.
     *
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
     * @param {number} offset
     */
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
}
export function readItemContent(decoder: UpdateDecoderV1 | UpdateDecoderV2, info: number): AbstractContent;
/**
 * A lookup map for reading Item content.
 *
 * @type {Array<function(UpdateDecoderV1 | UpdateDecoderV2):AbstractContent>}
 */
export const contentRefs: Array<(arg0: UpdateDecoderV1 | UpdateDecoderV2) => AbstractContent>;
/**
 * Do not implement this class!
 */
export class AbstractContent {
    /**
     * @return {number}
     */
    getLength(): number;
    /**
     * @return {Array<any>}
     */
    getContent(): Array<any>;
    /**
     * Should return false if this Item is some kind of meta information
     * (e.g. format information).
     *
     * * Whether this Item should be addressable via `yarray.get(i)`
     * * Whether this Item should be counted when computing yarray.length
     *
     * @return {boolean}
     */
    isCountable(): boolean;
    /**
     * @return {AbstractContent}
     */
    copy(): AbstractContent;
    /**
     * @param {number} _offset
     * @return {AbstractContent}
     */
    splice(_offset: number): AbstractContent;
    /**
     * @param {AbstractContent} _right
     * @return {boolean}
     */
    mergeWith(_right: AbstractContent): boolean;
    /**
     * @param {Transaction} _transaction
     * @param {Item} _item
     */
    integrate(_transaction: Transaction, _item: Item): void;
    /**
     * @param {Transaction} _transaction
     */
    delete(_transaction: Transaction): void;
    /**
     * @param {StructStore} _store
     */
    gc(_store: StructStore): void;
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} _encoder
     * @param {number} _offset
     */
    write(_encoder: UpdateEncoderV1 | UpdateEncoderV2, _offset: number): void;
    /**
     * @return {number}
     */
    getRef(): number;
}
import { StructStore } from "../utils/StructStore.js";
import { ID } from "../utils/ID.js";
import { Transaction } from "../utils/Transaction.js";
import { DeleteSet } from "../utils/DeleteSet.js";
import { AbstractStruct } from "./AbstractStruct.js";
import { AbstractType } from "../types/AbstractType.js";
import { UpdateEncoderV1 } from "../utils/UpdateEncoder.js";
import { UpdateEncoderV2 } from "../utils/UpdateEncoder.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=Item.d.ts.map