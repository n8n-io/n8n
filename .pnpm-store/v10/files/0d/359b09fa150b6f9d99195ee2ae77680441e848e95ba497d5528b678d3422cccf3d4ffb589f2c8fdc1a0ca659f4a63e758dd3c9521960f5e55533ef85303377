import { GraphAttributesObject, RootGraphModel } from '@ts-graphviz/common';
export interface ModelFactory {
    (id?: string, attributes?: GraphAttributesObject, callback?: (g: RootGraphModel) => void): RootGraphModel;
    (attributes?: GraphAttributesObject, callback?: (g: RootGraphModel) => void): RootGraphModel;
    (id?: string, callback?: (g: RootGraphModel) => void): RootGraphModel;
    (callback?: (g: RootGraphModel) => void): RootGraphModel;
}
export interface ModelFactories {
    digraph: ModelFactory;
    graph: ModelFactory;
}
export interface ModelFactoriesWithStrict extends ModelFactories {
    strict: ModelFactories;
}
