export declare const enum TreeNodeColor {
    RED = 1,
    BLACK = 0
}
export declare class TreeNode<K, V> {
    _color: TreeNodeColor;
    _key: K | undefined;
    _value: V | undefined;
    _left: TreeNode<K, V> | undefined;
    _right: TreeNode<K, V> | undefined;
    _parent: TreeNode<K, V> | undefined;
    constructor(key?: K, value?: V);
    /**
     * @description Get the pre node.
     * @returns TreeNode about the pre node.
     */
    _pre(): TreeNode<K, V>;
    /**
     * @description Get the next node.
     * @returns TreeNode about the next node.
     */
    _next(): TreeNode<K, V>;
    /**
     * @description Rotate left.
     * @returns TreeNode about moved to original position after rotation.
     */
    _rotateLeft(): TreeNode<K, V>;
    /**
     * @description Rotate right.
     * @returns TreeNode about moved to original position after rotation.
     */
    _rotateRight(): TreeNode<K, V>;
}
export declare class TreeNodeEnableIndex<K, V> extends TreeNode<K, V> {
    _subTreeSize: number;
    /**
     * @description Rotate left and do recount.
     * @returns TreeNode about moved to original position after rotation.
     */
    _rotateLeft(): TreeNodeEnableIndex<K, V>;
    /**
     * @description Rotate right and do recount.
     * @returns TreeNode about moved to original position after rotation.
     */
    _rotateRight(): TreeNodeEnableIndex<K, V>;
    _recount(): void;
}
