export class StructStore {
    /**
     * @type {Map<number,Array<GC|Item>>}
     */
    clients: Map<number, Array<GC | Item>>;
    /**
     * @type {null | { missing: Map<number, number>, update: Uint8Array }}
     */
    pendingStructs: {
        missing: Map<number, number>;
        update: Uint8Array;
    } | null;
    /**
     * @type {null | Uint8Array}
     */
    pendingDs: null | Uint8Array;
}
export function getStateVector(store: StructStore): Map<number, number>;
export function getState(store: StructStore, client: number): number;
export function integrityCheck(store: StructStore): void;
export function addStruct(store: StructStore, struct: GC | Item): void;
export function findIndexSS(structs: Array<Item | GC>, clock: number): number;
export function find(store: StructStore, id: ID): GC | Item;
export function getItem(arg0: StructStore, arg1: ID): Item;
export function findIndexCleanStart(transaction: Transaction, structs: Array<Item | GC>, clock: number): number;
export function getItemCleanStart(transaction: Transaction, id: ID): Item;
export function getItemCleanEnd(transaction: Transaction, store: StructStore, id: ID): Item;
export function replaceStruct(store: StructStore, struct: GC | Item, newStruct: GC | Item): void;
export function iterateStructs(transaction: Transaction, structs: Array<Item | GC>, clockStart: number, len: number, f: (arg0: GC | Item) => void): void;
import { GC } from "../structs/GC.js";
import { Item } from "../structs/Item.js";
import { ID } from "./ID.js";
import { Transaction } from "./Transaction.js";
//# sourceMappingURL=StructStore.d.ts.map