/**
 * @description The iterator type including `NORMAL` and `REVERSE`.
 */
declare const enum IteratorType {
    NORMAL = 0,
    REVERSE = 1
}
declare abstract class ContainerIterator<T> {
    /**
     * @description The container pointed to by the iterator.
     */
    abstract readonly container: Container<T>;
    /**
     * @description Iterator's type.
     * @example
     * console.log(container.end().iteratorType === IteratorType.NORMAL);  // true
     */
    readonly iteratorType: IteratorType;
    /**
     * @param iter - The other iterator you want to compare.
     * @returns Whether this equals to obj.
     * @example
     * container.find(1).equals(container.end());
     */
    equals(iter: ContainerIterator<T>): boolean;
    /**
     * @description Pointers to element.
     * @returns The value of the pointer's element.
     * @example
     * const val = container.begin().pointer;
     */
    abstract get pointer(): T;
    /**
     * @description Set pointer's value (some containers are unavailable).
     * @param newValue - The new value you want to set.
     * @example
     * (<LinkList<number>>container).begin().pointer = 1;
     */
    abstract set pointer(newValue: T);
    /**
     * @description Move `this` iterator to pre.
     * @returns The iterator's self.
     * @example
     * const iter = container.find(1);  // container = [0, 1]
     * const pre = iter.pre();
     * console.log(pre === iter);  // true
     * console.log(pre.equals(iter));  // true
     * console.log(pre.pointer, iter.pointer); // 0, 0
     */
    abstract pre(): this;
    /**
     * @description Move `this` iterator to next.
     * @returns The iterator's self.
     * @example
     * const iter = container.find(1);  // container = [1, 2]
     * const next = iter.next();
     * console.log(next === iter);  // true
     * console.log(next.equals(iter));  // true
     * console.log(next.pointer, iter.pointer); // 2, 2
     */
    abstract next(): this;
    /**
     * @description Get a copy of itself.
     * @returns The copy of self.
     * @example
     * const iter = container.find(1);  // container = [1, 2]
     * const next = iter.copy().next();
     * console.log(next === iter);  // false
     * console.log(next.equals(iter));  // false
     * console.log(next.pointer, iter.pointer); // 2, 1
     */
    abstract copy(): ContainerIterator<T>;
    abstract isAccessible(): boolean;
}
declare abstract class Base {
    /**
     * @returns The size of the container.
     * @example
     * const container = new Vector([1, 2]);
     * console.log(container.length); // 2
     */
    get length(): number;
    /**
     * @returns The size of the container.
     * @example
     * const container = new Vector([1, 2]);
     * console.log(container.size()); // 2
     */
    size(): number;
    /**
     * @returns Whether the container is empty.
     * @example
     * container.clear();
     * console.log(container.empty());  // true
     */
    empty(): boolean;
    /**
     * @description Clear the container.
     * @example
     * container.clear();
     * console.log(container.empty());  // true
     */
    abstract clear(): void;
}
declare abstract class Container<T> extends Base {
    /**
     * @returns Iterator pointing to the beginning element.
     * @example
     * const begin = container.begin();
     * const end = container.end();
     * for (const it = begin; !it.equals(end); it.next()) {
     *   doSomething(it.pointer);
     * }
     */
    abstract begin(): ContainerIterator<T>;
    /**
     * @returns Iterator pointing to the super end like c++.
     * @example
     * const begin = container.begin();
     * const end = container.end();
     * for (const it = begin; !it.equals(end); it.next()) {
     *   doSomething(it.pointer);
     * }
     */
    abstract end(): ContainerIterator<T>;
    /**
     * @returns Iterator pointing to the end element.
     * @example
     * const rBegin = container.rBegin();
     * const rEnd = container.rEnd();
     * for (const it = rBegin; !it.equals(rEnd); it.next()) {
     *   doSomething(it.pointer);
     * }
     */
    abstract rBegin(): ContainerIterator<T>;
    /**
     * @returns Iterator pointing to the super begin like c++.
     * @example
     * const rBegin = container.rBegin();
     * const rEnd = container.rEnd();
     * for (const it = rBegin; !it.equals(rEnd); it.next()) {
     *   doSomething(it.pointer);
     * }
     */
    abstract rEnd(): ContainerIterator<T>;
    /**
     * @returns The first element of the container.
     */
    abstract front(): T | undefined;
    /**
     * @returns The last element of the container.
     */
    abstract back(): T | undefined;
    /**
     * @param element - The element you want to find.
     * @returns An iterator pointing to the element if found, or super end if not found.
     * @example
     * container.find(1).equals(container.end());
     */
    abstract find(element: T): ContainerIterator<T>;
    /**
     * @description Iterate over all elements in the container.
     * @param callback - Callback function like Array.forEach.
     * @example
     * container.forEach((element, index) => console.log(element, index));
     */
    abstract forEach(callback: (element: T, index: number, container: Container<T>) => void): void;
    /**
     * @description Gets the value of the element at the specified position.
     * @example
     * const val = container.getElementByPos(-1); // throw a RangeError
     */
    abstract getElementByPos(pos: number): T;
    /**
     * @description Removes the element at the specified position.
     * @param pos - The element's position you want to remove.
     * @returns The container length after erasing.
     * @example
     * container.eraseElementByPos(-1); // throw a RangeError
     */
    abstract eraseElementByPos(pos: number): number;
    /**
     * @description Removes element by iterator and move `iter` to next.
     * @param iter - The iterator you want to erase.
     * @returns The next iterator.
     * @example
     * container.eraseElementByIterator(container.begin());
     * container.eraseElementByIterator(container.end()); // throw a RangeError
     */
    abstract eraseElementByIterator(iter: ContainerIterator<T>): ContainerIterator<T>;
    /**
     * @description Using for `for...of` syntax like Array.
     * @example
     * for (const element of container) {
     *   console.log(element);
     * }
     */
    abstract [Symbol.iterator](): Generator<T, void>;
}
/**
 * @description The initial data type passed in when initializing the container.
 */
