export function rtop(request: IDBRequest): Promise<any>;
export function openDB(name: string, initDB: (arg0: IDBDatabase) => any): Promise<IDBDatabase>;
export function deleteDB(name: string): Promise<any>;
export function createStores(db: IDBDatabase, definitions: Array<Array<string> | Array<string | IDBObjectStoreParameters | undefined>>): void;
export function transact(db: IDBDatabase, stores: Array<string>, access?: "readwrite" | "readonly"): Array<IDBObjectStore>;
export function count(store: IDBObjectStore, range?: IDBKeyRange): Promise<number>;
export function get(store: IDBObjectStore, key: string | number | ArrayBuffer | Date | Array<any>): Promise<string | number | ArrayBuffer | Date | Array<any>>;
export function del(store: IDBObjectStore, key: string | number | ArrayBuffer | Date | IDBKeyRange | Array<any>): Promise<any>;
export function put(store: IDBObjectStore, item: string | number | ArrayBuffer | Date | boolean, key?: string | number | ArrayBuffer | Date | Array<any>): Promise<any>;
export function add(store: IDBObjectStore, item: string | number | ArrayBuffer | Date | boolean, key: string | number | ArrayBuffer | Date | Array<any>): Promise<any>;
export function addAutoKey(store: IDBObjectStore, item: string | number | ArrayBuffer | Date): Promise<number>;
export function getAll(store: IDBObjectStore, range?: IDBKeyRange, limit?: number): Promise<Array<any>>;
export function getAllKeys(store: IDBObjectStore, range?: IDBKeyRange, limit?: number): Promise<Array<any>>;
export function queryFirst(store: IDBObjectStore, query: IDBKeyRange | null, direction: "next" | "prev" | "nextunique" | "prevunique"): Promise<any>;
export function getLastKey(store: IDBObjectStore, range?: IDBKeyRange | null): Promise<any>;
export function getFirstKey(store: IDBObjectStore, range?: IDBKeyRange | null): Promise<any>;
export function getAllKeysValues(store: IDBObjectStore, range?: IDBKeyRange, limit?: number): Promise<Array<KeyValuePair>>;
export function iterate(store: IDBObjectStore, keyrange: IDBKeyRange | null, f: (arg0: any, arg1: any) => void | boolean | Promise<void | boolean>, direction?: "next" | "prev" | "nextunique" | "prevunique"): Promise<void>;
export function iterateKeys(store: IDBObjectStore, keyrange: IDBKeyRange | null, f: (arg0: any) => void | boolean | Promise<void | boolean>, direction?: "next" | "prev" | "nextunique" | "prevunique"): Promise<void>;
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
//# sourceMappingURL=indexeddb.d.ts.map