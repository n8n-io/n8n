import { ConvertToModelOptions, ParseOptions } from '@ts-graphviz/ast';
import { EdgeModel, NodeModel, RootGraphModel, SubgraphModel } from '@ts-graphviz/common';
export interface FromDotOptions<T extends 'Dot' | 'Graph' | 'Node' | 'Edge' | 'Subgraph'> {
    parse?: ParseOptions<T>;
    convert?: ConvertToModelOptions;
}
export declare function fromDot(dot: string, options?: FromDotOptions<'Dot' | 'Graph'>): RootGraphModel;
export declare function fromDot(dot: string, options?: FromDotOptions<'Node'>): NodeModel;
export declare function fromDot(dot: string, options?: FromDotOptions<'Edge'>): EdgeModel;
export declare function fromDot(dot: string, options?: FromDotOptions<'Subgraph'>): SubgraphModel;
