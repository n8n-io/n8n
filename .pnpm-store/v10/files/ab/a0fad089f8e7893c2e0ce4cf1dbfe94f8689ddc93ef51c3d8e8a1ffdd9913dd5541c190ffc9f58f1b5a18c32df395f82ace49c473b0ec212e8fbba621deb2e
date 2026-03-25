"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../../errors.js");
const classExists_js_1 = __importDefault(require("../../schema/classExists.js"));
const index_js_1 = __importStar(require("../aggregate/index.js"));
const collection_js_1 = require("../backup/collection.js");
const index_js_2 = __importDefault(require("../config/index.js"));
const index_js_3 = __importDefault(require("../data/index.js"));
const index_js_4 = __importDefault(require("../filters/index.js"));
const index_js_5 = __importDefault(require("../generate/index.js"));
const index_js_6 = require("../iterator/index.js");
const index_js_7 = __importDefault(require("../query/index.js"));
const index_js_8 = __importDefault(require("../sort/index.js"));
const index_js_9 = __importDefault(require("../tenants/index.js"));
const multiTargetVector_js_1 = __importDefault(require("../vectors/multiTargetVector.js"));
const isString = (value) => typeof value === 'string';
const capitalizeCollectionName = (name) => (name.charAt(0).toUpperCase() + name.slice(1));
const collection = (connection, name, dbVersionSupport, consistencyLevel, tenant) => {
    if (!isString(name)) {
        throw new errors_js_1.WeaviateInvalidInputError(`The collection name must be a string, got: ${typeof name}`);
    }
    const capitalizedName = capitalizeCollectionName(name);
    const aggregateCollection = (0, index_js_1.default)(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant);
    const queryCollection = (0, index_js_7.default)(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant);
    return {
        aggregate: aggregateCollection,
        backup: (0, collection_js_1.backupCollection)(connection, capitalizedName),
        config: (0, index_js_2.default)(connection, capitalizedName, dbVersionSupport, tenant),
        data: (0, index_js_3.default)(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant),
        filter: (0, index_js_4.default)(),
        generate: (0, index_js_5.default)(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant),
        metrics: (0, index_js_1.metrics)(),
        multiTargetVector: (0, multiTargetVector_js_1.default)(),
        name: name,
        query: queryCollection,
        sort: (0, index_js_8.default)(),
        tenants: (0, index_js_9.default)(connection, capitalizedName, dbVersionSupport),
        exists: () => new classExists_js_1.default(connection).withClassName(capitalizedName).do(),
        iterator: (opts) => new index_js_6.Iterator((limit, after) => queryCollection
            .fetchObjects({
            limit,
            after,
            includeVector: opts === null || opts === void 0 ? void 0 : opts.includeVector,
            returnMetadata: opts === null || opts === void 0 ? void 0 : opts.returnMetadata,
            returnProperties: opts === null || opts === void 0 ? void 0 : opts.returnProperties,
            returnReferences: opts === null || opts === void 0 ? void 0 : opts.returnReferences,
        })
            .then((res) => res.objects)),
        length: () => aggregateCollection.overAll().then(({ totalCount }) => totalCount),
        withConsistency: (consistencyLevel) => collection(connection, capitalizedName, dbVersionSupport, consistencyLevel, tenant),
        withTenant: (tenant) => collection(connection, capitalizedName, dbVersionSupport, consistencyLevel, typeof tenant === 'string' ? tenant : tenant.name),
    };
};
exports.default = collection;
