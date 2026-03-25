import TreeContainer from './Base';
import TreeIterator from './Base/TreeIterator';
import { TreeNode } from './Base/TreeNode';
import { initContainer, IteratorType } from "../ContainerBase";
declare class OrderedMapIterator<K, V> extends TreeIterator<K, V> {
    container: OrderedMap<K, V>;
    constructor(node: TreeNode<K, V>, header: TreeNode<K, V>, container: OrderedMap<K, V>, iteratorType?: IteratorType);
    get pointer(): [K, V];
    copy(): OrderedMapIterator<K, V>;
    equals(iter: OrderedMapIterator<K, V>): boolean;
}
export type { OrderedMapIterator };
declare class OrderedMap<K, V> extends TreeContainer<K, V> {
    /**
     * @param container - The initialization container.
     * @param cmp - The compare function.
     * @param enableIndex - Whether to enable iterator indexing function.
     * @example
     * new OrderedMap();
     * new OrderedMap([[0, 1], [2, 1]]);
     * new OrderedMap([[0, 1], [2, 1]], (x, y) => x - y);
     * new OrderedMap([[0, 1], [2, 1]], (x, y) => x - y, true);
     */
    constructor(container?: initContainer<[K, V]>, cmp?: (x: K, y: K) => number, enableIndex?: boolean);
    begin(): OrderedMapIterator<K, V>;
    end(): OrderedMapIterator<K, V>;
    rBegin(): OrderedMapIterator<K, V>;
    rEnd(): OrderedMapIterator<K, V>;
    front(): [K, V] | undefined;
    back(): [K, V] | undefined;
    lowerBound(key: K): OrderedMapIterator<K, V>;
    upperBound(key: K): OrderedMapIterator<K, V>;
    reverseLowerBound(key: K): OrderedMapIterator<K, V>;
    reverseUpperBound(key: K): OrderedMapIterator<K, V>;
    /**
     * @description Insert a key-value pair or set value by the given key.
     * @param key - The key want to insert.
     * @param value - The value want to set.
     * @param hint - You can give an iterator hint to improve insertion efficiency.
     * @return The size of container after setting.
     * @example
     * const mp = new OrderedMap([[2, 0], [4, 0], [5, 0]]);
     * const iter = mp.begin();
     * mp.setElement(1, 0);
     * mp.setElement(3, 0, iter);  // give a hint will be faster.
     */
    setElement(key: K, value: V, hint?: OrderedMapIterator<K, V>): number;
    find(key: K): OrderedMapIterator<K, V>;
    /**
     * @description Get the value of the element of the specified key.
     * @param key - The specified key you want to get.
     * @example
     * const val = container.getElementByKey(1);
     */
    getElementByKey(key: K): V | undefined;
    union(other: OrderedMap<K, V>): number;
    [Symbol.iterator](): Generator<[K, V], void, unknown>;
    eraseElementByIterator(iter: OrderedMapIterator<K, V>): OrderedMapIterator<K, V>;
    forEach(callback: (element: [K, V], index: number, map: OrderedMap<K, V>) => void): void;
    getElementByPos(pos: number): [K, V];
}
export default OrderedMap;
