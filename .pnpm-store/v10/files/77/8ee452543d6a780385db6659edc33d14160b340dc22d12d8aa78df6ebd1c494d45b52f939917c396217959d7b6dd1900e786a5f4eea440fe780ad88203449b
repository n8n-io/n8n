import Connection from '../connection/grpc.js';
import { WeaviateClass } from '../openapi/types.js';
import { DbVersionSupport } from '../utils/dbVersion.js';
import { Collection } from './collection/index.js';
import { CollectionConfig, GenerativeConfig, GenerativeSearch, InvertedIndexConfigCreate, ModuleConfig, MultiTenancyConfigCreate, Properties, PropertyConfigCreate, ReferenceConfigCreate, ReplicationConfigCreate, Reranker, RerankerConfig, ShardingConfigCreate, VectorizersConfigCreate, Vectors } from './types/index.js';
/**
 * All the options available when creating a new collection.
 *
 * Inspect [the docs](https://weaviate.io/developers/weaviate/configuration) for more information on the
 * different configuration options and how they affect the behavior of your collection.
 */
export type CollectionConfigCreate<TProperties = undefined, N = string, TVectors = undefined> = {
    /** The name of the collection. */
    name: N;
    /** The description of the collection. */
    description?: string;
    /** The configuration for Weaviate's generative capabilities. */
    generative?: ModuleConfig<GenerativeSearch, GenerativeConfig>;
    /** The configuration for Weaviate's inverted index. */
    invertedIndex?: InvertedIndexConfigCreate;
    /** The configuration for Weaviate's multi-tenancy capabilities. */
    multiTenancy?: MultiTenancyConfigCreate;
    /** The properties of the objects in the collection. */
    properties?: PropertyConfigCreate<TProperties>[];
    /** The references of the objects in the collection. */
    references?: ReferenceConfigCreate<TProperties>[];
    /** The configuration for Weaviate's replication strategy. Is mutually exclusive with `sharding`. */
    replication?: ReplicationConfigCreate;
    /** The configuration for Weaviate's reranking capabilities. */
    reranker?: ModuleConfig<Reranker, RerankerConfig>;
    /** The configuration for Weaviate's sharding strategy. Is mutually exclusive with `replication`. */
    sharding?: ShardingConfigCreate;
    /** The configuration for Weaviate's vectorizer(s) capabilities. */
    vectorizers?: VectorizersConfigCreate<TProperties, TVectors>;
};
declare const collections: (connection: Connection, dbVersionSupport: DbVersionSupport) => {
    create: <TProperties extends Properties | undefined = undefined, TName = string, TVectors extends Vectors | undefined = undefined>(config: CollectionConfigCreate<TProperties, TName, TVectors>) => Promise<Collection<TProperties, TName, TVectors>>;
    createFromSchema: (config: WeaviateClass) => Promise<Collection<Properties, string, undefined>>;
    delete: (name: string) => Promise<void>;
    deleteAll: () => Promise<void[]>;
    exists: (name: string) => Promise<boolean>;
    export: <TProperties_1>(name: string) => Promise<CollectionConfig>;
    listAll: () => Promise<CollectionConfig[]>;
    get: <TProperties_2 extends Properties | undefined = undefined, TName_1 extends string = string>(name: TName_1) => Collection<TProperties_2, TName_1, undefined>;
    use: <TProperties_3 extends Properties | undefined = undefined, TName_2 extends string = string, TVectors_1 extends Vectors | undefined = undefined>(name: TName_2) => Collection<TProperties_3, TName_2, TVectors_1>;
};
export interface Collections {
    create<TProperties extends Properties | undefined = undefined, TName = string, TVectors extends Vectors | undefined = undefined>(config: CollectionConfigCreate<TProperties, TName, TVectors>): Promise<Collection<TProperties, TName, TVectors>>;
    createFromSchema(config: WeaviateClass): Promise<Collection<Properties, string>>;
    delete(collection: string): Promise<void>;
    deleteAll(): Promise<void[]>;
    exists(name: string): Promise<boolean>;
    export(name: string): Promise<CollectionConfig>;
    get<TProperties extends Properties | undefined = undefined, TName extends string = string>(name: TName): Collection<TProperties, TName>;
    listAll(): Promise<CollectionConfig[]>;
    use<TName extends string = string, TProperties extends Properties | undefined = undefined, TVectors extends Vectors | undefined = undefined>(name: TName): Collection<TProperties, TName, TVectors>;
}
export default collections;
export * from './aggregate/index.js';
export * from './backup/index.js';
export * from './cluster/index.js';
export * from './collection/index.js';
export * from './config/index.js';
export * from './configure/index.js';
export * from './data/index.js';
export * from './filters/index.js';
export * from './generate/index.js';
export * from './iterator/index.js';
export * from './query/index.js';
export * from './references/index.js';
export * from './sort/index.js';
export * from './tenants/index.js';
export * from './types/index.js';
export * from './vectors/multiTargetVector.js';
