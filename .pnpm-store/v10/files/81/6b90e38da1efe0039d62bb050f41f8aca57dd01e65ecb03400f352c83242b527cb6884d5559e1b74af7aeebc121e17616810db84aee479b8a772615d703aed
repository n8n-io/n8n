export function warnPrematureAccess(): void;
export class ArraySearchMarker {
    /**
     * @param {Item} p
     * @param {number} index
     */
    constructor(p: Item, index: number);
    p: Item;
    index: number;
    timestamp: number;
}
export function findMarker(yarray: AbstractType<any>, index: number): ArraySearchMarker | null;
export function updateMarkerChanges(searchMarker: Array<ArraySearchMarker>, index: number, len: number): void;
export function getTypeChildren(t: AbstractType<any>): Array<Item>;
export function callTypeObservers<EventType>(type: AbstractType<EventType>, transaction: Transaction, event: EventType): void;
/**
 * @template EventType
 * Abstract Yjs Type class
 */
export class AbstractType<EventType> {
    /**
     * @type {Item|null}
     */
    _item: Item | null;
    /**
     * @type {Map<string,Item>}
     */
    _map: Map<string, Item>;
    /**
     * @type {Item|null}
     */
    _start: Item | null;
    /**
     * @type {Doc|null}
     */
    doc: Doc | null;
    _length: number;
    /**
     * Event handlers
     * @type {EventHandler<EventType,Transaction>}
     */
    _eH: EventHandler<EventType, Transaction>;
    /**
     * Deep event handlers
     * @type {EventHandler<Array<YEvent<any>>,Transaction>}
     */
    _dEH: EventHandler<Array<YEvent<any>>, Transaction>;
    /**
     * @type {null | Array<ArraySearchMarker>}
     */
    _searchMarker: null | Array<ArraySearchMarker>;
    /**
     * @return {AbstractType<any>|null}
     */
    get parent(): AbstractType<any> | null;
    /**
     * Integrate this type into the Yjs instance.
     *
     * * Save this struct in the os
     * * This type is sent to other client
     * * Observer functions are fired
     *
     * @param {Doc} y The Yjs instance
     * @param {Item|null} item
     */
    _integrate(y: Doc, item: Item | null): void;
    /**
     * @return {AbstractType<EventType>}
     */
    _copy(): AbstractType<EventType>;
    /**
     * Makes a copy of this data type that can be included somewhere else.
     *
     * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
     *
     * @return {AbstractType<EventType>}
     */
    clone(): AbstractType<EventType>;
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} _encoder
     */
    _write(_encoder: UpdateEncoderV1 | UpdateEncoderV2): void;
    /**
     * The first non-deleted item
     */
    get _first(): Item | null;
    /**
     * Creates YEvent and calls all type observers.
     * Must be implemented by each type.
     *
     * @param {Transaction} transaction
     * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
     */
    _callObserver(transaction: Transaction, _parentSubs: Set<null | string>): void;
    /**
     * Observe all events that are created on this type.
     *
     * @param {function(EventType, Transaction):void} f Observer function
     */
    observe(f: (arg0: EventType, arg1: Transaction) => void): void;
    /**
     * Observe all events that are created by this type and its children.
     *
     * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
     */
    observeDeep(f: (arg0: Array<YEvent<any>>, arg1: Transaction) => void): void;
    /**
     * Unregister an observer function.
     *
     * @param {function(EventType,Transaction):void} f Observer function
     */
    unobserve(f: (arg0: EventType, arg1: Transaction) => void): void;
    /**
     * Unregister an observer function.
     *
     * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
     */
    unobserveDeep(f: (arg0: Array<YEvent<any>>, arg1: Transaction) => void): void;
    /**
     * @abstract
     * @return {any}
     */
    toJSON(): any;
}
export function typeListSlice(type: AbstractType<any>, start: number, end: number): Array<any>;
export function typeListToArray(type: AbstractType<any>): Array<any>;
export function typeListToArraySnapshot(type: AbstractType<any>, snapshot: Snapshot): Array<any>;
export function typeListForEach(type: AbstractType<any>, f: (arg0: any, arg1: number, arg2: any) => void): void;
export function typeListMap<C, R>(type: AbstractType<any>, f: (arg0: C, arg1: number, arg2: AbstractType<any>) => R): R[];
export function typeListCreateIterator(type: AbstractType<any>): IterableIterator<any>;
export function typeListForEachSnapshot(type: AbstractType<any>, f: (arg0: any, arg1: number, arg2: AbstractType<any>) => void, snapshot: Snapshot): void;
export function typeListGet(type: AbstractType<any>, index: number): any;
export function typeListInsertGenericsAfter(transaction: Transaction, parent: AbstractType<any>, referenceItem: Item | null, content: Array<{
    [x: string]: any;
} | Array<any> | boolean | number | null | string | Uint8Array>): void;
export function typeListInsertGenerics(transaction: Transaction, parent: AbstractType<any>, index: number, content: Array<{
    [x: string]: any;
} | Array<any> | number | null | string | Uint8Array>): void;
export function typeListPushGenerics(transaction: Transaction, parent: AbstractType<any>, content: Array<{
    [x: string]: any;
} | Array<any> | number | null | string | Uint8Array>): void;
export function typeListDelete(transaction: Transaction, parent: AbstractType<any>, index: number, length: number): void;
export function typeMapDelete(transaction: Transaction, parent: AbstractType<any>, key: string): void;
export function typeMapSet(transaction: Transaction, parent: AbstractType<any>, key: string, value: Object | number | null | Array<any> | string | Uint8Array | AbstractType<any>): void;
export function typeMapGet(parent: AbstractType<any>, key: string): {
    [x: string]: any;
} | number | null | Array<any> | string | Uint8Array | AbstractType<any> | undefined;
export function typeMapGetAll(parent: AbstractType<any>): {
    [x: string]: {
        [x: string]: any;
    } | number | null | Array<any> | string | Uint8Array | AbstractType<any> | undefined;
};
export function typeMapHas(parent: AbstractType<any>, key: string): boolean;
export function typeMapGetSnapshot(parent: AbstractType<any>, key: string, snapshot: Snapshot): {
    [x: string]: any;
} | number | null | Array<any> | string | Uint8Array | AbstractType<any> | undefined;
export function typeMapGetAllSnapshot(parent: AbstractType<any>, snapshot: Snapshot): {
    [x: string]: {
        [x: string]: any;
    } | number | null | Array<any> | string | Uint8Array | AbstractType<any> | undefined;
};
export function createMapIterator(type: AbstractType<any> & {
    _map: Map<string, Item>;
}): IterableIterator<Array<any>>;
import { Item } from "../structs/Item.js";
import { Transaction } from "../utils/Transaction.js";
import { Doc } from "../utils/Doc.js";
import { EventHandler } from "../utils/EventHandler.js";
import { YEvent } from "../utils/YEvent.js";
import { UpdateEncoderV1 } from "../utils/UpdateEncoder.js";
import { UpdateEncoderV2 } from "../utils/UpdateEncoder.js";
import { Snapshot } from "../utils/Snapshot.js";
//# sourceMappingURL=AbstractType.d.ts.map