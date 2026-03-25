import type { CheckboxValueType } from 'element-plus/es/components/checkbox';
import type { InjectionKey } from 'vue';
import type { TreeNodeData } from 'element-plus/es/components/tree/src/tree.type';
import type { CheckedInfo, FilterMethod, TreeContext, TreeData, TreeKey, TreeNode, TreeOptionProps } from './types';
export declare const ROOT_TREE_INJECTION_KEY: InjectionKey<TreeContext>;
export declare enum TreeOptionsEnum {
    KEY = "id",
    LABEL = "label",
    CHILDREN = "children",
    DISABLED = "disabled"
}
export declare const enum SetOperationEnum {
    ADD = "add",
    DELETE = "delete"
}
export declare const treeProps: {
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TreeData) | (() => TreeData) | ((new (...args: any[]) => TreeData) | (() => TreeData))[], unknown, unknown, () => [], boolean>;
    readonly emptyText: {
        readonly type: import("vue").PropType<string>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly height: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
    readonly props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TreeOptionProps) | (() => TreeOptionProps) | ((new (...args: any[]) => TreeOptionProps) | (() => TreeOptionProps))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{
        readonly children: TreeOptionsEnum.CHILDREN;
        readonly label: TreeOptionsEnum.LABEL;
        readonly disabled: TreeOptionsEnum.DISABLED;
        readonly value: TreeOptionsEnum.KEY;
    }>, boolean>;
    readonly highlightCurrent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly showCheckbox: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly defaultCheckedKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TreeKey[]) | (() => TreeKey[]) | ((new (...args: any[]) => TreeKey[]) | (() => TreeKey[]))[], unknown, unknown, () => [], boolean>;
    readonly checkStrictly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly defaultExpandedKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TreeKey[]) | (() => TreeKey[]) | ((new (...args: any[]) => TreeKey[]) | (() => TreeKey[]))[], unknown, unknown, () => [], boolean>;
    readonly indent: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 16, boolean>;
    readonly itemSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
    readonly icon: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly expandOnClickNode: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly checkOnClickNode: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly currentNodeKey: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => TreeKey & {}) | (() => TreeKey) | ((new (...args: any[]) => TreeKey & {}) | (() => TreeKey))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly accordion: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly filterMethod: {
        readonly type: import("vue").PropType<FilterMethod>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly perfMode: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
};
export declare const treeNodeProps: {
    readonly node: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TreeNode) | (() => TreeNode) | ((new (...args: any[]) => TreeNode) | (() => TreeNode))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{
        readonly key: -1;
        readonly level: -1;
        readonly data: {};
    }>, boolean>;
    readonly expanded: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly checked: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly indeterminate: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly showCheckbox: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly disabled: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly current: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly hiddenExpandIcon: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly itemSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
};
export declare const treeNodeContentProps: {
    readonly node: {
        readonly type: import("vue").PropType<TreeNode>;
        readonly required: true;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
};
export declare const NODE_CLICK = "node-click";
export declare const NODE_EXPAND = "node-expand";
export declare const NODE_COLLAPSE = "node-collapse";
export declare const CURRENT_CHANGE = "current-change";
export declare const NODE_CHECK = "check";
export declare const NODE_CHECK_CHANGE = "check-change";
export declare const NODE_CONTEXTMENU = "node-contextmenu";
export declare const treeEmits: {
    "node-click": (data: TreeNodeData, node: TreeNode, e: MouseEvent) => MouseEvent;
    "node-expand": (data: TreeNodeData, node: TreeNode) => TreeNode;
    "node-collapse": (data: TreeNodeData, node: TreeNode) => TreeNode;
    "current-change": (data: TreeNodeData, node: TreeNode) => TreeNode;
    check: (data: TreeNodeData, checkedInfo: CheckedInfo) => CheckedInfo;
    "check-change": (data: TreeNodeData, checked: boolean) => boolean;
    "node-contextmenu": (event: Event, data: TreeNodeData, node: TreeNode) => TreeNode;
};
export declare const treeNodeEmits: {
    click: (node: TreeNode, e: MouseEvent) => boolean;
    toggle: (node: TreeNode) => boolean;
    check: (node: TreeNode, checked: CheckboxValueType) => boolean;
};
