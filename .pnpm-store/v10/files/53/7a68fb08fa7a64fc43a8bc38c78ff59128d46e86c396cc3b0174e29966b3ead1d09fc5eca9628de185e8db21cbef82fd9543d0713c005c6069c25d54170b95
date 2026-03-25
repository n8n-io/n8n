import type { ComponentInternalInstance, ExtractPropTypes, SetupContext } from 'vue';
import type { treeEmits, treeProps } from './virtual-tree';
export declare type TreeNodeData = Record<string, any>;
export declare type TreeData = TreeNodeData[];
export declare type TreeKey = string | number;
export interface TreeOptionProps {
    children?: string;
    label?: string;
    value?: string;
    disabled?: string;
}
export declare type TreeProps = ExtractPropTypes<typeof treeProps>;
export interface TreeNode {
    key: TreeKey;
    level: number;
    parent?: TreeNode;
    children?: TreeNode[];
    data: TreeNodeData;
    disabled?: boolean;
    label?: string;
    isLeaf?: boolean;
}
export interface TreeContext {
    ctx: Omit<SetupContext<typeof treeEmits>, 'expose' | 'attrs'>;
    instance: ComponentInternalInstance;
    props: TreeProps;
}
export interface Tree {
    treeNodeMap: Map<TreeKey, TreeNode>;
    levelTreeNodeMap: Map<number, TreeNode[]>;
    treeNodes: TreeNode[];
    maxLevel: number;
}
export declare type FilterMethod = (query: string, node: TreeNodeData) => boolean;
export interface CheckedInfo {
    checkedKeys: TreeKey[];
    checkedNodes: TreeData;
    halfCheckedKeys: TreeKey[];
    halfCheckedNodes: TreeData;
}
