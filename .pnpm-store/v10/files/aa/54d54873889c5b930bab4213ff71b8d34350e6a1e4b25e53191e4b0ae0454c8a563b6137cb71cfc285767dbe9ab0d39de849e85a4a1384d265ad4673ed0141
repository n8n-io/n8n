import { ContainerIterator } from "../../ContainerBase";
import TreeContainer from "./index";
declare abstract class TreeIterator<K, V> extends ContainerIterator<K | [K, V]> {
    abstract readonly container: TreeContainer<K, V>;
    /**
     * @description Get the sequential index of the iterator in the tree container.<br/>
     *              <strong>Note:</strong>
     *              This function only takes effect when the specified tree container `enableIndex = true`.
     * @returns The index subscript of the node in the tree.
     * @example
     * const st = new OrderedSet([1, 2, 3], true);
     * console.log(st.begin().next().index);  // 1
     */
    get index(): number;
    pre(): this;
    next(): this;
}
export default TreeIterator;
