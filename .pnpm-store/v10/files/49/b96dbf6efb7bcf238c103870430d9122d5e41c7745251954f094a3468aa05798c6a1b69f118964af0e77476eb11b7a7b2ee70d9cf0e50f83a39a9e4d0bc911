export interface TsMapInter<K, V> {
    size: number;
    set(k: K, v: V): any;
    get(k: K): V;
    has(k: K): boolean;
    delete(k: K): boolean;
    clear(): void;
    keys(): K[];
    values(): V[];
    entries(): [K, V][];
    forEach(cb: (value?: V, key?: K, map?: any) => void, context?: any): void;
}
export default class TsMap<K, V> {
    private keyStore;
    private valueStore;
    size: number;
    constructor(intrator?: [K, V][]);
    set(k: K, v: V): TsMapInter<K, V>;
    get(k: K): V | undefined;
    has(k: K): boolean;
    delete(k: K): boolean;
    clear(): void;
    keys(): K[];
    values(): V[];
    entries(): [K, V][];
    forEach(cb: (value?: V, key?: K, map?: TsMapInter<K, V>) => void, context?: any): void;
}
