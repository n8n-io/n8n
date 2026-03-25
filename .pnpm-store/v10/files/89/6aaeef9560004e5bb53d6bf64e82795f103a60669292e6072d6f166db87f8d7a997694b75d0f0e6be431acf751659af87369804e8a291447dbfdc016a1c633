import type { InjectionKey, VNode } from 'vue';
import type { Nullable } from 'element-plus/es/utils';
import type { default as CascaderNode, CascaderOption, CascaderProps, ExpandTrigger } from './node';
export type { CascaderNode, CascaderOption, CascaderProps, ExpandTrigger };
export declare type CascaderNodeValue = string | number;
export declare type CascaderNodePathValue = CascaderNodeValue[];
export declare type CascaderValue = CascaderNodeValue | CascaderNodePathValue | (CascaderNodeValue | CascaderNodePathValue)[];
export declare type CascaderConfig = Required<CascaderProps>;
export declare type isDisabled = (data: CascaderOption, node: CascaderNode) => boolean;
export declare type isLeaf = (data: CascaderOption, node: CascaderNode) => boolean;
export declare type Resolve = (dataList?: CascaderOption[]) => void;
export declare type LazyLoad = (node: CascaderNode, resolve: Resolve) => void;
export declare type RenderLabel = ({ node: CascaderNode, data: CascaderOption, }: {
    node: any;
    data: any;
}) => VNode | VNode[];
export interface Tag {
    node?: CascaderNode;
    key: number;
    text: string;
    hitState?: boolean;
    closable: boolean;
    isCollapseTag: boolean;
}
export interface ElCascaderPanelContext {
    config: CascaderConfig;
    expandingNode: Nullable<CascaderNode>;
    checkedNodes: CascaderNode[];
    isHoverMenu: boolean;
    initialLoaded: boolean;
    renderLabelFn: RenderLabel;
    lazyLoad: (node?: CascaderNode, cb?: (dataList: CascaderOption[]) => void) => void;
    expandNode: (node: CascaderNode, silent?: boolean) => void;
    handleCheckChange: (node: CascaderNode, checked: boolean, emitClose?: boolean) => void;
}
export declare const CASCADER_PANEL_INJECTION_KEY: InjectionKey<ElCascaderPanelContext>;
