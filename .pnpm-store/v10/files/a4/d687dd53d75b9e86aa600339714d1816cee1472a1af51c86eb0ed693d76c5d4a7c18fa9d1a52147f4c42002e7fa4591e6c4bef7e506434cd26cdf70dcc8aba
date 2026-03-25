import SequentialContainer from './Base';
import { initContainer, IteratorType } from "../ContainerBase";
import { RandomIterator } from "./Base/RandomIterator";
declare class VectorIterator<T> extends RandomIterator<T> {
    container: Vector<T>;
    constructor(node: number, container: Vector<T>, iteratorType?: IteratorType);
    copy(): VectorIterator<T>;
    equals(iter: VectorIterator<T>): boolean;
}
export type { VectorIterator };
declare class Vector<T> extends SequentialContainer<T> {
    /**
     * @param container - Initialize container, must have a forEach function.
     * @param copy - When the container is an array, you can choose to directly operate on the original object of
     *               the array or perform a shallow copy. The default is shallow copy.
     */
    constructor(container?: initContainer<T>, copy?: boolean);
    clear(): void;
    begin(): VectorIterator<T>;
    end(): VectorIterator<T>;
    rBegin(): VectorIterator<T>;
    rEnd(): VectorIterator<T>;
    front(): T | undefined;
    back(): T | undefined;
    getElementByPos(pos: number): T;
    eraseElementByPos(pos: number): number;
    eraseElementByValue(value: T): number;
    eraseElementByIterator(iter: VectorIterator<T>): VectorIterator<T>;
    pushBack(element: T): number;
    popBack(): T | undefined;
    setElementByPos(pos: number, element: T): void;
    insert(pos: number, element: T, num?: number): number;
    find(element: T): VectorIterator<T>;
    reverse(): void;
    unique(): number;
    sort(cmp?: (x: T, y: T) => number): void;
    forEach(callback: (element: T, index: number, vector: Vector<T>) => void): void;
    [Symbol.iterator](): Generator<T, void, undefined>;
}
export default Vector;
