export class QueueNode {
    /**
     * @type {QueueNode|null}
     */
    next: QueueNode | null;
}
/**
 * @template V
 */
export class QueueValue<V> extends QueueNode {
    /**
     * @param {V} v
     */
    constructor(v: V);
    v: V;
}
/**
 * @template {QueueNode} N
 */
export class Queue<N extends QueueNode> {
    /**
     * @type {N | null}
     */
    start: N | null;
    /**
     * @type {N | null}
     */
    end: N | null;
}
export function create<N extends QueueNode>(): Queue<N>;
export function isEmpty(queue: Queue<any>): boolean;
export function enqueue<Q extends Queue<any>>(queue: Q, n: Q extends Queue<infer N> ? N : never): void;
export function dequeue<N extends QueueNode>(queue: Queue<N>): N | null;
//# sourceMappingURL=queue.d.ts.map