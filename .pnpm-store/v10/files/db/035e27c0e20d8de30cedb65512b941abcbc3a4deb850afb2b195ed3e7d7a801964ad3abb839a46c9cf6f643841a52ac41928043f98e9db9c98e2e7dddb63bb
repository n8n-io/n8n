/**
 * @description The iterator type including `NORMAL` and `REVERSE`.
 */
export declare const enum IteratorType {
    NORMAL = 0,
    REVERSE = 1
}
export declare abstract class ContainerIterator<T> {
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
}
export declare abstract class Base {
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
export declare abstract class Container<T> extends Base {
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
export declare type initContainer<T> = {
    size?: number | (() => number);
    length?: number;
    forEach: (callback: (el: T) => void) => void;
};
