import { Base, initContainer } from "../ContainerBase";
declare class Queue<T> extends Base {
    constructor(container?: initContainer<T>);
    clear(): void;
    /**
     * @description Inserts element to queue's end.
     * @param element - The element you want to push to the front.
     * @returns The container length after pushing.
     */
    push(element: T): number;
    /**
     * @description Removes the first element.
     * @returns The element you popped.
     */
    pop(): T | undefined;
    /**
     * @description Access the first element.
     * @returns The first element.
     */
    front(): T | undefined;
}
export default Queue;
