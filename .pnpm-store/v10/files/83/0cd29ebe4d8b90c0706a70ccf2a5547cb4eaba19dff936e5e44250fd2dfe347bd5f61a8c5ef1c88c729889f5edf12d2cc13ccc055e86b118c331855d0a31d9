import type { VNode } from 'vue';
export declare type CascaderNodeValue = string | number;
export declare type CascaderNodePathValue = CascaderNodeValue[];
export declare type CascaderValue = CascaderNodeValue | CascaderNodePathValue | (CascaderNodeValue | CascaderNodePathValue)[];
export declare type CascaderConfig = Required<CascaderProps>;
export declare type ExpandTrigger = 'click' | 'hover';
export declare type isDisabled = (data: CascaderOption, node: Node) => boolean;
export declare type isLeaf = (data: CascaderOption, node: Node) => boolean;
export declare type Resolve = (dataList?: CascaderOption[]) => void;
export declare type LazyLoad = (node: Node, resolve: Resolve) => void;
export declare type RenderLabel = ({ node: Node, data: CascaderOption, }: {
    node: any;
    data: any;
}) => VNode | VNode[];
export interface CascaderOption extends Record<string, unknown> {
    label?: string;
    value?: CascaderNodeValue;
    children?: CascaderOption[];
    disabled?: boolean;
    leaf?: boolean;
}
export interface CascaderProps {
    expandTrigger?: ExpandTrigger;
    multiple?: boolean;
    checkStrictly?: boolean;
    emitPath?: boolean;
    lazy?: boolean;
    lazyLoad?: LazyLoad;
    value?: string;
    label?: string;
    children?: string;
    disabled?: string | isDisabled;
    leaf?: string | isLeaf;
    hoverThreshold?: number;
}
export declare type Nullable<T> = null | T;
declare type ChildrenData = CascaderOption[] | undefined;
declare class Node {
    readonly data: Nullable<CascaderOption>;
    readonly config: CascaderConfig;
    readonly parent?: Node | undefined;
    readonly root: boolean;
    readonly uid: number;
    readonly level: number;
    readonly value: CascaderNodeValue;
    readonly label: string;
    readonly pathNodes: Node[];
    readonly pathValues: CascaderNodePathValue;
    readonly pathLabels: string[];
    childrenData: ChildrenData;
    children: Node[];
    text: string;
    loaded: boolean;
    /**
     * Is it checked
     *
     * @default false
     */
    checked: boolean;
    /**
     * Used to indicate the intermediate state of unchecked and fully checked child nodes
     *
     * @default false
     */
    indeterminate: boolean;
    /**
     * Loading Status
     *
     * @default false
     */
    loading: boolean;
    constructor(data: Nullable<CascaderOption>, config: CascaderConfig, parent?: Node | undefined, root?: boolean);
    get isDisabled(): boolean;
    get isLeaf(): boolean;
    get valueByOption(): CascaderNodeValue | CascaderNodePathValue;
    appendChild(childData: CascaderOption): Node;
    calcText(allLevels: boolean, separator: string): string;
    broadcast(event: string, ...args: unknown[]): void;
    emit(event: string, ...args: unknown[]): void;
    onParentCheck(checked: boolean): void;
    onChildCheck(): void;
    setCheckState(checked: boolean): void;
    doCheck(checked: boolean): void;
}
export default Node;