type initContainer<T> = {
    size?: number | (() => number);
    length?: number;
    forEach: (callback: (el: T) => void) => void;
};
declare abstract class TreeIterator<K, V> extends ContainerIterator<K | [
    K,
    V
]> {
    abstract readonly container: TreeContainer<K, V>;
    /**
     * @description Get the sequential index of the iterator in the tree container.<br/>
     *              <strong>Note:</strong>
     *              This function only takes effect when the specified tree container `enableIndex = true`.
     * @returns The index subscript of the node in the tree.
     * @example
     * const st = new OrderedSet([1, 2, 3], true);
     * console.log(st.begin().next().index);  // 1
     */
    get index(): number;
    isAccessible(): boolean;
    // @ts-ignore
    pre(): this;
    // @ts-ignore
    next(): this;
}
declare const enum TreeNodeColor {
    RED = 1,
    BLACK = 0
}
declare class TreeNode<K, V> {
    _color: TreeNodeColor;
    _key: K | undefined;
    _value: V | undefined;
    _left: TreeNode<K, V> | undefined;
    _right: TreeNode<K, V> | undefined;
    _parent: TreeNode<K, V> | undefined;
    constructor(key?: K, value?: V, color?: TreeNodeColor);
    /**
     * @description Get the pre node.
     * @returns TreeNode about the pre node.
     */
    _pre(): TreeNode<K, V>;
    /**
     * @description Get the next node.
     * @returns TreeNode about the next node.
     */
    _next(): TreeNode<K, V>;
    /**
     * @description Rotate left.
     * @returns TreeNode about moved to original position after rotation.
     */
    _rotateLeft(): TreeNode<K, V>;
    /**
     * @description Rotate right.
     * @returns TreeNode about moved to original position after rotation.
     */
    _rotateRight(): TreeNode<K, V>;
}
declare abstract class TreeContainer<K, V> extends Container<K | [
    K,
    V
]> {
    enableIndex: boolean;
    protected _inOrderTraversal(): TreeNode<K, V>[];
    protected _inOrderTraversal(pos: number): TreeNode<K, V>;
    protected _inOrderTraversal(callback: (node: TreeNode<K, V>, index: number, map: this) => void): TreeNode<K, V>;
    clear(): void;
    /**
     * @description Update node's key by iterator.
     * @param iter - The iterator you want to change.
     * @param key - The key you want to update.
     * @returns Whether the modification is successful.
     * @example
     * const st = new orderedSet([1, 2, 5]);
     * const iter = st.find(2);
     * st.updateKeyByIterator(iter, 3); // then st will become [1, 3, 5]
     */
    updateKeyByIterator(iter: TreeIterator<K, V>, key: K): boolean;
    eraseElementByPos(pos: number): number;
    /**
     * @description Remove the element of the specified key.
     * @param key - The key you want to remove.
     * @returns Whether erase successfully.
     */
    eraseElementByKey(key: K): boolean;
    eraseElementByIterator(iter: TreeIterator<K, V>): TreeIterator<K, V>;
    /**
     * @description Get the height of the tree.
     * @returns Number about the height of the RB-tree.
     */
    getHeight(): number;
    /**
     * @param key - The given key you want to compare.
     * @returns An iterator to the first element less than the given key.
     */
    abstract reverseUpperBound(key: K): TreeIterator<K, V>;
    /**
     * @description Union the other tree to self.
     * @param other - The other tree container you want to merge.
     * @returns The size of the tree after union.
     */
    abstract union(other: TreeContainer<K, V>): number;
    /**
     * @param key - The given key you want to compare.
     * @returns An iterator to the first element not greater than the given key.
     */
    abstract reverseLowerBound(key: K): TreeIterator<K, V>;
    /**
     * @param key - The given key you want to compare.
     * @returns An iterator to the first element not less than the given key.
     */
    abstract lowerBound(key: K): TreeIterator<K, V>;
    /**
     * @param key - The given key you want to compare.
     * @returns An iterator to the first element greater than the given key.
     */
    abstract upperBound(key: K): TreeIterator<K, V>;
}
declare class OrderedMapIterator<K, V> extends TreeIterator<K, V> {
    container: OrderedMap<K, V>;
    constructor(node: TreeNode<K, V>, header: TreeNode<K, V>, container: OrderedMap<K, V>, iteratorType?: IteratorType);
    get pointer(): [
        K,
        V
    ];
    copy(): OrderedMapIterator<K, V>;
    // @ts-ignore
    equals(iter: OrderedMapIterator<K, V>): boolean;
}
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
    constructor(container?: initContainer<[
        K,
        V
    ]>, cmp?: (x: K, y: K) => number, enableIndex?: boolean);
    begin(): OrderedMapIterator<K, V>;
    end(): OrderedMapIterator<K, V>;
    rBegin(): OrderedMapIterator<K, V>;
    rEnd(): OrderedMapIterator<K, V>;
    front(): [
        K,
        V
    ] | undefined;
    back(): [
        K,
        V
    ] | undefined;
    lowerBound(key: K): OrderedMapIterator<K, V>;
    upperBound(key: K): OrderedMapIterator<K, V>;
    reverseLowerBound(key: K): OrderedMapIterator<K, V>;
    reverseUpperBound(key: K): OrderedMapIterator<K, V>;
    forEach(callback: (element: [
        K,
        V
    ], index: number, map: OrderedMap<K, V>) => void): void;
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
    getElementByPos(pos: number): [
        K,
        V
    ];
    find(key: K): OrderedMapIterator<K, V>;
    /**
     * @description Get the value of the element of the specified key.
     * @param key - The specified key you want to get.
     * @example
     * const val = container.getElementByKey(1);
     */
    getElementByKey(key: K): V | undefined;
    union(other: OrderedMap<K, V>): number;
    [Symbol.iterator](): Generator<[
        K,
        V
    ], void, unknown>;
    // @ts-ignore
    eraseElementByIterator(iter: OrderedMapIterator<K, V>): OrderedMapIterator<K, V>;
}
export { OrderedMap };
export type { OrderedMapIterator, IteratorType, Container, ContainerIterator, TreeContainer };
