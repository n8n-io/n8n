export class ListNode {
    /**
     * @type {this|null}
     */
    next: this | null;
    /**
     * @type {this|null}
     */
    prev: this | null;
}
/**
 * @template {ListNode} N
 */
export class List<N extends ListNode> {
    /**
     * @type {N | null}
     */
    start: N | null;
    /**
     * @type {N | null}
     */
    end: N | null;
    len: number;
    toArray(): N[];
    /**
     * @param {function(N):any} f
     */
    forEach(f: (arg0: N) => any): void;
    /**
     * @template M
     * @param {function(N):M} f
     * @return {Array<M>}
     */
    map<M>(f: (arg0: N) => M): Array<M>;
    [Symbol.iterator](): Generator<N, void, unknown>;
    /**
     * @param {List<any>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: List<any>): boolean;
}
export function create<N extends ListNode>(): List<N>;
export function isEmpty<N extends ListNode>(queue: List<N>): boolean;
export function remove<N extends ListNode>(list: List<N>, node: N): N;
export function removeNode<N extends ListNode>(list: List<N>, node: N): N;
export function insertBetween<N extends ListNode>(queue: List<N>, left: N | null, right: N | null, node: N): void;
export function replace<N extends ListNode>(queue: List<N>, node: N, newNode: N): void;
export function pushEnd<N extends ListNode>(queue: List<N>, n: N): void;
export function pushFront<N extends ListNode>(queue: List<N>, n: N): void;
export function popFront<N extends ListNode>(list: List<N>): N | null;
export function popEnd<N extends ListNode>(list: List<N>): N | null;
export function map<N extends ListNode, M>(list: List<N>, f: (arg0: N) => M): Array<M>;
export function toArray<N extends ListNode>(list: List<N>): N[];
export function forEach<N extends ListNode>(list: List<N>, f: (arg0: N) => any): void;
import * as equalityTrait from './trait/equality.js';
//# sourceMappingURL=list.d.ts.map