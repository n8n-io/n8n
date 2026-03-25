import { initContainer, IteratorType } from "../ContainerBase";
import { HashContainer, HashContainerIterator, HashLinkNode } from "./Base";
declare class HashMapIterator<K, V> extends HashContainerIterator<K, V> {
    readonly container: HashMap<K, V>;
    constructor(node: HashLinkNode<K, V>, header: HashLinkNode<K, V>, container: HashMap<K, V>, iteratorType?: IteratorType);
    get pointer(): [K, V];
    copy(): HashMapIterator<K, V>;
    equals(iter: HashMapIterator<K, V>): boolean;
}
export type { HashMapIterator };
declare class HashMap<K, V> extends HashContainer<K, V> {
    constructor(container?: initContainer<[K, V]>);
    begin(): HashMapIterator<K, V>;
    end(): HashMapIterator<K, V>;
    rBegin(): HashMapIterator<K, V>;
    rEnd(): HashMapIterator<K, V>;
    front(): [K, V] | undefined;
    back(): [K, V] | undefined;
    /**
     * @description Insert a key-value pair or set value by the given key.
     * @param key - The key want to insert.
     * @param value - The value want to set.
     * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
     *                   If a `undefined` value is passed in, the type will be automatically judged.
     * @returns The size of container after setting.
     */
    setElement(key: K, value: V, isObject?: boolean): number;
    /**
     * @description Get the value of the element of the specified key.
     * @param key - The key want to search.
     * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
     *                   If a `undefined` value is passed in, the type will be automatically judged.
     * @example
     * const val = container.getElementByKey(1);
     */
    getElementByKey(key: K, isObject?: boolean): V | undefined;
    getElementByPos(pos: number): [K, V];
    /**
     * @description Check key if exist in container.
     * @param key - The element you want to search.
     * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
     *                   If a `undefined` value is passed in, the type will be automatically judged.
     * @returns An iterator pointing to the element if found, or super end if not found.
     */
    find(key: K, isObject?: boolean): HashMapIterator<K, V>;
    forEach(callback: (element: [K, V], index: number, hashMap: HashMap<K, V>) => void): void;
    [Symbol.iterator](): Generator<[K, V], void, unknown>;
}
export default HashMap;
