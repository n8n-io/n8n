export function bindPledge(p: pledge.PledgeInstance<any>, request: IDBRequest): void;
export function openDB(name: string, initDB: (arg0: IDBDatabase) => any): pledge.PledgeInstance<IDBDatabase>;
export function deleteDB(name: pledge.Pledge<string>): pledge.PledgeInstance<void>;
export function createStores(db: IDBDatabase, definitions: Array<Array<string> | Array<string | IDBObjectStoreParameters | undefined>>): void;
export function transact(db: pledge.Pledge<IDBDatabase>, stores: pledge.Pledge<Array<string>>, access?: "readwrite" | "readonly"): pledge.Pledge<Array<IDBObjectStore>>;
export function count(store: IDBObjectStore, range?: pledge.Pledge<IDBKeyRange | undefined>): pledge.PledgeInstance<number>;
export function get(store: pledge.Pledge<IDBObjectStore>, key: pledge.Pledge<string | number | ArrayBuffer | Date | Array<any>>): pledge.PledgeInstance<string | number | ArrayBuffer | Date | Array<any>>;
export function del(store: pledge.Pledge<IDBObjectStore>, key: string | number | ArrayBuffer | Date | IDBKeyRange | Array<any>): pledge.PledgeInstance<any, Error>;
export function put(store: pledge.Pledge<IDBObjectStore>, item: string | number | ArrayBuffer | Date | boolean, key?: string | number | ArrayBuffer | Date | Array<any>): pledge.PledgeInstance<any, Error>;
export function add(store: pledge.Pledge<IDBObjectStore>, item: string | number | ArrayBuffer | Date | boolean, key: string | number | ArrayBuffer | Date | Array<any>): pledge.PledgeInstance<any>;
export function addAutoKey(store: pledge.Pledge<IDBObjectStore>, item: string | number | ArrayBuffer | Date): pledge.PledgeInstance<number>;
export function getAll(store: pledge.Pledge<IDBObjectStore>, range?: IDBKeyRange, limit?: number): pledge.PledgeInstance<Array<any>>;
export function getAllKeys(store: pledge.Pledge<IDBObjectStore>, range?: IDBKeyRange, limit?: number): pledge.PledgeInstance<Array<any>>;
export function queryFirst(store: IDBObjectStore, query: IDBKeyRange | null, direction: "next" | "prev" | "nextunique" | "prevunique"): pledge.PledgeInstance<any>;
export function getLastKey(store: IDBObjectStore, range?: IDBKeyRange | null): pledge.PledgeInstance<any>;
export function getFirstKey(store: IDBObjectStore, range?: IDBKeyRange | null): pledge.PledgeInstance<any>;
export function getAllKeysValues(store: pledge.Pledge<IDBObjectStore>, range?: pledge.Pledge<IDBKeyRange | undefined>, limit?: pledge.Pledge<number | undefined>): pledge.PledgeInstance<Array<KeyValuePair>>;
export function iterate(store: pledge.Pledge<IDBObjectStore>, keyrange: pledge.Pledge<IDBKeyRange | null>, f: (arg0: any, arg1: any) => void | boolean | Promise<void | boolean>, direction?: "next" | "prev" | "nextunique" | "prevunique"): pledge.PledgeInstance<any, Error>;
export function iterateKeys(store: pledge.Pledge<IDBObjectStore>, keyrange: pledge.Pledge<IDBKeyRange | null>, f: (arg0: any) => void | boolean | Promise<void | boolean>, direction?: "next" | "prev" | "nextunique" | "prevunique"): pledge.PledgeInstance<any, Error>;
export function getStore(t: IDBTransaction, store: string): IDBObjectStore;
export function createIDBKeyRangeBound(lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean): IDBKeyRange;
export function createIDBKeyRangeUpperBound(upper: any, upperOpen: boolean): IDBKeyRange;
export function createIDBKeyRangeLowerBound(lower: any, lowerOpen: boolean): IDBKeyRange;
export type KeyValuePair = {
    /**
     * key
     */
    k: any;
    /**
     * Value
     */
    v: any;
};
import * as pledge from './pledge.js';
//# sourceMappingURL=indexeddbV2.d.ts.map