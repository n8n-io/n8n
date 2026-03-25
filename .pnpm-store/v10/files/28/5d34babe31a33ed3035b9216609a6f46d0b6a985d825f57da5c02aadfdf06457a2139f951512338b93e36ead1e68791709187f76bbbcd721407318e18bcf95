import Node from './node';
import type { Nullable } from 'element-plus/es/utils';
import type { CascaderConfig, CascaderNodePathValue, CascaderNodeValue, CascaderOption } from './node';
export default class Store {
    readonly config: CascaderConfig;
    readonly nodes: Node[];
    readonly allNodes: Node[];
    readonly leafNodes: Node[];
    constructor(data: CascaderOption[], config: CascaderConfig);
    getNodes(): Node[];
    getFlattedNodes(leafOnly: boolean): Node[];
    appendNode(nodeData: CascaderOption, parentNode?: Node): void;
    appendNodes(nodeDataList: CascaderOption[], parentNode: Node): void;
    getNodeByValue(value: CascaderNodeValue | CascaderNodePathValue, leafOnly?: boolean): Nullable<Node>;
    getSameNode(node: Node): Nullable<Node>;
}
