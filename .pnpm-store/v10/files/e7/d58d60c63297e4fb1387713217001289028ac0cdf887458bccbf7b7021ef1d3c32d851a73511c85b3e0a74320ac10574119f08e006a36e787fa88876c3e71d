/**
 * This is a Red Black Tree implementation
 *
 * @template K,V
 */
export class Tree<K, V> {
    root: any;
    length: number;
    /**
     * @param {K} id
     */
    findNext(id: K): V;
    /**
     * @param {K} id
     */
    findPrev(id: K): V;
    /**
     * @param {K} from
     */
    findNodeWithLowerBound(from: K): any;
    /**
     * @param {K} to
     */
    findNodeWithUpperBound(to: K): any;
    /**
     * @return {V}
     */
    findSmallestNode(): V;
    /**
     * @param {K} from
     * @return {V}
     */
    findWithLowerBound(from: K): V;
    /**
     * @param {K} to
     * @return {V}
     */
    findWithUpperBound(to: K): V;
    /**
     * @param {K} from
     * @param {V} from
     * @param {function(V):void} f
     */
    iterate(from: K, to: any, f: (arg0: V) => void): void;
    /**
     * @param {K} id
     * @return {V|null}
     */
    find(id: K): V | null;
    /**
     * @param {K} id
     * @return {N<V>|null}
     */
    findNode(id: K): N<V> | null;
    /**
     * @param {K} id
     */
    delete(id: K): void;
    _fixDelete(n: any): void;
    put(v: any): any;
    _fixInsert(n: any): void;
}
/**
 * @template V
 */
declare class N<V> {
    /**
     * A created node is always red!
     *
     * @param {V} val
     */
    constructor(val: V);
    val: V;
    color: boolean;
    _left: any;
    _right: any;
    _parent: any;
    isRed(): boolean;
    isBlack(): boolean;
    redden(): this;
    blacken(): this;
    get grandparent(): any;
    get parent(): any;
    get sibling(): any;
    set left(n: any);
    get left(): any;
    set right(n: any);
    get right(): any;
    rotateLeft(tree: any): void;
    next(): any;
    prev(): any;
    rotateRight(tree: any): void;
    getUncle(): any;
}
export {};
//# sourceMappingURL=tree.d.ts.map