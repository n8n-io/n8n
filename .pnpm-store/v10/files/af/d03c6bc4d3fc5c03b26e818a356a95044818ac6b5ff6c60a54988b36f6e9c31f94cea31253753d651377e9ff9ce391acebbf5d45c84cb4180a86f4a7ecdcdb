"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configGuards = exports.Quantizer = exports.VectorIndex = void 0;
const errors_js_1 = require("../../errors.js");
const classUpdater_js_1 = __importDefault(require("../../schema/classUpdater.js"));
const index_js_1 = require("../../schema/index.js");
const shardsGetter_js_1 = __importDefault(require("../../schema/shardsGetter.js"));
const vectorAdder_js_1 = __importDefault(require("../../schema/vectorAdder.js"));
const classes_js_1 = require("./classes.js");
const utils_js_1 = require("./utils.js");
const config = (connection, name, dbVersionSupport, tenant) => {
    const getRaw = new index_js_1.ClassGetter(connection).withClassName(name).do;
    return {
        addProperty: (property) => new index_js_1.PropertyCreator(connection)
            .withClassName(name)
            .withProperty((0, utils_js_1.resolveProperty)(property, []))
            .do()
            .then(() => { }),
        addReference: (reference) => new index_js_1.PropertyCreator(connection)
            .withClassName(name)
            .withProperty((0, utils_js_1.resolveReference)(reference))
            .do()
            .then(() => { }),
        addVector: (vectors) => {
            const { vectorsConfig } = (0, utils_js_1.makeVectorsConfig)(vectors);
            return new vectorAdder_js_1.default(connection).withClassName(name).withVectors(vectorsConfig).do();
        },
        get: () => getRaw().then((utils_js_1.classToCollection)),
        getShards: () => {
            let builder = new shardsGetter_js_1.default(connection).withClassName(name);
            if (tenant) {
                builder = builder.withTenant(tenant);
            }
            return builder.do().then((shards) => shards.map((shard) => {
                if (shard.name === undefined)
                    throw new errors_js_1.WeaviateDeserializationError('Shard name was not returned by Weaviate');
                if (shard.status === undefined)
                    throw new errors_js_1.WeaviateDeserializationError('Shard status was not returned by Weaviate');
                if (shard.vectorQueueSize === undefined)
                    throw new errors_js_1.WeaviateDeserializationError('Shard vector queue size was not returned by Weaviate');
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
                return Promise.all(shardNames.map((shardName) => new index_js_1.ShardUpdater(connection).withClassName(name).withShardName(shardName).withStatus(status).do())).then(() => this.getShards());
            });
        },
        update: (config) => {
            return getRaw()
                .then((current) => classes_js_1.MergeWithExisting.schema(current, config))
                .then((merged) => new classUpdater_js_1.default(connection).withClass(merged).do())
                .then(() => { });
        },
    };
};
exports.default = config;
class VectorIndex {
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
exports.VectorIndex = VectorIndex;
class Quantizer {
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
exports.Quantizer = Quantizer;
exports.configGuards = {
    quantizer: Quantizer,
    vectorIndex: VectorIndex,
};
