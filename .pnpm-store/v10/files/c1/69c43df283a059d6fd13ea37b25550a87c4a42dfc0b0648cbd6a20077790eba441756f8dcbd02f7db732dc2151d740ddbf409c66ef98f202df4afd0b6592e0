import { Attribute } from '@ts-graphviz/common';
import { AttributeKey } from '@ts-graphviz/common';
import { Attributes } from '@ts-graphviz/common';
import { AttributesEntities } from '@ts-graphviz/common';
import { AttributesObject } from '@ts-graphviz/common';
import { EdgeAttributesObject } from '@ts-graphviz/common';
import { EdgeModel } from '@ts-graphviz/common';
import { EdgeTargetLikeTuple } from '@ts-graphviz/common';
import { GraphBaseModel } from '@ts-graphviz/common';
import { GraphCommonAttributes } from '@ts-graphviz/common';
import { ModelsContext } from '@ts-graphviz/common';
import { NodeAttributesObject } from '@ts-graphviz/common';
import { NodeModel } from '@ts-graphviz/common';
import { SubgraphAttributesObject } from '@ts-graphviz/common';
import { SubgraphModel } from '@ts-graphviz/common';

/**
 * Base class for DOT objects with attributes.
 * @group Models
 */
declare abstract class AttributesBase<T extends AttributeKey> extends DotObject implements Attributes<T> {
    #private;
    constructor(attributes?: AttributesObject<T>);
    get values(): ReadonlyArray<[T, Attribute<T>]>;
    get size(): number;
    get<K extends T>(key: K): Attribute<K> | undefined;
    set<K extends T>(key: K, value: Attribute<K>): void;
    delete(key: T): void;
    apply(attributes: AttributesObject<T> | AttributesEntities<T>): void;
    clear(): void;
}

/**
 * Base class for DOT objects.
 * @group Models
 */
declare abstract class DotObject {
}

/**
 * Base class for Graph objects.
 * @group Models
 */
export declare abstract class GraphBase<T extends AttributeKey> extends AttributesBase<T> implements GraphBaseModel<T> {
    #private;
    readonly id?: string;
    comment?: string;
    readonly attributes: Readonly<GraphCommonAttributes>;
    get nodes(): ReadonlyArray<NodeModel>;
    get edges(): ReadonlyArray<EdgeModel>;
    get subgraphs(): ReadonlyArray<SubgraphModel>;
    with(models: Partial<ModelsContext>): void;
    addNode(node: NodeModel): void;
    addEdge(edge: EdgeModel): void;
    addSubgraph(subgraph: SubgraphModel): void;
    existNode(nodeId: string): boolean;
    existEdge(edge: EdgeModel): boolean;
    existSubgraph(subgraph: SubgraphModel): boolean;
    createSubgraph(id?: string, attributes?: SubgraphAttributesObject): SubgraphModel;
    createSubgraph(attributes?: SubgraphAttributesObject): SubgraphModel;
    removeNode(node: NodeModel | string): void;
    removeEdge(edge: EdgeModel): void;
    removeSubgraph(subgraph: SubgraphModel): void;
    createNode(id: string, attributes?: NodeAttributesObject): NodeModel;
    getSubgraph(id: string): SubgraphModel | undefined;
    getNode(id: string): NodeModel | undefined;
    createEdge(targets: EdgeTargetLikeTuple, attributes?: EdgeAttributesObject): EdgeModel;
    subgraph(id: string, callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    subgraph(id: string, attributes: SubgraphAttributesObject, callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    subgraph(attributes: SubgraphAttributesObject, callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    subgraph(callback?: (subgraph: SubgraphModel) => void): SubgraphModel;
    node(id: string, callback?: (node: NodeModel) => void): NodeModel;
    node(id: string, attributes: NodeAttributesObject, callback?: (node: NodeModel) => void): NodeModel;
    node(attributes: NodeAttributesObject): void;
    edge(targets: EdgeTargetLikeTuple, callback?: (edge: EdgeModel) => void): EdgeModel;
    edge(targets: EdgeTargetLikeTuple, attributes: EdgeAttributesObject, callback?: (edge: EdgeModel) => void): EdgeModel;
    edge(attributes: EdgeAttributesObject): void;
    graph(attributes: SubgraphAttributesObject): void;
}

export { }
