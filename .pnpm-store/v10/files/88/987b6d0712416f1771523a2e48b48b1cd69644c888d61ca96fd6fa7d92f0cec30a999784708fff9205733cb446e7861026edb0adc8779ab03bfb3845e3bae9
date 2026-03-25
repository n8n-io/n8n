import TreeContainer from './Base';
import TreeIterator from './Base/TreeIterator';
import { TreeNode } from './Base/TreeNode';
import { initContainer, IteratorType } from "../ContainerBase";
declare class OrderedSetIterator<K> extends TreeIterator<K, undefined> {
    container: OrderedSet<K>;
    constructor(node: TreeNode<K, undefined>, header: TreeNode<K, undefined>, container: OrderedSet<K>, iteratorType?: IteratorType);
    get pointer(): NonNullable<K>;
    copy(): OrderedSetIterator<K>;
    equals(iter: OrderedSetIterator<K>): boolean;
}
export type { OrderedSetIterator };
declare class OrderedSet<K> extends TreeContainer<K, undefined> {
    /**
     * @param container - The initialization container.
     * @param cmp - The compare function.
     * @param enableIndex - Whether to enable iterator indexing function.
     * @example
     * new OrderedSet();
     * new OrderedSet([0, 1, 2]);
     * new OrderedSet([0, 1, 2], (x, y) => x - y);
     * new OrderedSet([0, 1, 2], (x, y) => x - y, true);
     */
    constructor(container?: initContainer<K>, cmp?: (x: K, y: K) => number, enableIndex?: boolean);
    begin(): OrderedSetIterator<K>;
    end(): OrderedSetIterator<K>;
    rBegin(): OrderedSetIterator<K>;
    rEnd(): OrderedSetIterator<K>;
    front(): K | undefined;
    back(): K | undefined;
    /**
     * @description Insert element to set.
     * @param key - The key want to insert.
     * @param hint - You can give an iterator hint to improve insertion efficiency.
     * @return The size of container after setting.
     * @example
     * const st = new OrderedSet([2, 4, 5]);
     * const iter = st.begin();
     * st.insert(1);
     * st.insert(3, iter);  // give a hint will be faster.
     */
    insert(key: K, hint?: OrderedSetIterator<K>): number;
    find(element: K): OrderedSetIterator<K>;
    lowerBound(key: K): OrderedSetIterator<K>;
    upperBound(key: K): OrderedSetIterator<K>;
    reverseLowerBound(key: K): OrderedSetIterator<K>;
    reverseUpperBound(key: K): OrderedSetIterator<K>;
    union(other: OrderedSet<K>): number;
    [Symbol.iterator](): Generator<K, void, unknown>;
    eraseElementByIterator(iter: OrderedSetIterator<K>): OrderedSetIterator<K>;
    forEach(callback: (element: K, index: number, tree: OrderedSet<K>) => void): void;
    getElementByPos(pos: number): K;
}
export default OrderedSet;
