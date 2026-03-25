var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { WeaviateDeserializationError, WeaviateInvalidInputError } from '../../errors.js';
import { MultiVectorEncodingGuards, QuantizerGuards, VectorIndexGuards } from '../configure/parsing.js';
export class ReferenceTypeGuards {
    static isSingleTarget(ref) {
        return ref.targetCollection !== undefined;
    }
    static isMultiTarget(ref) {
        return ref.targetCollections !== undefined;
    }
}
export const resolveProperty = (prop, vectorizers) => {
    const { dataType, nestedProperties, skipVectorization, vectorizePropertyName } = prop, rest = __rest(prop, ["dataType", "nestedProperties", "skipVectorization", "vectorizePropertyName"]);
    const moduleConfig = {};
    vectorizers === null || vectorizers === void 0 ? void 0 : vectorizers.forEach((vectorizer) => {
        moduleConfig[vectorizer] = {
            skip: skipVectorization === undefined ? false : skipVectorization,
            vectorizePropertyName: vectorizePropertyName === undefined ? true : vectorizePropertyName,
        };
    });
    return Object.assign(Object.assign({}, rest), { dataType: [dataType], nestedProperties: nestedProperties
            ? nestedProperties.map((prop) => resolveNestedProperty(prop))
            : undefined, moduleConfig: Object.keys(moduleConfig).length > 0 ? moduleConfig : undefined });
};
const resolveNestedProperty = (prop) => {
    const { dataType, nestedProperties } = prop, rest = __rest(prop, ["dataType", "nestedProperties"]);
    return Object.assign(Object.assign({}, rest), { dataType: [dataType], nestedProperties: nestedProperties ? nestedProperties.map(resolveNestedProperty) : undefined });
};
export const resolveReference = (ref) => {
    if (ReferenceTypeGuards.isSingleTarget(ref)) {
        const { targetCollection } = ref, rest = __rest(ref, ["targetCollection"]);
        return Object.assign(Object.assign({}, rest), { dataType: [targetCollection] });
    }
    else {
        const { targetCollections } = ref, rest = __rest(ref, ["targetCollections"]);
        return Object.assign(Object.assign({}, rest), { dataType: targetCollections });
    }
};
export const classToCollection = (cls) => {
    return {
        name: ConfigMapping._name(cls.class),
        description: cls.description,
        generative: ConfigMapping.generative(cls.moduleConfig),
        invertedIndex: ConfigMapping.invertedIndex(cls.invertedIndexConfig),
        multiTenancy: ConfigMapping.multiTenancy(cls.multiTenancyConfig),
        properties: ConfigMapping.properties(cls.properties),
        references: ConfigMapping.references(cls.properties),
        replication: ConfigMapping.replication(cls.replicationConfig),
        reranker: ConfigMapping.reranker(cls.moduleConfig),
        sharding: ConfigMapping.sharding(cls.shardingConfig),
        vectorizers: ConfigMapping.vectorizer(cls),
    };
};
export const parseVectorIndex = (module) => {
    if (module.config === undefined)
        return undefined;
    if (VectorIndexGuards.isDynamic(module.config)) {
        const _a = module.config, { hnsw, flat } = _a, conf = __rest(_a, ["hnsw", "flat"]);
        return Object.assign(Object.assign({}, conf), { hnsw: parseVectorIndex({ name: 'hnsw', config: hnsw }), flat: parseVectorIndex({ name: 'flat', config: flat }) });
    }
    let multivector;
    if (VectorIndexGuards.isHNSW(module.config) && module.config.multiVector !== undefined) {
        multivector = {
            aggregation: module.config.multiVector.aggregation,
            enabled: true,
        };
        if (module.config.multiVector.encoding !== undefined &&
            MultiVectorEncodingGuards.isMuvera(module.config.multiVector.encoding)) {
            multivector.muvera = {
                enabled: true,
                ksim: module.config.multiVector.encoding.ksim,
                dprojections: module.config.multiVector.encoding.dprojections,
                repetitions: module.config.multiVector.encoding.repetitions,
            };
        }
    }
    const _b = module.config, { quantizer } = _b, rest = __rest(_b, ["quantizer"]);
    const conf = Object.assign(Object.assign({}, rest), { multivector });
    if (quantizer === undefined)
        return conf;
    if (QuantizerGuards.isBQCreate(quantizer)) {
        const { type } = quantizer, quant = __rest(quantizer, ["type"]);
        return Object.assign(Object.assign({}, conf), { bq: Object.assign(Object.assign({}, quant), { enabled: true }) });
    }
    if (QuantizerGuards.isPQCreate(quantizer)) {
        const { type } = quantizer, quant = __rest(quantizer, ["type"]);
        return Object.assign(Object.assign({}, conf), { pq: Object.assign(Object.assign({}, quant), { enabled: true }) });
    }
    if (QuantizerGuards.isSQCreate(quantizer)) {
        const { type } = quantizer, quant = __rest(quantizer, ["type"]);
        return Object.assign(Object.assign({}, conf), { sq: Object.assign(Object.assign({}, quant), { enabled: true }) });
    }
    if (QuantizerGuards.isRQCreate(quantizer)) {
        const { type } = quantizer, quant = __rest(quantizer, ["type"]);
        return Object.assign(Object.assign({}, conf), { rq: Object.assign(Object.assign({}, quant), { enabled: true }) });
    }
    if (QuantizerGuards.isUncompressedCreate(quantizer)) {
        return Object.assign(Object.assign({}, conf), { skipDefaultQuantization: true });
    }
};
export const parseVectorizerConfig = (config) => {
    if (config === undefined)
        return {};
    const _a = config, { vectorizeCollectionName } = _a, rest = __rest(_a, ["vectorizeCollectionName"]);
    return Object.assign(Object.assign({}, rest), { vectorizeClassName: vectorizeCollectionName });
};
export const makeVectorsConfig = (configVectorizers) => {
    let vectorizers = [];
    const vectorsConfig = {};
    const vectorizersConfig = Array.isArray(configVectorizers)
        ? configVectorizers
        : [
            Object.assign(Object.assign({}, configVectorizers), { name: configVectorizers.name || 'default' }),
        ];
    vectorizersConfig.forEach((v) => {
        const vectorConfig = {
            vectorIndexConfig: parseVectorIndex(v.vectorIndex),
            vectorIndexType: v.vectorIndex.name,
            vectorizer: {},
        };
        const vectorizer = v.vectorizer.name === 'text2vec-azure-openai' ? 'text2vec-openai' : v.vectorizer.name;
        vectorizers = [...vectorizers, vectorizer];
        vectorConfig.vectorizer[vectorizer] = Object.assign({ properties: v.properties }, parseVectorizerConfig(v.vectorizer.config));
        if (v.name === undefined) {
            throw new WeaviateInvalidInputError('vectorName is required for each vectorizer when specifying more than one vectorizer');
        }
        vectorsConfig[v.name] = vectorConfig;
    });
    return { vectorsConfig, vectorizers };
};
function populated(v) {
    return v !== undefined && v !== null;
}
function exists(v) {
    return v !== undefined && v !== null;
}
class ConfigMapping {
    static _name(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Collection name was not returned by Weaviate');
        return v;
    }
    static bm25(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('BM25 was not returned by Weaviate');
        if (!populated(v.b))
            throw new WeaviateDeserializationError('BM25 b was not returned by Weaviate');
        if (!populated(v.k1))
            throw new WeaviateDeserializationError('BM25 k1 was not returned by Weaviate');
        return {
            b: v.b,
            k1: v.k1,
        };
    }
    static stopwords(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Stopwords were not returned by Weaviate');
        return {
            additions: v.additions ? v.additions : [],
            preset: v.preset ? v.preset : 'none',
            removals: v.removals ? v.removals : [],
        };
    }
    static generative(v) {
        if (!populated(v))
            return undefined;
        const generativeKey = Object.keys(v).find((k) => k.includes('generative'));
        if (generativeKey === undefined)
            return undefined;
        if (!generativeKey)
            throw new WeaviateDeserializationError('Generative config was not returned by Weaviate');
        return {
            name: generativeKey,
            config: v[generativeKey],
        };
    }
    static reranker(v) {
        if (!populated(v))
            return undefined;
        const rerankerKey = Object.keys(v).find((k) => k.includes('reranker'));
        if (rerankerKey === undefined)
            return undefined;
        return {
            name: rerankerKey,
            config: v[rerankerKey],
        };
    }
    static namedVectors(v) {
        if (!populated(v))
            throw new WeaviateDeserializationError('Vector config was not returned by Weaviate');
        const out = {};
        Object.keys(v).forEach((key) => {
            const vectorizer = v[key].vectorizer;
            if (!populated(vectorizer))
                throw new WeaviateDeserializationError(`Vectorizer was not returned by Weaviate for ${key} named vector`);
            const vectorizerNames = Object.keys(vectorizer);
            if (vectorizerNames.length !== 1)
                throw new WeaviateDeserializationError(`Expected exactly one vectorizer for ${key} named vector, got ${vectorizerNames.length}`);
            const vectorizerName = vectorizerNames[0];
            const _a = vectorizer[vectorizerName] || {}, { properties } = _a, restA = __rest(_a, ["properties"]);
            const _b = restA || {}, { vectorizeClassName } = _b, restB = __rest(_b, ["vectorizeClassName"]);
            out[key] = {
                vectorizer: {
                    name: vectorizerName,
                    config: Object.assign({ vectorizeCollectionName: vectorizeClassName }, restB),
                },
                properties: properties,
                indexConfig: ConfigMapping.vectorIndex(v[key].vectorIndexConfig, v[key].vectorIndexType),
                indexType: ConfigMapping.vectorIndexType(v[key].vectorIndexType),
            };
        });
        return out;
    }
    static vectorizer(v) {
        if (!populated(v))
            throw new WeaviateDeserializationError('Schema was not returned by Weaviate');
        if (populated(v.vectorConfig)) {
            return ConfigMapping.namedVectors(v.vectorConfig);
        }
        if (!populated(v.vectorizer))
            throw new WeaviateDeserializationError('Vectorizer was not returned by Weaviate');
        return {
            default: {
                vectorizer: v.vectorizer === 'none'
                    ? {
                        name: 'none',
                        config: undefined,
                    }
                    : {
                        name: v.vectorizer,
                        config: v.moduleConfig
                            ? Object.assign(Object.assign({}, v.moduleConfig[v.vectorizer]), { vectorizeCollectionName: v.moduleConfig[v.vectorizer].vectorizeClassName })
                            : undefined,
                    },
                indexConfig: ConfigMapping.vectorIndex(v.vectorIndexConfig, v.vectorIndexType),
                indexType: ConfigMapping.vectorIndexType(v.vectorIndexType),
            },
        };
    }
    static invertedIndex(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Inverted index was not returned by Weaviate');
        if (!populated(v.cleanupIntervalSeconds))
            throw new WeaviateDeserializationError('Inverted index cleanup interval was not returned by Weaviate');
        return {
            bm25: ConfigMapping.bm25(v.bm25),
            cleanupIntervalSeconds: v.cleanupIntervalSeconds,
            stopwords: ConfigMapping.stopwords(v.stopwords),
            indexNullState: v.indexNullState ? v.indexNullState : false,
            indexPropertyLength: v.indexPropertyLength ? v.indexPropertyLength : false,
            indexTimestamps: v.indexTimestamps ? v.indexTimestamps : false,
        };
    }
    static multiTenancy(v) {
        if (v === undefined) {
            return {
                autoTenantActivation: false,
                autoTenantCreation: false,
                enabled: false,
            };
        }
        return {
            autoTenantActivation: v.autoTenantActivation ? v.autoTenantActivation : false,
            autoTenantCreation: v.autoTenantCreation ? v.autoTenantCreation : false,
            enabled: v.enabled ? v.enabled : false,
        };
    }
    static replication(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Replication was not returned by Weaviate');
        if (!populated(v.factor))
            throw new WeaviateDeserializationError('Replication factor was not returned by Weaviate');
        return {
            factor: v.factor,
            asyncEnabled: v.asyncEnabled ? v.asyncEnabled : false,
            deletionStrategy: v.deletionStrategy ? v.deletionStrategy : 'NoAutomatedResolution',
        };
    }
    static sharding(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Sharding was not returned by Weaviate');
        if (!exists(v.virtualPerPhysical))
            throw new WeaviateDeserializationError('Sharding enabled was not returned by Weaviate');
        if (!exists(v.desiredCount))
            throw new WeaviateDeserializationError('Sharding desired count was not returned by Weaviate');
        if (!exists(v.actualCount))
            throw new WeaviateDeserializationError('Sharding actual count was not returned by Weaviate');
        if (!exists(v.desiredVirtualCount))
            throw new WeaviateDeserializationError('Sharding desired virtual count was not returned by Weaviate');
        if (!exists(v.actualVirtualCount))
            throw new WeaviateDeserializationError('Sharding actual virtual count was not returned by Weaviate');
        if (!exists(v.key))
            throw new WeaviateDeserializationError('Sharding key was not returned by Weaviate');
        if (!exists(v.strategy))
            throw new WeaviateDeserializationError('Sharding strategy was not returned by Weaviate');
        if (!exists(v.function))
            throw new WeaviateDeserializationError('Sharding function was not returned by Weaviate');
        return {
            virtualPerPhysical: v.virtualPerPhysical,
            desiredCount: v.desiredCount,
            actualCount: v.actualCount,
            desiredVirtualCount: v.desiredVirtualCount,
            actualVirtualCount: v.actualVirtualCount,
            key: v.key,
            strategy: v.strategy,
            function: v.function,
        };
    }
    static pqEncoder(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('PQ encoder was not returned by Weaviate');
        if (!exists(v.type))
            throw new WeaviateDeserializationError('PQ encoder name was not returned by Weaviate');
        if (!exists(v.distribution))
            throw new WeaviateDeserializationError('PQ encoder distribution was not returned by Weaviate');
        return {
            type: v.type,
            distribution: v.distribution,
        };
    }
    static pq(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('PQ was not returned by Weaviate');
        if (!exists(v.enabled))
            throw new WeaviateDeserializationError('PQ enabled was not returned by Weaviate');
        if (v.enabled === false)
            return undefined;
        if (!exists(v.bitCompression))
            throw new WeaviateDeserializationError('PQ bit compression was not returned by Weaviate');
        if (!exists(v.segments))
            throw new WeaviateDeserializationError('PQ segments was not returned by Weaviate');
        if (!exists(v.trainingLimit))
            throw new WeaviateDeserializationError('PQ training limit was not returned by Weaviate');
        if (!exists(v.centroids))
            throw new WeaviateDeserializationError('PQ centroids was not returned by Weaviate');
        if (!exists(v.encoder))
            throw new WeaviateDeserializationError('PQ encoder was not returned by Weaviate');
        return {
            bitCompression: v.bitCompression,
            segments: v.segments,
            centroids: v.centroids,
            trainingLimit: v.trainingLimit,
            encoder: ConfigMapping.pqEncoder(v.encoder),
            type: 'pq',
        };
    }
    static vectorIndexHNSW(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Vector index was not returned by Weaviate');
        if (!exists(v.cleanupIntervalSeconds))
            throw new WeaviateDeserializationError('Vector index cleanup interval was not returned by Weaviate');
        if (!exists(v.distance))
            throw new WeaviateDeserializationError('Vector index distance was not returned by Weaviate');
        if (!exists(v.dynamicEfMin))
            throw new WeaviateDeserializationError('Vector index dynamic ef min was not returned by Weaviate');
        if (!exists(v.dynamicEfMax))
            throw new WeaviateDeserializationError('Vector index dynamic ef max was not returned by Weaviate');
        if (!exists(v.dynamicEfFactor))
            throw new WeaviateDeserializationError('Vector index dynamic ef factor was not returned by Weaviate');
        if (!exists(v.ef))
            throw new WeaviateDeserializationError('Vector index ef was not returned by Weaviate');
        if (!exists(v.efConstruction))
            throw new WeaviateDeserializationError('Vector index ef construction was not returned by Weaviate');
        if (!exists(v.flatSearchCutoff))
            throw new WeaviateDeserializationError('Vector index flat search cut off was not returned by Weaviate');
        if (!exists(v.maxConnections))
            throw new WeaviateDeserializationError('Vector index max connections was not returned by Weaviate');
        if (!exists(v.skip))
            throw new WeaviateDeserializationError('Vector index skip was not returned by Weaviate');
        if (!exists(v.vectorCacheMaxObjects))
            throw new WeaviateDeserializationError('Vector index vector cache max objects was not returned by Weaviate');
        let quantizer;
        if (exists(v.pq) && v.pq.enabled === true) {
            quantizer = ConfigMapping.pq(v.pq);
        }
        else if (exists(v.bq) && v.bq.enabled === true) {
            quantizer = ConfigMapping.bq(v.bq);
        }
        else if (exists(v.rq) && v.rq.enabled === true) {
            quantizer = ConfigMapping.rq(v.rq);
        }
        else if (exists(v.sq) && v.sq.enabled === true) {
            quantizer = ConfigMapping.sq(v.sq);
        }
        else {
            quantizer = undefined;
        }
        return {
            cleanupIntervalSeconds: v.cleanupIntervalSeconds,
            distance: v.distance,
            dynamicEfMin: v.dynamicEfMin,
            dynamicEfMax: v.dynamicEfMax,
            dynamicEfFactor: v.dynamicEfFactor,
            ef: v.ef,
            efConstruction: v.efConstruction,
            filterStrategy: exists(v.filterStrategy) ? v.filterStrategy : 'sweeping',
            flatSearchCutoff: v.flatSearchCutoff,
            maxConnections: v.maxConnections,
            multiVector: exists(v.multivector)
                ? ConfigMapping.multiVector(v.multivector)
                : undefined,
            quantizer: quantizer,
            skip: v.skip,
            vectorCacheMaxObjects: v.vectorCacheMaxObjects,
            type: 'hnsw',
        };
    }
    static multiVector(v) {
        if (!exists(v.enabled))
            throw new WeaviateDeserializationError('Multi vector enabled was not returned by Weaviate');
        if (v.enabled === false)
            return undefined;
        if (!exists(v.aggregation))
            throw new WeaviateDeserializationError('Multi vector aggregation was not returned by Weaviate');
        let encoding;
        if (exists(v.muvera)) {
            encoding = v.muvera.enabled
                ? Object.assign({ type: 'muvera' }, v.muvera) : undefined;
        }
        return {
            aggregation: v.aggregation,
            encoding,
        };
    }
    static bq(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('BQ was not returned by Weaviate');
        if (!exists(v.enabled))
            throw new WeaviateDeserializationError('BQ enabled was not returned by Weaviate');
        if (v.enabled === false)
            return undefined;
        const cache = v.cache === undefined ? false : v.cache;
        const rescoreLimit = v.rescoreLimit === undefined ? 1000 : v.rescoreLimit;
        return {
            cache,
            rescoreLimit,
            type: 'bq',
        };
    }
    static rq(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('RQ was not returned by Weaviate');
        if (!exists(v.enabled))
            throw new WeaviateDeserializationError('RQ enabled was not returned by Weaviate');
        if (v.enabled === false)
            return undefined;
        const bits = v.bits === undefined ? 6 : v.bits;
        const rescoreLimit = v.rescoreLimit === undefined ? 20 : v.rescoreLimit;
        return {
            bits,
            rescoreLimit,
            type: 'rq',
        };
    }
    static sq(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('SQ was not returned by Weaviate');
        if (!exists(v.enabled))
            throw new WeaviateDeserializationError('SQ enabled was not returned by Weaviate');
        if (v.enabled === false)
            return undefined;
        const rescoreLimit = v.rescoreLimit === undefined ? 1000 : v.rescoreLimit;
        const trainingLimit = v.trainingLimit === undefined ? 100000 : v.trainingLimit;
        return {
            rescoreLimit,
            trainingLimit,
            type: 'sq',
        };
    }
    static vectorIndexFlat(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Vector index was not returned by Weaviate');
        if (!exists(v.vectorCacheMaxObjects))
            throw new WeaviateDeserializationError('Vector index vector cache max objects was not returned by Weaviate');
        if (!exists(v.distance))
            throw new WeaviateDeserializationError('Vector index distance was not returned by Weaviate');
        if (!exists(v.bq))
            throw new WeaviateDeserializationError('Vector index bq was not returned by Weaviate');
        return {
            vectorCacheMaxObjects: v.vectorCacheMaxObjects,
            distance: v.distance,
            quantizer: ConfigMapping.bq(v.bq),
            type: 'flat',
        };
    }
    static vectorIndexDynamic(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Vector index was not returned by Weaviate');
        if (!exists(v.threshold))
            throw new WeaviateDeserializationError('Vector index threshold was not returned by Weaviate');
        if (!exists(v.distance))
            throw new WeaviateDeserializationError('Vector index distance was not returned by Weaviate');
        if (!exists(v.hnsw))
            throw new WeaviateDeserializationError('Vector index hnsw was not returned by Weaviate');
        if (!exists(v.flat))
            throw new WeaviateDeserializationError('Vector index flat was not returned by Weaviate');
        return {
            distance: v.distance,
            hnsw: ConfigMapping.vectorIndexHNSW(v.hnsw),
            flat: ConfigMapping.vectorIndexFlat(v.flat),
            threshold: v.threshold,
            type: 'dynamic',
        };
    }
    static vectorIndex(v, t) {
        if (t === 'hnsw') {
            return ConfigMapping.vectorIndexHNSW(v);
        }
        else if (t === 'flat') {
            return ConfigMapping.vectorIndexFlat(v);
        }
        else if (t === 'dynamic') {
            return ConfigMapping.vectorIndexDynamic(v);
        }
        else {
            return v;
        }
    }
    static vectorIndexType(v) {
        if (!populated(v))
            throw new WeaviateDeserializationError('Vector index type was not returned by Weaviate');
        return v;
    }
    static properties(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Properties were not returned by Weaviate');
        if (v === null)
            return [];
        return v
            .filter((prop) => {
            if (!populated(prop.dataType))
                throw new WeaviateDeserializationError('Property data type was not returned by Weaviate');
            return prop.dataType[0][0].toLowerCase() === prop.dataType[0][0]; // primitive property, e.g. text
        })
            .map((prop) => {
            if (!populated(prop.name))
                throw new WeaviateDeserializationError('Property name was not returned by Weaviate');
            if (!populated(prop.dataType))
                throw new WeaviateDeserializationError('Property data type was not returned by Weaviate');
            return {
                name: prop.name,
                dataType: prop.dataType[0],
                description: prop.description,
                indexFilterable: prop.indexFilterable ? prop.indexFilterable : false,
                indexInverted: prop.indexInverted ? prop.indexInverted : false,
                indexRangeFilters: prop.indexRangeFilters ? prop.indexRangeFilters : false,
                indexSearchable: prop.indexSearchable ? prop.indexSearchable : false,
                vectorizerConfig: prop.moduleConfig
                    ? 'none' in prop.moduleConfig
                        ? undefined
                        : prop.moduleConfig
                    : undefined,
                nestedProperties: prop.nestedProperties
                    ? ConfigMapping.properties(prop.nestedProperties)
                    : undefined,
                tokenization: prop.tokenization ? prop.tokenization : 'none',
            };
        });
    }
    static references(v) {
        if (v === undefined)
            throw new WeaviateDeserializationError('Properties were not returned by Weaviate');
        if (v === null)
            return [];
        return v
            .filter((prop) => {
            if (!populated(prop.dataType))
                throw new WeaviateDeserializationError('Reference data type was not returned by Weaviate');
            return prop.dataType[0][0].toLowerCase() !== prop.dataType[0][0]; // reference property, e.g. Myclass
        })
            .map((prop) => {
            if (!populated(prop.name))
                throw new WeaviateDeserializationError('Reference name was not returned by Weaviate');
            if (!populated(prop.dataType))
                throw new WeaviateDeserializationError('Reference data type was not returned by Weaviate');
            return {
                name: prop.name,
                description: prop.description,
                targetCollections: prop.dataType,
            };
        });
    }
}
