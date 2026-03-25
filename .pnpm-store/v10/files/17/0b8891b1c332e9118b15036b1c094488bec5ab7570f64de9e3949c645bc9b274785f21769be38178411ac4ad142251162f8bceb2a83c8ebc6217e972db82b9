import { Base, initContainer } from "../ContainerBase";
declare class PriorityQueue<T> extends Base {
    /**
     * @description PriorityQueue's constructor.
     * @param container - Initialize container, must have a forEach function.
     * @param cmp - Compare function.
     * @param copy - When the container is an array, you can choose to directly operate on the original object of
     *               the array or perform a shallow copy. The default is shallow copy.
     * @example
     * new PriorityQueue();
     * new PriorityQueue([1, 2, 3]);
     * new PriorityQueue([1, 2, 3], (x, y) => x - y);
     * new PriorityQueue([1, 2, 3], (x, y) => x - y, false);
     */
    constructor(container?: initContainer<T>, cmp?: (x: T, y: T) => number, copy?: boolean);
    clear(): void;
    /**
     * @description Push element into a container in order.
     * @param item - The element you want to push.
     * @returns The size of heap after pushing.
     * @example
     * queue.push(1);
     */
    push(item: T): void;
    /**
     * @description Removes the top element.
     * @returns The element you popped.
     * @example
     * queue.pop();
     */
    pop(): T | undefined;
    /**
     * @description Accesses the top element.
     * @example
     * const top = queue.top();
     */
    top(): T | undefined;
    /**
     * @description Check if element is in heap.
     * @param item - The item want to find.
     * @returns Whether element is in heap.
     * @example
     * const que = new PriorityQueue([], (x, y) => x.id - y.id);
     * const obj = { id: 1 };
     * que.push(obj);
     * console.log(que.find(obj));  // true
     */
    find(item: T): boolean;
    /**
     * @description Remove specified item from heap.
     * @param item - The item want to remove.
     * @returns Whether remove success.
     * @example
     * const que = new PriorityQueue([], (x, y) => x.id - y.id);
     * const obj = { id: 1 };
     * que.push(obj);
     * que.remove(obj);
     */
    remove(item: T): boolean;
    /**
     * @description Update item and it's pos in the heap.
     * @param item - The item want to update.
     * @returns Whether update success.
     * @example
     * const que = new PriorityQueue([], (x, y) => x.id - y.id);
     * const obj = { id: 1 };
     * que.push(obj);
     * obj.id = 2;
     * que.updateItem(obj);
     */
    updateItem(item: T): boolean;
    /**
     * @returns Return a copy array of heap.
     * @example
     * const arr = queue.toArray();
     */
    toArray(): T[];
}
export default PriorityQueue;
