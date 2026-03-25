import { WeaviateClass, WeaviateProperty } from '../../openapi/types.js';
import { PropertyConfigCreate, ReferenceConfigCreate, ReferenceMultiTargetConfigCreate, ReferenceSingleTargetConfigCreate, VectorIndexConfigCreate, VectorizersConfigAdd, VectorizersConfigCreate } from '../configure/types/index.js';
import { CollectionConfig, ModuleConfig, VectorIndexType, VectorizerConfig } from './types/index.js';
export declare class ReferenceTypeGuards {
    static isSingleTarget<T>(ref: ReferenceConfigCreate<T>): ref is ReferenceSingleTargetConfigCreate<T>;
    static isMultiTarget<T>(ref: ReferenceConfigCreate<T>): ref is ReferenceMultiTargetConfigCreate<T>;
}
export declare const resolveProperty: <T>(prop: PropertyConfigCreate<T>, vectorizers?: string[]) => WeaviateProperty;
export declare const resolveReference: <T>(ref: ReferenceSingleTargetConfigCreate<T> | ReferenceMultiTargetConfigCreate<T>) => WeaviateProperty;
export declare const classToCollection: <T>(cls: WeaviateClass) => CollectionConfig;
export declare const parseVectorIndex: (module: ModuleConfig<VectorIndexType, VectorIndexConfigCreate>) => any;
export declare const parseVectorizerConfig: (config?: VectorizerConfig) => any;
export declare const makeVectorsConfig: (configVectorizers: VectorizersConfigCreate<any, any> | VectorizersConfigAdd<any>) => {
    vectorsConfig: Record<string, any>;
    vectorizers: string[];
};
