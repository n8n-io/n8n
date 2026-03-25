var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WeaviateDeserializationError } from '../../errors.js';
import ClassUpdater from '../../schema/classUpdater.js';
import { ClassGetter, PropertyCreator, ShardUpdater } from '../../schema/index.js';
import ShardsGetter from '../../schema/shardsGetter.js';
import VectorAdder from '../../schema/vectorAdder.js';
import { MergeWithExisting } from './classes.js';
import { classToCollection, makeVectorsConfig, resolveProperty, resolveReference } from './utils.js';
const config = (connection, name, dbVersionSupport, tenant) => {
    const getRaw = new ClassGetter(connection).withClassName(name).do;
    return {
        addProperty: (property) => new PropertyCreator(connection)
            .withClassName(name)
            .withProperty(resolveProperty(property, []))
            .do()
            .then(() => { }),
        addReference: (reference) => new PropertyCreator(connection)
            .withClassName(name)
            .withProperty(resolveReference(reference))
            .do()
            .then(() => { }),
        addVector: (vectors) => {
            const { vectorsConfig } = makeVectorsConfig(vectors);
            return new VectorAdder(connection).withClassName(name).withVectors(vectorsConfig).do();
        },
        get: () => getRaw().then((classToCollection)),
        getShards: () => {
            let builder = new ShardsGetter(connection).withClassName(name);
            if (tenant) {
                builder = builder.withTenant(tenant);
            }
            return builder.do().then((shards) => shards.map((shard) => {
                if (shard.name === undefined)
                    throw new WeaviateDeserializationError('Shard name was not returned by Weaviate');
                if (shard.status === undefined)
                    throw new WeaviateDeserializationError('Shard status was not returned by Weaviate');
                if (shard.vectorQueueSize === undefined)
                    throw new WeaviateDeserializationError('Shard vector queue size was not returned by Weaviate');
                return { name: shard.name, status: shard.status, vectorQueueSize: shard.vectorQueueSize };
            }));
        },
        updateShards: function (status, names) {
            return __awaiter(this, void 0, void 0, function* () {
                let shardNames;
                if (names === undefined) {
                    shardNames = yield this.getShards().then((shards) => shards.map((s) => s.name));
                }
                else if (typeof names === 'string') {
                    shardNames = [names];
                }
                else {
                    shardNames = names;
                }
                return Promise.all(shardNames.map((shardName) => new ShardUpdater(connection).withClassName(name).withShardName(shardName).withStatus(status).do())).then(() => this.getShards());
            });
        },
        update: (config) => {
            return getRaw()
                .then((current) => MergeWithExisting.schema(current, config))
                .then((merged) => new ClassUpdater(connection).withClass(merged).do())
                .then(() => { });
        },
    };
};
export default config;
export class VectorIndex {
    static isHNSW(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'hnsw';
    }
    static isFlat(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'flat';
    }
    static isDynamic(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'dynamic';
    }
}
export class Quantizer {
    static isPQ(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'pq';
    }
    static isBQ(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'bq';
    }
    static isSQ(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'sq';
    }
    static isRQ(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'rq';
    }
}
export const configGuards = {
    quantizer: Quantizer,
    vectorIndex: VectorIndex,
};
