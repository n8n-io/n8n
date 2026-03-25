import SequentialContainer from './Base';
import { IteratorType, initContainer } from "../ContainerBase";
import { RandomIterator } from "./Base/RandomIterator";
declare class DequeIterator<T> extends RandomIterator<T> {
    readonly container: Deque<T>;
    constructor(node: number, container: Deque<T>, iteratorType?: IteratorType);
    copy(): DequeIterator<T>;
    equals(iter: DequeIterator<T>): boolean;
}
export type { DequeIterator };
declare class Deque<T> extends SequentialContainer<T> {
    constructor(container?: initContainer<T>, _bucketSize?: number);
    clear(): void;
    begin(): DequeIterator<T>;
    end(): DequeIterator<T>;
    rBegin(): DequeIterator<T>;
    rEnd(): DequeIterator<T>;
    front(): T | undefined;
    back(): T | undefined;
    pushBack(element: T): number;
    popBack(): T | undefined;
    /**
     * @description Push the element to the front.
     * @param element - The element you want to push.
     * @returns The size of queue after pushing.
     */
    pushFront(element: T): number;
    /**
     * @description Remove the _first element.
     * @returns The element you popped.
     */
    popFront(): T | undefined;
    getElementByPos(pos: number): T;
    setElementByPos(pos: number, element: T): void;
    insert(pos: number, element: T, num?: number): number;
    /**
     * @description Remove all elements after the specified position (excluding the specified position).
     * @param pos - The previous position of the first removed element.
     * @returns The size of the container after cutting.
     * @example
     * deque.cut(1); // Then deque's size will be 2. deque -> [0, 1]
     */
    cut(pos: number): number;
    eraseElementByPos(pos: number): number;
    eraseElementByValue(value: T): number;
    eraseElementByIterator(iter: DequeIterator<T>): DequeIterator<T>;
    find(element: T): DequeIterator<T>;
    reverse(): void;
    unique(): number;
    sort(cmp?: (x: T, y: T) => number): void;
    /**
     * @description Remove as much useless space as possible.
     */
    shrinkToFit(): void;
    forEach(callback: (element: T, index: number, deque: Deque<T>) => void): void;
    [Symbol.iterator](): Generator<T, void, unknown>;
}
export default Deque;
