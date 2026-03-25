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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Serialize = exports.MetadataGuards = exports.DataGuards = void 0;
const uuid_1 = require("uuid");
const base_search_js_1 = require("../../proto/v1/base_search.js");
const batch_js_1 = require("../../proto/v1/batch.js");
const generative_js_1 = require("../../proto/v1/generative.js");
const search_get_js_1 = require("../../proto/v1/search_get.js");
const errors_js_1 = require("../../errors.js");
const index_js_1 = require("../../index.js");
const aggregate_js_1 = require("../../proto/v1/aggregate.js");
const base_js_1 = require("../../proto/v1/base.js");
const yield_js_1 = require("../../utils/yield.js");
const classes_js_1 = require("../filters/classes.js");
const index_js_2 = require("../filters/index.js");
const utils_js_1 = require("../query/utils.js");
const classes_js_2 = require("../references/classes.js");
const utils_js_2 = require("../references/utils.js");
class FilterGuards {
}
FilterGuards.isFilters = (argument) => {
    return argument instanceof index_js_2.Filters;
};
FilterGuards.isText = (argument) => {
    return typeof argument === 'string';
};
FilterGuards.isTextArray = (argument) => {
    return (argument instanceof Array &&
        argument.every((arg) => typeof arg === 'string'));
};
FilterGuards.isInt = (argument) => {
    return typeof argument === 'number' && Number.isInteger(argument);
};
FilterGuards.isIntArray = (argument) => {
    return (argument instanceof Array &&
        argument.every((arg) => typeof arg === 'number' && Number.isInteger(arg)));
};
FilterGuards.isFloat = (argument) => {
    return typeof argument === 'number' && !Number.isInteger(argument);
};
FilterGuards.isFloatArray = (argument) => {
    return (argument instanceof Array &&
        argument.every((arg) => typeof arg === 'number' && !Number.isInteger(arg)));
};
FilterGuards.isBoolean = (argument) => {
    return typeof argument === 'boolean';
};
FilterGuards.isBooleanArray = (argument) => {
    return (argument instanceof Array &&
        argument.every((arg) => typeof arg === 'boolean'));
};
FilterGuards.isDate = (argument) => {
    return argument instanceof Date;
};
FilterGuards.isDateArray = (argument) => {
    return (argument instanceof Array && argument.every((arg) => arg instanceof Date));
};
FilterGuards.isGeoRange = (argument) => {
    if (argument === undefined) {
        return false;
    }
    const arg = argument;
    return arg.latitude !== undefined && arg.longitude !== undefined && arg.distance !== undefined;
};
class DataGuards {
}
exports.DataGuards = DataGuards;
DataGuards.isText = (argument) => {
    return typeof argument === 'string';
};
DataGuards.isTextArray = (argument) => {
    return (argument instanceof Array &&
        argument.length > 0 &&
        argument.every(DataGuards.isText));
};
DataGuards.isInt = (argument) => {
    return (typeof argument === 'number' &&
        Number.isInteger(argument) &&
        !Number.isNaN(argument) &&
        Number.isFinite(argument));
};
DataGuards.isIntArray = (argument) => {
    return (argument instanceof Array &&
        argument.length > 0 &&
        argument.every(DataGuards.isInt));
};
DataGuards.isFloat = (argument) => {
    return (typeof argument === 'number' &&
        !Number.isInteger(argument) &&
        !Number.isNaN(argument) &&
        Number.isFinite(argument));
};
DataGuards.isFloatArray = (argument) => {
    return (argument instanceof Array &&
        argument.length > 0 &&
        argument.every(DataGuards.isFloat));
};
DataGuards.isBoolean = (argument) => {
    return typeof argument === 'boolean';
};
DataGuards.isBooleanArray = (argument) => {
    return (argument instanceof Array &&
        argument.length > 0 &&
        argument.every(DataGuards.isBoolean));
};
DataGuards.isDate = (argument) => {
    return argument instanceof Date;
};
DataGuards.isDateArray = (argument) => {
    return (argument instanceof Array &&
        argument.length > 0 &&
        argument.every(DataGuards.isDate));
};
DataGuards.isGeoCoordinate = (argument) => {
    return (argument instanceof Object &&
        argument.latitude !== undefined &&
        argument.longitude !== undefined &&
        Object.keys(argument).length === 2);
};
DataGuards.isPhoneNumber = (argument) => {
    return (argument instanceof Object &&
        argument.number !== undefined &&
        (Object.keys(argument).length === 1 ||
            (Object.keys(argument).length === 2 && argument.defaultCountry !== undefined)));
};
DataGuards.isNested = (argument) => {
    return (argument instanceof Object &&
        !(argument instanceof Array) &&
        !DataGuards.isDate(argument) &&
        !DataGuards.isGeoCoordinate(argument) &&
        !DataGuards.isPhoneNumber(argument));
};
DataGuards.isNestedArray = (argument) => {
    return (argument instanceof Array &&
        argument.length > 0 &&
        argument.every(DataGuards.isNested));
};
DataGuards.isEmptyArray = (argument) => {
    return argument instanceof Array && argument.length === 0;
};
DataGuards.isDataObject = (obj) => {
    return (obj.id !== undefined ||
        obj.properties !== undefined ||
        obj.references !== undefined ||
        obj.vectors !== undefined);
};
class MetadataGuards {
}
exports.MetadataGuards = MetadataGuards;
MetadataGuards.isKeys = (argument) => {
    return argument instanceof Array && argument.length > 0;
};
MetadataGuards.isAll = (argument) => {
    return argument === 'all';
};
MetadataGuards.isUndefined = (argument) => {
    return argument === undefined;
};
class Aggregate {
}
_a = Aggregate;
Aggregate.aggregations = (returnMetrics) => {
    if (returnMetrics === undefined) {
        return [];
    }
    if (!Array.isArray(returnMetrics)) {
        returnMetrics = [returnMetrics];
    }
    return returnMetrics.map((metric) => aggregate_js_1.AggregateRequest_Aggregation.fromPartial({
        property: metric.propertyName,
        boolean: metric.kind === 'boolean' ? aggregate_js_1.AggregateRequest_Aggregation_Boolean.fromPartial(metric) : undefined,
        date: metric.kind === 'date' ? aggregate_js_1.AggregateRequest_Aggregation_DateMessage.fromPartial(metric) : undefined,
        int: metric.kind === 'integer' ? aggregate_js_1.AggregateRequest_Aggregation_Integer.fromPartial(metric) : undefined,
        number: metric.kind === 'number' ? aggregate_js_1.AggregateRequest_Aggregation_Number.fromPartial(metric) : undefined,
        text: metric.kind === 'text'
            ? aggregate_js_1.AggregateRequest_Aggregation_Text.fromPartial({
                count: metric.count,
                topOccurencesLimit: metric.minOccurrences,
                topOccurences: metric.topOccurrences != undefined,
            })
            : undefined,
    }));
};
Aggregate.common = (opts) => {
    return {
        filters: (opts === null || opts === void 0 ? void 0 : opts.filters) ? Serialize.filtersGRPC(opts.filters) : undefined,
        aggregations: _a.aggregations(opts === null || opts === void 0 ? void 0 : opts.returnMetrics),
    };
};
Aggregate.groupBy = (groupBy) => {
    return aggregate_js_1.AggregateRequest_GroupBy.fromPartial({
        property: groupBy === null || groupBy === void 0 ? void 0 : groupBy.property,
    });
};
Aggregate.hybrid = (query, opts) => __awaiter(void 0, void 0, void 0, function* () {
    return Object.assign(Object.assign({}, _a.common(opts)), { objectLimit: opts === null || opts === void 0 ? void 0 : opts.objectLimit, hybrid: yield Serialize.hybridSearch(Object.assign({ query: query, supportsVectors: true }, opts)) });
});
Aggregate.nearImage = (image, opts) => {
    return Object.assign(Object.assign({}, _a.common(opts)), { objectLimit: opts === null || opts === void 0 ? void 0 : opts.objectLimit, nearImage: Serialize.nearImageSearch(Object.assign({ image }, opts)) });
};
Aggregate.nearObject = (id, opts) => {
    return Object.assign(Object.assign({}, _a.common(opts)), { objectLimit: opts === null || opts === void 0 ? void 0 : opts.objectLimit, nearObject: Serialize.nearObjectSearch(Object.assign({ id }, opts)) });
};
Aggregate.nearText = (query, opts) => {
    return Object.assign(Object.assign({}, _a.common(opts)), { objectLimit: opts === null || opts === void 0 ? void 0 : opts.objectLimit, nearText: Serialize.nearTextSearch(Object.assign({ query }, opts)) });
};
Aggregate.nearVector = (vector, opts) => __awaiter(void 0, void 0, void 0, function* () {
    return Object.assign(Object.assign({}, _a.common(opts)), { objectLimit: opts === null || opts === void 0 ? void 0 : opts.objectLimit, nearVector: yield Serialize.nearVectorSearch(Object.assign({ vector, supportsVectors: true }, opts)) });
});
Aggregate.overAll = (opts) => _a.common(opts);
class Search {
}
_b = Search;
Search.queryProperties = (properties, references) => {
    const nonRefProperties = properties === null || properties === void 0 ? void 0 : properties.filter((property) => typeof property === 'string');
    const refProperties = references;
    const objectProperties = properties === null || properties === void 0 ? void 0 : properties.filter((property) => typeof property === 'object');
    const resolveObjectProperty = (property) => {
        const objProps = property.properties.filter((property) => typeof property !== 'string'); // cannot get types to work currently :(
        return {
            propName: property.name,
            primitiveProperties: property.properties.filter((property) => typeof property === 'string'),
            objectProperties: objProps.map(resolveObjectProperty),
        };
    };
    return {
        nonRefProperties: nonRefProperties === undefined ? [] : nonRefProperties,
        returnAllNonrefProperties: nonRefProperties === undefined,
        refProperties: refProperties
            ? refProperties.map((property) => {
                return {
                    referenceProperty: property.linkOn,
                    properties: _b.queryProperties(property.returnProperties),
                    metadata: _b.metadata(property.includeVector, property.returnMetadata),
                    targetCollection: property.targetCollection ? property.targetCollection : '',
                };
            })
            : [],
        objectProperties: objectProperties
            ? objectProperties.map((property) => {
                const objProps = property.properties.filter((property) => typeof property !== 'string'); // cannot get types to work currently :(
                return {
                    propName: property.name,
                    primitiveProperties: property.properties.filter((property) => typeof property === 'string'),
                    objectProperties: objProps.map(resolveObjectProperty),
                };
            })
            : [],
    };
};
Search.metadata = (includeVector, metadata) => {
    const out = {
        uuid: true,
        vector: typeof includeVector === 'boolean' ? includeVector : false,
        vectors: Array.isArray(includeVector) ? includeVector : [],
    };
    if (MetadataGuards.isAll(metadata)) {
        return Object.assign(Object.assign({}, out), { creationTimeUnix: true, lastUpdateTimeUnix: true, distance: true, certainty: true, score: true, explainScore: true, isConsistent: true });
    }
    metadata === null || metadata === void 0 ? void 0 : metadata.forEach((key) => {
        let weaviateKey;
        if (key === 'creationTime') {
            weaviateKey = 'creationTimeUnix';
        }
        else if (key === 'updateTime') {
            weaviateKey = 'lastUpdateTimeUnix';
        }
        else {
            weaviateKey = key;
        }
        out[weaviateKey] = true;
    });
    return search_get_js_1.MetadataRequest.fromPartial(out);
};
Search.sortBy = (sort) => {
    return sort.map((sort) => {
        return {
            ascending: !!sort.ascending,
            path: [sort.property],
        };
    });
};
Search.rerank = (rerank) => {
    return search_get_js_1.Rerank.fromPartial({
        property: rerank.property,
        query: rerank.query,
    });
};
Search.groupBy = (groupBy) => {
    return search_get_js_1.GroupBy.fromPartial({
        path: (groupBy === null || groupBy === void 0 ? void 0 : groupBy.property) ? [groupBy.property] : undefined,
        numberOfGroups: groupBy === null || groupBy === void 0 ? void 0 : groupBy.numberOfGroups,
        objectsPerGroup: groupBy === null || groupBy === void 0 ? void 0 : groupBy.objectsPerGroup,
    });
};
Search.isGroupBy = (args) => {
    if (args === undefined)
        return false;
    return args.groupBy !== undefined;
};
Search.common = (args) => {
    const out = {
        autocut: args === null || args === void 0 ? void 0 : args.autoLimit,
        limit: args === null || args === void 0 ? void 0 : args.limit,
        offset: args === null || args === void 0 ? void 0 : args.offset,
        filters: (args === null || args === void 0 ? void 0 : args.filters) ? Serialize.filtersGRPC(args.filters) : undefined,
        properties: (args === null || args === void 0 ? void 0 : args.returnProperties) || (args === null || args === void 0 ? void 0 : args.returnReferences)
            ? _b.queryProperties(args.returnProperties, args.returnReferences)
            : undefined,
        metadata: _b.metadata(args === null || args === void 0 ? void 0 : args.includeVector, args === null || args === void 0 ? void 0 : args.returnMetadata),
    };
    if (args === null || args === void 0 ? void 0 : args.rerank) {
        out.rerank = _b.rerank(args.rerank);
    }
    return out;
};
Search.bm25 = (query, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { bm25Search: Serialize.bm25Search(Object.assign({ query }, opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.fetchObjects = (args) => {
    return Object.assign(Object.assign({}, _b.common(args)), { after: args === null || args === void 0 ? void 0 : args.after, sortBy: (args === null || args === void 0 ? void 0 : args.sort) ? _b.sortBy(args.sort.sorts) : undefined });
};
Search.fetchObjectById = (args) => {
    return _b.common({
        filters: new classes_js_1.FilterId().equal(args.id),
        includeVector: args.includeVector,
        returnMetadata: ['creationTime', 'updateTime', 'isConsistent'],
        returnProperties: args.returnProperties,
        returnReferences: args.returnReferences,
    });
};
Search.hybrid = (args, opts) => __awaiter(void 0, void 0, void 0, function* () {
    return Object.assign(Object.assign({}, _b.common(opts)), { hybridSearch: yield Serialize.hybridSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts)
            ? _b.groupBy(opts.groupBy)
            : undefined });
});
Search.nearAudio = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearAudio: Serialize.nearAudioSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearDepth = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearDepth: Serialize.nearDepthSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearImage = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearImage: Serialize.nearImageSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearIMU = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearIMU: Serialize.nearIMUSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearObject = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearObject: Serialize.nearObjectSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearText = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearText: Serialize.nearTextSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearThermal = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearThermal: Serialize.nearThermalSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
Search.nearVector = (args, opts) => __awaiter(void 0, void 0, void 0, function* () {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearVector: yield Serialize.nearVectorSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
});
Search.nearVideo = (args, opts) => {
    return Object.assign(Object.assign({}, _b.common(opts)), { nearVideo: Serialize.nearVideoSearch(Object.assign(Object.assign({}, args), opts)), groupBy: _b.isGroupBy(opts) ? _b.groupBy(opts.groupBy) : undefined });
};
class Serialize {
    static isSinglePrompt(arg) {
        return typeof arg !== 'string' && arg !== undefined && arg.prompt !== undefined;
    }
    static isGroupedTask(arg) {
        return typeof arg !== 'string' && arg !== undefined && arg.prompt !== undefined;
    }
    static tenants(tenants, mapper) {
        const mapped = [];
        const batches = Math.ceil(tenants.length / 100);
        for (let i = 0; i < batches; i++) {
            const batch = tenants.slice(i * 100, (i + 1) * 100);
            mapped.push(batch.map(mapper));
        }
        return mapped;
    }
    static tenantCreate(tenant) {
        let activityStatus;
        switch (tenant.activityStatus) {
            case 'ACTIVE':
                activityStatus = 'HOT';
                break;
            case 'INACTIVE':
                activityStatus = 'COLD';
                break;
            case 'HOT':
            case 'COLD':
            case undefined:
                activityStatus = tenant.activityStatus;
                break;
            case 'FROZEN':
                throw new errors_js_1.WeaviateInvalidInputError('Invalid activity status. Please provide one of the following: ACTIVE, INACTIVE, HOT, COLD.');
            default:
                throw new errors_js_1.WeaviateInvalidInputError('Invalid activity status. Please provide one of the following: ACTIVE, INACTIVE, HOT, COLD.');
        }
        return {
            name: tenant.name,
            activityStatus,
        };
    }
    static tenantUpdate(tenant) {
        let activityStatus;
        switch (tenant.activityStatus) {
            case 'ACTIVE':
                activityStatus = 'HOT';
                break;
            case 'INACTIVE':
                activityStatus = 'COLD';
                break;
            case 'OFFLOADED':
                activityStatus = 'FROZEN';
                break;
            case 'HOT':
            case 'COLD':
            case 'FROZEN':
                activityStatus = tenant.activityStatus;
                break;
            default:
                throw new errors_js_1.WeaviateInvalidInputError('Invalid activity status. Please provide one of the following: ACTIVE, INACTIVE, HOT, COLD, OFFLOADED.');
        }
        return {
            name: tenant.name,
            activityStatus,
        };
    }
}
exports.Serialize = Serialize;
_c = Serialize;
Serialize.aggregate = Aggregate;
Serialize.search = Search;
Serialize.isNamedVectors = (opts) => {
    return Array.isArray(opts === null || opts === void 0 ? void 0 : opts.includeVector) || (opts === null || opts === void 0 ? void 0 : opts.targetVector) !== undefined;
};
Serialize.isMultiTarget = (opts) => {
    return (opts === null || opts === void 0 ? void 0 : opts.targetVector) !== undefined && !utils_js_1.TargetVectorInputGuards.isSingle(opts.targetVector);
};
Serialize.isMultiWeightPerTarget = (opts) => {
    return ((opts === null || opts === void 0 ? void 0 : opts.targetVector) !== undefined &&
        utils_js_1.TargetVectorInputGuards.isMultiJoin(opts.targetVector) &&
        opts.targetVector.weights !== undefined &&
        Object.values(opts.targetVector.weights).some(utils_js_1.ArrayInputGuards.is1DArray));
};
Serialize.isMultiVector = (vec) => {
    return (vec !== undefined &&
        !Array.isArray(vec) &&
        Object.values(vec).some(utils_js_1.ArrayInputGuards.is1DArray || utils_js_1.ArrayInputGuards.is2DArray));
};
Serialize.isMultiVectorPerTarget = (vec) => {
    return vec !== undefined && !Array.isArray(vec) && Object.values(vec).some(utils_js_1.ArrayInputGuards.is2DArray);
};
Serialize.withImages = (config, imgs, imgProps) => __awaiter(void 0, void 0, void 0, function* () {
    if (imgs == undefined && imgProps == undefined) {
        return config;
    }
    return Object.assign(Object.assign({}, config), { images: base_js_1.TextArray.fromPartial({
            values: imgs ? yield Promise.all(imgs.map(index_js_1.toBase64FromMedia)) : undefined,
        }), imageProperties: base_js_1.TextArray.fromPartial({ values: imgProps }) });
});
Serialize.generativeQuery = (generative, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const provider = generative_js_1.GenerativeProvider.fromPartial({ returnMetadata: opts === null || opts === void 0 ? void 0 : opts.metadata });
    switch (generative.name) {
        case 'generative-anthropic':
            provider.anthropic = yield _c.withImages(generative.config || {}, opts === null || opts === void 0 ? void 0 : opts.images, opts === null || opts === void 0 ? void 0 : opts.imageProperties);
            break;
        case 'generative-anyscale':
            provider.anyscale = generative.config || {};
            break;
        case 'generative-aws':
            provider.aws = yield _c.withImages(generative.config || {}, opts === null || opts === void 0 ? void 0 : opts.images, opts === null || opts === void 0 ? void 0 : opts.imageProperties);
            break;
        case 'generative-cohere':
            provider.cohere = yield _c.withImages(generative.config || {}, opts === null || opts === void 0 ? void 0 : opts.images, opts === null || opts === void 0 ? void 0 : opts.imageProperties);
            break;
        case 'generative-databricks':
            provider.databricks = generative.config || {};
            break;
        case 'generative-dummy':
            provider.dummy = generative.config || {};
            break;
        case 'generative-friendliai':
            provider.friendliai = generative.config || {};
            break;
        case 'generative-google':
            provider.google = yield _c.withImages(generative.config || {}, opts === null || opts === void 0 ? void 0 : opts.images, opts === null || opts === void 0 ? void 0 : opts.imageProperties);
            break;
        case 'generative-mistral':
            provider.mistral = generative.config || {};
            break;
        case 'generative-nvidia':
            provider.nvidia = generative.config || {};
            break;
        case 'generative-ollama':
            provider.ollama = yield _c.withImages(generative.config || {}, opts === null || opts === void 0 ? void 0 : opts.images, opts === null || opts === void 0 ? void 0 : opts.imageProperties);
            break;
        case 'generative-openai':
            provider.openai = yield _c.withImages(generative.config || {}, opts === null || opts === void 0 ? void 0 : opts.images, opts === null || opts === void 0 ? void 0 : opts.imageProperties);
            break;
    }
    return provider;
});
Serialize.generative = (args, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const singlePrompt = _c.isSinglePrompt(opts === null || opts === void 0 ? void 0 : opts.singlePrompt)
        ? opts.singlePrompt.prompt
        : opts === null || opts === void 0 ? void 0 : opts.singlePrompt;
    const singlePromptDebug = _c.isSinglePrompt(opts === null || opts === void 0 ? void 0 : opts.singlePrompt)
        ? opts.singlePrompt.debug
        : undefined;
    const groupedTask = _c.isGroupedTask(opts === null || opts === void 0 ? void 0 : opts.groupedTask)
        ? opts.groupedTask.prompt
        : opts === null || opts === void 0 ? void 0 : opts.groupedTask;
    const groupedProperties = _c.isGroupedTask(opts === null || opts === void 0 ? void 0 : opts.groupedTask)
        ? opts.groupedTask.nonBlobProperties
        : opts === null || opts === void 0 ? void 0 : opts.groupedProperties;
    const singleOpts = _c.isSinglePrompt(opts === null || opts === void 0 ? void 0 : opts.singlePrompt) ? opts.singlePrompt : undefined;
    const groupedOpts = _c.isGroupedTask(opts === null || opts === void 0 ? void 0 : opts.groupedTask) ? opts.groupedTask : undefined;
    return args.supportsSingleGrouped
        ? generative_js_1.GenerativeSearch.fromPartial({
            single: (opts === null || opts === void 0 ? void 0 : opts.singlePrompt)
                ? generative_js_1.GenerativeSearch_Single.fromPartial({
                    prompt: singlePrompt,
                    debug: singlePromptDebug,
                    queries: opts.config ? [yield _c.generativeQuery(opts.config, singleOpts)] : undefined,
                })
                : undefined,
            grouped: (opts === null || opts === void 0 ? void 0 : opts.groupedTask)
                ? generative_js_1.GenerativeSearch_Grouped.fromPartial({
                    task: groupedTask,
                    queries: opts.config
                        ? [yield _c.generativeQuery(opts.config, groupedOpts)]
                        : undefined,
                    properties: groupedProperties
                        ? base_js_1.TextArray.fromPartial({ values: groupedProperties })
                        : undefined,
                })
                : undefined,
        })
        : generative_js_1.GenerativeSearch.fromPartial({
            singleResponsePrompt: singlePrompt,
            groupedResponseTask: groupedTask,
            groupedProperties: groupedProperties,
        });
});
Serialize.bm25QueryProperties = (properties) => {
    return properties === null || properties === void 0 ? void 0 : properties.map((property) => {
        if (typeof property === 'string') {
            return property;
        }
        else {
            return `${property.name}^${property.weight}`;
        }
    });
};
Serialize.bm25SearchOperator = (searchOperator) => {
    if (searchOperator) {
        return base_search_js_1.SearchOperatorOptions.fromPartial(searchOperator.operator === 'And'
            ? { operator: base_search_js_1.SearchOperatorOptions_Operator.OPERATOR_AND }
            : {
                operator: base_search_js_1.SearchOperatorOptions_Operator.OPERATOR_OR,
                minimumOrTokensMatch: searchOperator.minimumMatch,
            });
    }
};
Serialize.bm25Search = (args) => {
    return base_search_js_1.BM25.fromPartial({
        query: args.query,
        properties: _c.bm25QueryProperties(args.queryProperties),
        searchOperator: _c.bm25SearchOperator(args.operator),
    });
};
Serialize.isHybridVectorSearch = (vector) => {
    return (vector !== undefined &&
        !_c.isHybridNearTextSearch(vector) &&
        !_c.isHybridNearVectorSearch(vector));
};
Serialize.isHybridNearTextSearch = (vector) => {
    return (vector === null || vector === void 0 ? void 0 : vector.query) !== undefined;
};
Serialize.isHybridNearVectorSearch = (vector) => {
    return (vector === null || vector === void 0 ? void 0 : vector.vector) !== undefined;
};
Serialize.hybridVector = (args) => __awaiter(void 0, void 0, void 0, function* () {
    const vector = args.vector;
    if (_c.isHybridVectorSearch(vector)) {
        const { targets, targetVectors, vectorBytes, vectorPerTarget, vectorForTargets, vectors } = yield _c.vectors(Object.assign(Object.assign({}, args), { argumentName: 'vector', vector: vector }));
        return vectorBytes !== undefined
            ? { vectorBytes, targetVectors, targets }
            : {
                targetVectors,
                targets,
                nearVector: vectorForTargets != undefined || vectorPerTarget != undefined
                    ? base_search_js_1.NearVector.fromPartial({
                        vectorForTargets,
                        vectorPerTarget,
                    })
                    : undefined,
                vectors,
            };
    }
    else if (_c.isHybridNearTextSearch(vector)) {
        const { targetVectors, targets } = _c.targetVector(args);
        return {
            targets,
            targetVectors,
            nearText: base_search_js_1.NearTextSearch.fromPartial({
                query: typeof vector.query === 'string' ? [vector.query] : vector.query,
                certainty: vector.certainty,
                distance: vector.distance,
                moveAway: vector.moveAway ? base_search_js_1.NearTextSearch_Move.fromPartial(vector.moveAway) : undefined,
                moveTo: vector.moveTo ? base_search_js_1.NearTextSearch_Move.fromPartial(vector.moveTo) : undefined,
            }),
        };
    }
    else if (_c.isHybridNearVectorSearch(vector)) {
        const { targetVectors, targets, vectorBytes, vectorPerTarget, vectorForTargets, vectors } = yield _c.vectors(Object.assign(Object.assign({}, args), { argumentName: 'vector', vector: vector.vector }));
        return {
            targetVectors,
            targets,
            nearVector: base_search_js_1.NearVector.fromPartial({
                certainty: vector.certainty,
                distance: vector.distance,
                vectorBytes,
                vectorPerTarget,
                vectorForTargets,
                vectors,
            }),
        };
    }
    else {
        const { targets, targetVectors } = _c.targetVector(args);
        return { targets, targetVectors };
    }
});
Serialize.hybridSearch = (args) => __awaiter(void 0, void 0, void 0, function* () {
    const fusionType = (fusionType) => {
        switch (fusionType) {
            case 'Ranked':
                return base_search_js_1.Hybrid_FusionType.FUSION_TYPE_RANKED;
            case 'RelativeScore':
                return base_search_js_1.Hybrid_FusionType.FUSION_TYPE_RELATIVE_SCORE;
            default:
                return base_search_js_1.Hybrid_FusionType.FUSION_TYPE_UNSPECIFIED;
        }
    };
    const { targets, targetVectors, vectorBytes, nearText, nearVector, vectors } = yield _c.hybridVector(args);
    return base_search_js_1.Hybrid.fromPartial({
        query: args.query,
        alpha: args.alpha !== undefined ? args.alpha : 0.5,
        properties: _c.bm25QueryProperties(args.queryProperties),
        vectorBytes: vectorBytes,
        vectorDistance: args.maxVectorDistance,
        fusionType: fusionType(args.fusionType),
        bm25SearchOperator: _c.bm25SearchOperator(args.bm25Operator),
        targetVectors,
        targets,
        nearText,
        nearVector,
        vectors,
    });
});
Serialize.nearAudioSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearAudioSearch.fromPartial({
        audio: args.audio,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.nearDepthSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearDepthSearch.fromPartial({
        depth: args.depth,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.nearImageSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearImageSearch.fromPartial({
        image: args.image,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.nearIMUSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearIMUSearch.fromPartial({
        imu: args.imu,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.nearObjectSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearObject.fromPartial({
        id: args.id,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.nearTextSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearTextSearch.fromPartial({
        query: typeof args.query === 'string' ? [args.query] : args.query,
        certainty: args.certainty,
        distance: args.distance,
        targets,
        targetVectors,
        moveAway: args.moveAway
            ? base_search_js_1.NearTextSearch_Move.fromPartial({
                concepts: args.moveAway.concepts,
                force: args.moveAway.force,
                uuids: args.moveAway.objects,
            })
            : undefined,
        moveTo: args.moveTo
            ? base_search_js_1.NearTextSearch_Move.fromPartial({
                concepts: args.moveTo.concepts,
                force: args.moveTo.force,
                uuids: args.moveTo.objects,
            })
            : undefined,
    });
};
Serialize.nearThermalSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearThermalSearch.fromPartial({
        thermal: args.thermal,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.vectorToBuffer = (vector) => {
    return new Float32Array(vector).buffer;
};
Serialize.vectorToBytes = (vector) => {
    const uint32len = 4;
    const dv = new DataView(new ArrayBuffer(vector.length * uint32len));
    vector.forEach((v, i) => dv.setFloat32(i * uint32len, v, true));
    return new Uint8Array(dv.buffer);
};
/**
 * Convert a 2D array of numbers to a Uint8Array
 *
 * Defined as an async method so that control can be relinquished back to the event loop on each outer loop for large vectors
 */
Serialize.vectorsToBytes = (vectors) => __awaiter(void 0, void 0, void 0, function* () {
    if (vectors.length === 0) {
        return new Uint8Array();
    }
    if (vectors[0].length === 0) {
        return new Uint8Array();
    }
    const uint16Len = 2;
    const uint32len = 4;
    const dim = vectors[0].length;
    const dv = new DataView(new ArrayBuffer(uint16Len + vectors.length * dim * uint32len));
    dv.setUint16(0, dim, true);
    dv.setUint16(uint16Len, vectors.length, true);
    yield Promise.all(vectors.map((vector, i) => (0, yield_js_1.yieldToEventLoop)().then(() => vector.forEach((v, j) => dv.setFloat32(uint16Len + i * dim * uint32len + j * uint32len, v, true)))));
    return new Uint8Array(dv.buffer);
});
Serialize.nearVectorSearch = (args) => __awaiter(void 0, void 0, void 0, function* () {
    return base_search_js_1.NearVector.fromPartial(Object.assign({ certainty: args.certainty, distance: args.distance }, (yield _c.vectors(Object.assign(Object.assign({}, args), { argumentName: 'nearVector' })))));
});
Serialize.targetVector = (args) => {
    if ((args === null || args === void 0 ? void 0 : args.targetVector) === undefined) {
        return {};
    }
    else if (utils_js_1.TargetVectorInputGuards.isSingle(args.targetVector)) {
        return {
            targets: base_search_js_1.Targets.fromPartial({
                targetVectors: [args.targetVector],
            }),
        };
    }
    else if (utils_js_1.TargetVectorInputGuards.isMulti(args.targetVector)) {
        return {
            targets: base_search_js_1.Targets.fromPartial({
                targetVectors: args.targetVector,
            }),
        };
    }
    else {
        return { targets: _c.targets(args.targetVector) };
    }
};
Serialize.vectors = (args) => __awaiter(void 0, void 0, void 0, function* () {
    const invalidVectorError = new errors_js_1.WeaviateInvalidInputError(`${args.argumentName} argument must be populated and:
            - an array of numbers (number[])
            - an object with target names as keys and 1D and/or 2D arrays of numbers (number[] or number[][]) as values
      received: ${args.vector} and ${args.targetVector}`);
    if (args.vector === undefined) {
        return _c.targetVector(args);
    }
    if (utils_js_1.NearVectorInputGuards.isObject(args.vector)) {
        if (Object.keys(args.vector).length === 0) {
            throw invalidVectorError;
        }
        const vectorForTargets = [];
        for (const [target, vector] of Object.entries(args.vector)) {
            if (!args.supportsVectors) {
                if (utils_js_1.NearVectorInputGuards.isListOf2D(vector)) {
                    throw new errors_js_1.WeaviateUnsupportedFeatureError('Lists of multi-vectors are not supported in Weaviate <1.29.0');
                }
                if (utils_js_1.ArrayInputGuards.is2DArray(vector)) {
                    vector.forEach((v) => vectorForTargets.push({ name: target, vectorBytes: _c.vectorToBytes(v), vectors: [] }));
                    continue;
                }
                if (utils_js_1.NearVectorInputGuards.isListOf1D(vector)) {
                    vector.vectors.forEach((v) => vectorForTargets.push({
                        name: target,
                        vectorBytes: _c.vectorToBytes(v),
                        vectors: [],
                    }));
                    continue;
                }
                vectorForTargets.push({ name: target, vectorBytes: _c.vectorToBytes(vector), vectors: [] });
                continue;
            }
            const vectorForTarget = {
                name: target,
                vectorBytes: new Uint8Array(),
                vectors: [],
            };
            if (utils_js_1.NearVectorInputGuards.isListOf1D(vector)) {
                vectorForTarget.vectors.push(base_js_1.Vectors.fromPartial({
                    type: base_js_1.Vectors_VectorType.VECTOR_TYPE_SINGLE_FP32,
                    vectorBytes: yield _c.vectorsToBytes(vector.vectors), // eslint-disable-line no-await-in-loop
                }));
            }
            else if (utils_js_1.NearVectorInputGuards.isListOf2D(vector)) {
                for (const v of vector.vectors) {
                    vectorForTarget.vectors.push(base_js_1.Vectors.fromPartial({
                        type: base_js_1.Vectors_VectorType.VECTOR_TYPE_MULTI_FP32,
                        vectorBytes: yield _c.vectorsToBytes(v), // eslint-disable-line no-await-in-loop
                    }));
                }
            }
            else if (utils_js_1.ArrayInputGuards.is2DArray(vector)) {
                vectorForTarget.vectors.push(base_js_1.Vectors.fromPartial({
                    type: base_js_1.Vectors_VectorType.VECTOR_TYPE_MULTI_FP32,
                    vectorBytes: yield _c.vectorsToBytes(vector), // eslint-disable-line no-await-in-loop
                }));
            }
            else {
                vectorForTarget.vectors.push(base_js_1.Vectors.fromPartial({
                    type: base_js_1.Vectors_VectorType.VECTOR_TYPE_SINGLE_FP32,
                    vectorBytes: _c.vectorToBytes(vector),
                }));
            }
            vectorForTargets.push(vectorForTarget);
        }
        return args.targetVector !== undefined
            ? Object.assign(Object.assign({}, _c.targetVector(args)), { vectorForTargets }) : {
            targetVectors: undefined,
            targets: base_search_js_1.Targets.fromPartial({
                targetVectors: vectorForTargets.map((v) => v.name),
            }),
            vectorForTargets,
        };
    }
    if (args.vector.length === 0) {
        throw invalidVectorError;
    }
    if (utils_js_1.NearVectorInputGuards.is1D(args.vector)) {
        const { targetVectors, targets } = _c.targetVector(args);
        const vectorBytes = _c.vectorToBytes(args.vector);
        return args.supportsVectors
            ? {
                targets,
                targetVectors,
                vectors: [base_js_1.Vectors.fromPartial({ type: base_js_1.Vectors_VectorType.VECTOR_TYPE_SINGLE_FP32, vectorBytes })],
            }
            : {
                targets,
                targetVectors,
                vectorBytes,
            };
    }
    if (utils_js_1.NearVectorInputGuards.is2D(args.vector)) {
        if (!args.supportsVectors) {
            throw new errors_js_1.WeaviateUnsupportedFeatureError('Multi-vectors are not supported in Weaviate <1.29.0');
        }
        const { targetVectors, targets } = _c.targetVector(args);
        const vectorBytes = yield _c.vectorsToBytes(args.vector);
        return {
            targets,
            targetVectors,
            vectors: [base_js_1.Vectors.fromPartial({ type: base_js_1.Vectors_VectorType.VECTOR_TYPE_MULTI_FP32, vectorBytes })],
        };
    }
    throw invalidVectorError;
});
Serialize.targets = (targets) => {
    let combination;
    switch (targets.combination) {
        case 'sum':
            combination = base_search_js_1.CombinationMethod.COMBINATION_METHOD_TYPE_SUM;
            break;
        case 'average':
            combination = base_search_js_1.CombinationMethod.COMBINATION_METHOD_TYPE_AVERAGE;
            break;
        case 'minimum':
            combination = base_search_js_1.CombinationMethod.COMBINATION_METHOD_TYPE_MIN;
            break;
        case 'relative-score':
            combination = base_search_js_1.CombinationMethod.COMBINATION_METHOD_TYPE_RELATIVE_SCORE;
            break;
        case 'manual-weights':
            combination = base_search_js_1.CombinationMethod.COMBINATION_METHOD_TYPE_MANUAL;
            break;
        default:
            throw new Error('Invalid combination method');
    }
    if (targets.weights !== undefined) {
        const weightsForTargets = Object.entries(targets.weights)
            .map(([target, weight]) => {
            return {
                target,
                weight: weight,
            };
        })
            .reduce((acc, { target, weight }) => {
            return Array.isArray(weight)
                ? acc.concat(weight.map((w) => ({ target, weight: w })))
                : acc.concat([{ target, weight }]);
        }, []);
        return {
            combination,
            targetVectors: weightsForTargets.map((w) => w.target),
            weightsForTargets,
        };
    }
    else {
        return {
            combination,
            targetVectors: targets.targetVectors,
            weightsForTargets: [],
        };
    }
};
Serialize.nearVideoSearch = (args) => {
    const { targets, targetVectors } = _c.targetVector(args);
    return base_search_js_1.NearVideoSearch.fromPartial({
        video: args.video,
        certainty: args.certainty,
        distance: args.distance,
        targetVectors,
        targets,
    });
};
Serialize.filtersGRPC = (filters) => {
    const resolveFilters = (filters) => {
        var _d;
        const out = [];
        (_d = filters.filters) === null || _d === void 0 ? void 0 : _d.forEach((val) => out.push(_c.filtersGRPC(val)));
        return out;
    };
    const { value } = filters;
    switch (filters.operator) {
        case 'And':
            return base_js_1.Filters.fromPartial({
                operator: base_js_1.Filters_Operator.OPERATOR_AND,
                filters: resolveFilters(filters),
            });
        case 'Or':
            return base_js_1.Filters.fromPartial({
                operator: base_js_1.Filters_Operator.OPERATOR_OR,
                filters: resolveFilters(filters),
            });
        case 'Not':
            return base_js_1.Filters.fromPartial({
                operator: base_js_1.Filters_Operator.OPERATOR_NOT,
                filters: resolveFilters(filters),
            });
        default:
            return base_js_1.Filters.fromPartial({
                operator: _c.operator(filters.operator),
                target: filters.target,
                valueText: _c.filtersGRPCValueText(value),
                valueTextArray: _c.filtersGRPCValueTextArray(value),
                valueInt: FilterGuards.isInt(value) ? value : undefined,
                valueIntArray: FilterGuards.isIntArray(value) ? { values: value } : undefined,
                valueNumber: FilterGuards.isFloat(value) ? value : undefined,
                valueNumberArray: FilterGuards.isFloatArray(value) ? { values: value } : undefined,
                valueBoolean: FilterGuards.isBoolean(value) ? value : undefined,
                valueBooleanArray: FilterGuards.isBooleanArray(value) ? { values: value } : undefined,
                valueGeo: FilterGuards.isGeoRange(value) ? value : undefined,
            });
    }
};
Serialize.filtersGRPCValueText = (value) => {
    if (FilterGuards.isText(value)) {
        return value;
    }
    else if (FilterGuards.isDate(value)) {
        return value.toISOString();
    }
    else {
        return undefined;
    }
};
Serialize.filtersGRPCValueTextArray = (value) => {
    if (FilterGuards.isTextArray(value)) {
        return { values: value };
    }
    else if (FilterGuards.isDateArray(value)) {
        return { values: value.map((v) => v.toISOString()) };
    }
    else {
        return undefined;
    }
};
Serialize.filterTargetToREST = (target) => {
    if (target.property) {
        return [target.property];
    }
    else if (target.singleTarget) {
        throw new errors_js_1.WeaviateSerializationError('Cannot use Filter.byRef() in the aggregate API currently. Instead use Filter.byRefMultiTarget() and specify the target collection explicitly.');
    }
    else if (target.multiTarget) {
        if (target.multiTarget.target === undefined) {
            throw new errors_js_1.WeaviateSerializationError(`target of multiTarget filter was unexpectedly undefined: ${target}`);
        }
        return [
            target.multiTarget.on,
            target.multiTarget.targetCollection,
            ..._c.filterTargetToREST(target.multiTarget.target),
        ];
    }
    else if (target.count) {
        return [target.count.on];
    }
    else {
        return [];
    }
};
Serialize.filtersREST = (filters) => {
    var _d;
    const { value } = filters;
    if (filters.operator === 'And' || filters.operator === 'Or' || filters.operator === 'Not') {
        return {
            operator: filters.operator,
            operands: (_d = filters.filters) === null || _d === void 0 ? void 0 : _d.map(_c.filtersREST),
        };
    }
    else {
        if (filters.target === undefined) {
            throw new errors_js_1.WeaviateSerializationError(`target of filter was unexpectedly undefined: ${filters}`);
        }
        const out = {
            path: _c.filterTargetToREST(filters.target),
            operator: filters.operator,
        };
        if (FilterGuards.isText(value)) {
            return Object.assign(Object.assign({}, out), { valueText: value });
        }
        else if (FilterGuards.isTextArray(value)) {
            return Object.assign(Object.assign({}, out), { valueTextArray: value });
        }
        else if (FilterGuards.isInt(value)) {
            return Object.assign(Object.assign({}, out), { valueInt: value });
        }
        else if (FilterGuards.isIntArray(value)) {
            return Object.assign(Object.assign({}, out), { valueIntArray: value });
        }
        else if (FilterGuards.isBoolean(value)) {
            return Object.assign(Object.assign({}, out), { valueBoolean: value });
        }
        else if (FilterGuards.isBooleanArray(value)) {
            return Object.assign(Object.assign({}, out), { valueBooleanArray: value });
        }
        else if (FilterGuards.isFloat(value)) {
            return Object.assign(Object.assign({}, out), { valueNumber: value });
        }
        else if (FilterGuards.isFloatArray(value)) {
            return Object.assign(Object.assign({}, out), { valueNumberArray: value });
        }
        else if (FilterGuards.isDate(value)) {
            return Object.assign(Object.assign({}, out), { valueDate: value.toISOString() });
        }
        else if (FilterGuards.isDateArray(value)) {
            return Object.assign(Object.assign({}, out), { valueDateArray: value.map((v) => v.toISOString()) });
        }
        else if (FilterGuards.isGeoRange(value)) {
            return Object.assign(Object.assign({}, out), { valueGeoRange: {
                    geoCoordinates: {
                        latitude: value.latitude,
                        longitude: value.longitude,
                    },
                    distance: {
                        max: value.distance,
                    },
                } });
        }
        else {
            throw new errors_js_1.WeaviateInvalidInputError('Invalid filter value type');
        }
    }
};
Serialize.operator = (operator) => {
    switch (operator) {
        case 'Equal':
            return base_js_1.Filters_Operator.OPERATOR_EQUAL;
        case 'NotEqual':
            return base_js_1.Filters_Operator.OPERATOR_NOT_EQUAL;
        case 'ContainsAny':
            return base_js_1.Filters_Operator.OPERATOR_CONTAINS_ANY;
        case 'ContainsAll':
            return base_js_1.Filters_Operator.OPERATOR_CONTAINS_ALL;
        case 'ContainsNone':
            return base_js_1.Filters_Operator.OPERATOR_CONTAINS_NONE;
        case 'GreaterThan':
            return base_js_1.Filters_Operator.OPERATOR_GREATER_THAN;
        case 'GreaterThanEqual':
            return base_js_1.Filters_Operator.OPERATOR_GREATER_THAN_EQUAL;
        case 'LessThan':
            return base_js_1.Filters_Operator.OPERATOR_LESS_THAN;
        case 'LessThanEqual':
            return base_js_1.Filters_Operator.OPERATOR_LESS_THAN_EQUAL;
        case 'Like':
            return base_js_1.Filters_Operator.OPERATOR_LIKE;
        case 'WithinGeoRange':
            return base_js_1.Filters_Operator.OPERATOR_WITHIN_GEO_RANGE;
        case 'IsNull':
            return base_js_1.Filters_Operator.OPERATOR_IS_NULL;
        default:
            return base_js_1.Filters_Operator.OPERATOR_UNSPECIFIED;
    }
};
Serialize.restProperties = (properties, references) => {
    const parsedProperties = {};
    Object.keys(properties).forEach((key) => {
        const value = properties[key];
        if (DataGuards.isDate(value)) {
            parsedProperties[key] = value.toISOString();
        }
        else if (DataGuards.isDateArray(value)) {
            parsedProperties[key] = value.map((v) => v.toISOString());
        }
        else if (DataGuards.isPhoneNumber(value)) {
            parsedProperties[key] = {
                input: value.number,
                defaultCountry: value.defaultCountry,
            };
        }
        else if (DataGuards.isNestedArray(value)) {
            parsedProperties[key] = value.map((v) => _c.restProperties(v));
        }
        else if (DataGuards.isNested(value)) {
            parsedProperties[key] = _c.restProperties(value);
        }
        else {
            parsedProperties[key] = value;
        }
    });
    if (!references)
        return parsedProperties;
    for (const [key, value] of Object.entries(references)) {
        if (value === undefined) {
            continue;
        }
        if (classes_js_2.ReferenceGuards.isReferenceManager(value)) {
            parsedProperties[key] = value.toBeaconObjs();
        }
        else if (classes_js_2.ReferenceGuards.isUuid(value)) {
            parsedProperties[key] = [(0, utils_js_2.uuidToBeacon)(value)];
        }
        else if (classes_js_2.ReferenceGuards.isMultiTarget(value)) {
            parsedProperties[key] =
                typeof value.uuids === 'string'
                    ? [(0, utils_js_2.uuidToBeacon)(value.uuids, value.targetCollection)]
                    : value.uuids.map((uuid) => (0, utils_js_2.uuidToBeacon)(uuid, value.targetCollection));
        }
        else {
            let out = [];
            value.forEach((v) => {
                if (classes_js_2.ReferenceGuards.isReferenceManager(v)) {
                    out = out.concat(v.toBeaconObjs());
                }
                else if (classes_js_2.ReferenceGuards.isUuid(v)) {
                    out.push((0, utils_js_2.uuidToBeacon)(v));
                }
                else {
                    out = out.concat((classes_js_2.ReferenceGuards.isUuid(v.uuids) ? [v.uuids] : v.uuids).map((uuid) => (0, utils_js_2.uuidToBeacon)(uuid, v.targetCollection)));
                }
            });
            parsedProperties[key] = out;
        }
    }
    return parsedProperties;
};
Serialize.batchProperties = (properties, references) => {
    const multiTarget = [];
    const singleTarget = [];
    const nonRefProperties = {};
    const emptyArray = [];
    const boolArray = [];
    const textArray = [];
    const intArray = [];
    const floatArray = [];
    const objectProperties = [];
    const objectArrayProperties = [];
    const resolveProps = (key, value) => {
        if (DataGuards.isEmptyArray(value)) {
            emptyArray.push(key);
        }
        else if (DataGuards.isBooleanArray(value)) {
            boolArray.push({
                propName: key,
                values: value,
            });
        }
        else if (DataGuards.isDateArray(value)) {
            textArray.push({
                propName: key,
                values: value.map((v) => v.toISOString()),
            });
        }
        else if (DataGuards.isTextArray(value)) {
            textArray.push({
                propName: key,
                values: value,
            });
        }
        else if (DataGuards.isIntArray(value)) {
            intArray.push({
                propName: key,
                values: value,
            });
        }
        else if (DataGuards.isFloatArray(value)) {
            floatArray.push({
                propName: key,
                values: [],
                valuesBytes: new Uint8Array(new Float64Array(value).buffer), // is double in proto => f64 in go
            });
        }
        else if (DataGuards.isDate(value)) {
            nonRefProperties[key] = value.toISOString();
        }
        else if (DataGuards.isPhoneNumber(value)) {
            nonRefProperties[key] = {
                input: value.number,
                defaultCountry: value.defaultCountry,
            };
        }
        else if (DataGuards.isGeoCoordinate(value)) {
            nonRefProperties[key] = value;
        }
        else if (DataGuards.isNestedArray(value)) {
            objectArrayProperties.push({
                propName: key,
                values: value.map((v) => base_js_1.ObjectPropertiesValue.fromPartial(_c.batchProperties(v))),
            });
        }
        else if (DataGuards.isNested(value)) {
            const parsed = _c.batchProperties(value);
            objectProperties.push({
                propName: key,
                value: base_js_1.ObjectPropertiesValue.fromPartial(parsed),
            });
        }
        else {
            nonRefProperties[key] = value;
        }
    };
    const resolveRefs = (key, value) => {
        if (classes_js_2.ReferenceGuards.isReferenceManager(value)) {
            if (value.isMultiTarget()) {
                multiTarget.push({
                    propName: key,
                    targetCollection: value.targetCollection,
                    uuids: value.toBeaconStrings(),
                });
            }
            else {
                singleTarget.push({
                    propName: key,
                    uuids: value.toBeaconStrings(),
                });
            }
        }
        else if (classes_js_2.ReferenceGuards.isUuid(value)) {
            singleTarget.push({
                propName: key,
                uuids: [value],
            });
        }
        else if (classes_js_2.ReferenceGuards.isMultiTarget(value)) {
            multiTarget.push({
                propName: key,
                targetCollection: value.targetCollection,
                uuids: typeof value.uuids === 'string' ? [value.uuids] : value.uuids,
            });
        }
        else {
            value.forEach((v) => resolveRefs(key, v));
        }
    };
    if (properties) {
        Object.entries(properties).forEach(([key, value]) => resolveProps(key, value));
    }
    if (references) {
        Object.entries(references).forEach(([key, value]) => resolveRefs(key, value));
    }
    return {
        nonRefProperties: nonRefProperties,
        multiTargetRefProps: multiTarget,
        singleTargetRefProps: singleTarget,
        textArrayProperties: textArray,
        intArrayProperties: intArray,
        numberArrayProperties: floatArray,
        booleanArrayProperties: boolArray,
        objectProperties: objectProperties,
        objectArrayProperties: objectArrayProperties,
        emptyListProps: emptyArray,
    };
};
Serialize.batchObjects = (collection, objects, requiresInsertFix, tenant) => {
    const objs = [];
    const batch = [];
    const iterate = (index) => {
        // This allows the potentially CPU-intensive work to be done in chunks
        // releasing control to the event loop after every object so that other
        // events can be processed without blocking completely.
        if (index < objects.length) {
            setTimeout(() => iterate(index + 1));
        }
        else {
            return;
        }
        const object = objects[index];
        const obj = DataGuards.isDataObject(object)
            ? object
            : { id: undefined, properties: object, references: undefined, vectors: undefined };
        let vectorBytes;
        let vectors;
        if (obj.vectors !== undefined && !Array.isArray(obj.vectors)) {
            vectors = Object.entries(obj.vectors).flatMap(([k, v]) => utils_js_1.NearVectorInputGuards.is1D(v)
                ? [
                    base_js_1.Vectors.fromPartial({
                        vectorBytes: _c.vectorToBytes(v),
                        name: k,
                    }),
                ]
                : v.map((vv) => base_js_1.Vectors.fromPartial({
                    vectorBytes: _c.vectorToBytes(vv),
                    name: k,
                })));
        }
        else if (Array.isArray(obj.vectors) && requiresInsertFix) {
            vectors = [
                base_js_1.Vectors.fromPartial({
                    vectorBytes: _c.vectorToBytes(obj.vectors),
                    name: 'default',
                }),
            ];
            vectorBytes = _c.vectorToBytes(obj.vectors);
            // required in case collection was made with <1.24.0 and has since been migrated to >=1.24.0
        }
        else if (obj.vectors !== undefined) {
            vectorBytes = _c.vectorToBytes(obj.vectors);
        }
        objs.push(batch_js_1.BatchObject.fromPartial({
            collection: collection,
            properties: _c.batchProperties(obj.properties, obj.references),
            tenant: tenant,
            uuid: obj.id ? obj.id : (0, uuid_1.v4)(),
            vectorBytes,
            vectors,
        }));
        batch.push(Object.assign(Object.assign({}, obj), { collection: collection, tenant: tenant }));
    };
    const waitFor = () => {
        const poll = (resolve) => {
            if (objs.length < objects.length) {
                setTimeout(() => poll(resolve), 500);
            }
            else {
                resolve(null);
            }
        };
        return new Promise(poll);
    };
    iterate(0);
    return waitFor().then(() => {
        return { batch: batch, mapped: objs };
    });
};
