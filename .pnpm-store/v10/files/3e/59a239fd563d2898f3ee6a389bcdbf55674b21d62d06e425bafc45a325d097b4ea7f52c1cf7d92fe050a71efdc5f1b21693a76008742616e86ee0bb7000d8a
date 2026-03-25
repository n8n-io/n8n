import { initContainer, IteratorType } from "../ContainerBase";
import { HashContainer, HashContainerIterator, HashLinkNode } from "./Base";
declare class HashSetIterator<K> extends HashContainerIterator<K, undefined> {
    readonly container: HashSet<K>;
    constructor(node: HashLinkNode<K, undefined>, header: HashLinkNode<K, undefined>, container: HashSet<K>, iteratorType?: IteratorType);
    get pointer(): K;
    copy(): HashSetIterator<K>;
    equals(iter: HashSetIterator<K>): boolean;
}
export type { HashSetIterator };
declare class HashSet<K> extends HashContainer<K, undefined> {
    constructor(container?: initContainer<K>);
    begin(): HashSetIterator<K>;
    end(): HashSetIterator<K>;
    rBegin(): HashSetIterator<K>;
    rEnd(): HashSetIterator<K>;
    front(): K | undefined;
    back(): K | undefined;
    /**
     * @description Insert element to set.
     * @param key - The key want to insert.
     * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
     *                   If a `undefined` value is passed in, the type will be automatically judged.
     * @returns The size of container after inserting.
     */
    insert(key: K, isObject?: boolean): number;
    getElementByPos(pos: number): K;
    /**
     * @description Check key if exist in container.
     * @param key - The element you want to search.
     * @param isObject - Tell us if the type of inserted key is `object` to improve efficiency.<br/>
     *                   If a `undefined` value is passed in, the type will be automatically judged.
     * @returns An iterator pointing to the element if found, or super end if not found.
     */
    find(key: K, isObject?: boolean): HashSetIterator<K>;
    forEach(callback: (element: K, index: number, container: HashSet<K>) => void): void;
    [Symbol.iterator](): Generator<K, void, unknown>;
}
export default HashSet;
