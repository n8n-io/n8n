/**
 * A transaction is created for every change on the Yjs model. It is possible
 * to bundle changes on the Yjs model in a single transaction to
 * minimize the number on messages sent and the number of observer calls.
 * If possible the user of this library should bundle as many changes as
 * possible. Here is an example to illustrate the advantages of bundling:
 *
 * @example
 * const ydoc = new Y.Doc()
 * const map = ydoc.getMap('map')
 * // Log content when change is triggered
 * map.observe(() => {
 *   console.log('change triggered')
 * })
 * // Each change on the map type triggers a log message:
 * map.set('a', 0) // => "change triggered"
 * map.set('b', 0) // => "change triggered"
 * // When put in a transaction, it will trigger the log after the transaction:
 * ydoc.transact(() => {
 *   map.set('a', 1)
 *   map.set('b', 1)
 * }) // => "change triggered"
 *
 * @public
 */
export class Transaction {
    /**
     * @param {Doc} doc
     * @param {any} origin
     * @param {boolean} local
     */
    constructor(doc: Doc, origin: any, local: boolean);
    /**
     * The Yjs instance.
     * @type {Doc}
     */
    doc: Doc;
    /**
     * Describes the set of deleted items by ids
     * @type {DeleteSet}
     */
    deleteSet: DeleteSet;
    /**
     * Holds the state before the transaction started.
     * @type {Map<Number,Number>}
     */
    beforeState: Map<number, number>;
    /**
     * Holds the state after the transaction.
     * @type {Map<Number,Number>}
     */
    afterState: Map<number, number>;
    /**
     * All types that were directly modified (property added or child
     * inserted/deleted). New types are not included in this Set.
     * Maps from type to parentSubs (`item.parentSub = null` for YArray)
     * @type {Map<AbstractType<YEvent<any>>,Set<String|null>>}
     */
    changed: Map<AbstractType<YEvent<any>>, Set<string | null>>;
    /**
     * Stores the events for the types that observe also child elements.
     * It is mainly used by `observeDeep`.
     * @type {Map<AbstractType<YEvent<any>>,Array<YEvent<any>>>}
     */
    changedParentTypes: Map<AbstractType<YEvent<any>>, Array<YEvent<any>>>;
    /**
     * @type {Array<AbstractStruct>}
     */
    _mergeStructs: Array<AbstractStruct>;
    /**
     * @type {any}
     */
    origin: any;
    /**
     * Stores meta information on the transaction
     * @type {Map<any,any>}
     */
    meta: Map<any, any>;
    /**
     * Whether this change originates from this doc.
     * @type {boolean}
     */
    local: boolean;
    /**
     * @type {Set<Doc>}
     */
    subdocsAdded: Set<Doc>;
    /**
     * @type {Set<Doc>}
     */
    subdocsRemoved: Set<Doc>;
    /**
     * @type {Set<Doc>}
     */
    subdocsLoaded: Set<Doc>;
    /**
     * @type {boolean}
     */
    _needFormattingCleanup: boolean;
}
export function writeUpdateMessageFromTransaction(encoder: UpdateEncoderV1 | UpdateEncoderV2, transaction: Transaction): boolean;
export function nextID(transaction: Transaction): import("./ID.js").ID;
export function addChangedTypeToTransaction(transaction: Transaction, type: AbstractType<YEvent<any>>, parentSub: string | null): void;
export function tryGc(ds: DeleteSet, store: StructStore, gcFilter: (arg0: Item) => boolean): void;
export function transact<T>(doc: Doc, f: (arg0: Transaction) => T, origin?: any, local?: boolean): T;
import { Doc } from "./Doc.js";
import { DeleteSet } from "./DeleteSet.js";
import { AbstractType } from "../types/AbstractType.js";
import { YEvent } from "./YEvent.js";
import { AbstractStruct } from "../structs/AbstractStruct.js";
import { UpdateEncoderV1 } from "./UpdateEncoder.js";
import { UpdateEncoderV2 } from "./UpdateEncoder.js";
import { StructStore } from "./StructStore.js";
import { Item } from "../structs/Item.js";
//# sourceMappingURL=Transaction.d.ts.map