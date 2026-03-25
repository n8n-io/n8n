import SequentialContainer from './Base';
import { ContainerIterator, initContainer } from "../ContainerBase";
declare class LinkListIterator<T> extends ContainerIterator<T> {
    readonly container: LinkList<T>;
    get pointer(): T;
    set pointer(newValue: T);
    copy(): LinkListIterator<T>;
    equals(iter: LinkListIterator<T>): boolean;
    pre(): this;
    next(): this;
}
export type { LinkListIterator };
declare class LinkList<T> extends SequentialContainer<T> {
    constructor(container?: initContainer<T>);
    clear(): void;
    begin(): LinkListIterator<T>;
    end(): LinkListIterator<T>;
    rBegin(): LinkListIterator<T>;
    rEnd(): LinkListIterator<T>;
    front(): T | undefined;
    back(): T | undefined;
    getElementByPos(pos: number): T;
    eraseElementByPos(pos: number): number;
    eraseElementByValue(_value: T): number;
    eraseElementByIterator(iter: LinkListIterator<T>): LinkListIterator<T>;
    pushBack(element: T): number;
    popBack(): T | undefined;
    /**
     * @description Push an element to the front.
     * @param element - The element you want to push.
     * @returns The size of queue after pushing.
     */
    pushFront(element: T): number;
    /**
     * @description Removes the first element.
     * @returns The element you popped.
     */
    popFront(): T | undefined;
    setElementByPos(pos: number, element: T): void;
    insert(pos: number, element: T, num?: number): number;
    find(element: T): LinkListIterator<T>;
    reverse(): void;
    unique(): number;
    sort(cmp?: (x: T, y: T) => number): void;
    /**
     * @description Merges two sorted lists.
     * @param list - The other list you want to merge (must be sorted).
     * @returns The size of list after merging.
     * @example
     * const linkA = new LinkList([1, 3, 5]);
     * const linkB = new LinkList([2, 4, 6]);
     * linkA.merge(linkB);  // [1, 2, 3, 4, 5];
     */
    merge(list: LinkList<T>): number;
    forEach(callback: (element: T, index: number, list: LinkList<T>) => void): void;
    [Symbol.iterator](): Generator<T, void, unknown>;
}
export default LinkList;
