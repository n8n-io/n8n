/**
 * @template {AbstractType<any>} T
 * YEvent describes the changes on a YType.
 */
export class YEvent<T extends AbstractType<any>> {
    /**
     * @param {T} target The changed type.
     * @param {Transaction} transaction
     */
    constructor(target: T, transaction: Transaction);
    /**
     * The type on which this event was created on.
     * @type {T}
     */
    target: T;
    /**
     * The current target on which the observe callback is called.
     * @type {AbstractType<any>}
     */
    currentTarget: AbstractType<any>;
    /**
     * The transaction that triggered this event.
     * @type {Transaction}
     */
    transaction: Transaction;
    /**
     * @type {Object|null}
     */
    _changes: Object | null;
    /**
     * @type {null | Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
     */
    _keys: Map<string, {
        action: 'add' | 'update' | 'delete';
        oldValue: any;
    }> | null;
    /**
     * @type {null | Array<{ insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any> }>}
     */
    _delta: {
        insert?: string | object | any[] | AbstractType<any> | undefined;
        retain?: number | undefined;
        delete?: number | undefined;
        attributes?: {
            [x: string]: any;
        } | undefined;
    }[] | null;
    /**
     * @type {Array<string|number>|null}
     */
    _path: Array<string | number> | null;
    /**
     * Computes the path from `y` to the changed type.
     *
     * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
     *
     * The following property holds:
     * @example
     *   let type = y
     *   event.path.forEach(dir => {
     *     type = type.get(dir)
     *   })
     *   type === event.target // => true
     */
    get path(): (string | number)[];
    /**
     * Check if a struct is deleted by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {AbstractStruct} struct
     * @return {boolean}
     */
    deletes(struct: AbstractStruct): boolean;
    /**
     * @type {Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
     */
    get keys(): Map<string, {
        action: 'add' | 'update' | 'delete';
        oldValue: any;
    }>;
    /**
     * This is a computed property. Note that this can only be safely computed during the
     * event call. Computing this property after other changes happened might result in
     * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
     * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
     *
     * @type {Array<{insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
     */
    get delta(): {
        insert?: string | object | any[] | AbstractType<any> | undefined;
        retain?: number | undefined;
        delete?: number | undefined;
        attributes?: {
            [x: string]: any;
        } | undefined;
    }[];
    /**
     * Check if a struct is added by this event.
     *
     * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
     *
     * @param {AbstractStruct} struct
     * @return {boolean}
     */
    adds(struct: AbstractStruct): boolean;
    /**
     * This is a computed property. Note that this can only be safely computed during the
     * event call. Computing this property after other changes happened might result in
     * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
     * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
     *
     * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
     */
    get changes(): {
        added: Set<Item>;
        deleted: Set<Item>;
        keys: Map<string, {
            action: 'add' | 'update' | 'delete';
            oldValue: any;
        }>;
        delta: Array<{
            insert?: Array<any> | string;
            delete?: number;
            retain?: number;
        }>;
    };
}
import { AbstractType } from "../types/AbstractType.js";
import { Transaction } from "./Transaction.js";
import { AbstractStruct } from "../structs/AbstractStruct.js";
import { Item } from "../structs/Item.js";
//# sourceMappingURL=YEvent.d.ts.map