/**
 * @template K, V
 */
export class Cache<K, V> {
    /**
     * @param {number} timeout
     */
    constructor(timeout: number);
    timeout: number;
    /**
     * @type list.List<Entry<K, V>>
     */
    _q: list.List<Entry<K, V>>;
    /**
     * @type {Map<K, Entry<K, V>>}
     */
    _map: Map<K, Entry<K, V>>;
}
export function removeStale<K, V>(cache: Cache<K, V>): number;
export function set<K, V>(cache: Cache<K, V>, key: K, value: V): void;
export function get<K, V>(cache: Cache<K, V>, key: K): V | undefined;
export function refreshTimeout<K, V>(cache: Cache<K, V>, key: K): void;
export function getAsync<K, V>(cache: Cache<K, V>, key: K): V | Promise<V> | undefined;
export function remove<K, V>(cache: Cache<K, V>, key: K): NonNullable<V> | undefined;
export function setIfUndefined<K, V>(cache: Cache<K, V>, key: K, init: () => Promise<V>, removeNull?: boolean): Promise<V> | V;
export function create(timeout: number): Cache<any, any>;
import * as list from './list.js';
/**
 * @template K, V
 *
 * @implements {list.ListNode}
 */
declare class Entry<K, V> implements list.ListNode {
    /**
     * @param {K} key
     * @param {V | Promise<V>} val
     */
    constructor(key: K, val: V | Promise<V>);
    /**
     * @type {this | null}
     */
    prev: this | null;
    /**
     * @type {this | null}
     */
    next: this | null;
    created: number;
    val: V | Promise<V>;
    key: K;
}
export {};
//# sourceMappingURL=cache.d.ts.map