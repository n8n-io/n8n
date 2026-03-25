import type { CheckboxValueType } from 'element-plus/es/components/checkbox';
import type { Ref } from 'vue';
import type { Tree, TreeKey, TreeNode, TreeNodeData, TreeProps } from '../types';
export declare function useCheck(props: TreeProps, tree: Ref<Tree | undefined>): {
    updateCheckedKeys: () => void;
    toggleCheckbox: (node: TreeNode, isChecked: CheckboxValueType, nodeClick?: boolean) => void;
    isChecked: (node: TreeNode) => boolean;
    isIndeterminate: (node: TreeNode) => boolean;
    getCheckedKeys: (leafOnly?: boolean) => TreeKey[];
    getCheckedNodes: (leafOnly?: boolean) => TreeNodeData[];
    getHalfCheckedKeys: () => TreeKey[];
    getHalfCheckedNodes: () => TreeNodeData[];
    setChecked: (key: TreeKey, isChecked: boolean) => void;
    setCheckedKeys: (keys: TreeKey[]) => void;
};
