import Connection from '../../connection/index.js';
import { WeaviateShardStatus } from '../../openapi/types.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { PropertyConfigCreate, ReferenceMultiTargetConfigCreate, ReferenceSingleTargetConfigCreate, VectorizersConfigAdd } from '../configure/types/index.js';
import { BQConfig, CollectionConfig, CollectionConfigUpdate, PQConfig, QuantizerConfig, RQConfig, SQConfig, VectorIndexConfig, VectorIndexConfigDynamic, VectorIndexConfigFlat, VectorIndexConfigHNSW } from './types/index.js';
declare const config: <T>(connection: Connection, name: string, dbVersionSupport: DbVersionSupport, tenant?: string) => Config<T>;
export default config;
export interface Config<T> {
    /**
     * Add a property to the collection in Weaviate.
     *
     * @param {PropertyConfigCreate<any>} property The property configuration.
     * @returns {Promise<void>} A promise that resolves when the property has been added.
     */
    addProperty: (property: PropertyConfigCreate<any>) => Promise<void>;
    /**
     * Add a reference to the collection in Weaviate.
     *
     * @param {ReferenceSingleTargetConfigCreate<any> | ReferenceMultiTargetConfigCreate<any>} reference The reference configuration.
     * @returns {Promise<void>} A promise that resolves when the reference has been added.
     */
    addReference: (reference: ReferenceSingleTargetConfigCreate<T> | ReferenceMultiTargetConfigCreate<T>) => Promise<void>;
    /**
     * Add one or more named vectors to the collection in Weaviate.
     * Named vectors can be added to collections with existing named vectors only.
     *
     * Existing named vectors are immutable in Weaviate. The client will not include
     * any of those in the request.
     *
     * @param {VectorizersConfigAdd<any>} vectors Vector configurations.
     * @returns {Promise<void>} A promise that resolves when the named vector has been created.
     */
    addVector: (vectors: VectorizersConfigAdd<T>) => Promise<void>;
    /**
     * Get the configuration for this collection from Weaviate.
     *
     * @returns {Promise<CollectionConfig<T>>} A promise that resolves with the collection configuration.
     */
    get: () => Promise<CollectionConfig>;
    /**
     * Get the statuses of the shards of this collection.
     *
     * If the collection is multi-tenancy and you did not call `.with_tenant` then you
     * will receive the statuses of all the tenants within the collection. Otherwise, call
     * `.with_tenant` on the collection first and you will receive only that single shard.
     *
     * @returns {Promise<Required<WeaviateShardStatus>[]>} A promise that resolves with the shard statuses.
     */
    getShards: () => Promise<Required<WeaviateShardStatus>[]>;
    /**
     * Update the status of one or all shards of this collection.
     *
     * @param {'READY' | 'READONLY'} status The new status of the shard(s).
     * @param {string | string[]} [names] The name(s) of the shard(s) to update. If not provided, all shards will be updated.
     * @returns {Promise<Required<WeaviateShardStatus>[]>} A promise that resolves with the updated shard statuses.
     */
    updateShards: (status: 'READY' | 'READONLY', names?: string | string[]) => Promise<Required<WeaviateShardStatus>[]>;
    /**
     * Update the configuration for this collection in Weaviate.
     *
     * Use the `weaviate.classes.Reconfigure` class to generate the necessary configuration objects for this method.
     *
     * @param {CollectionConfigUpdate<T>} [config] The configuration to update. Only a subset of the actual collection configuration can be updated.
     * @returns {Promise<void>} A promise that resolves when the collection has been updated.
     */
    update: (config?: CollectionConfigUpdate<T>) => Promise<void>;
}
export declare class VectorIndex {
    static isHNSW(config?: VectorIndexConfig): config is VectorIndexConfigHNSW;
    static isFlat(config?: VectorIndexConfig): config is VectorIndexConfigFlat;
    static isDynamic(config?: VectorIndexConfig): config is VectorIndexConfigDynamic;
}
export declare class Quantizer {
    static isPQ(config?: QuantizerConfig): config is PQConfig;
    static isBQ(config?: QuantizerConfig): config is BQConfig;
    static isSQ(config?: QuantizerConfig): config is SQConfig;
    static isRQ(config?: QuantizerConfig): config is RQConfig;
}
export declare const configGuards: {
    quantizer: typeof Quantizer;
    vectorIndex: typeof VectorIndex;
};
