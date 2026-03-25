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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deserialize = void 0;
const uuid_1 = require("uuid");
const errors_js_1 = require("../../errors.js");
const base_js_1 = require("../../proto/v1/base.js");
const tenants_js_1 = require("../../proto/v1/tenants.js");
const yield_js_1 = require("../../utils/yield.js");
const utils_js_1 = require("../references/utils.js");
const UINT16LEN = 2;
const UINT32LEN = 4;
class Deserialize {
    static use(support) {
        return Promise.resolve(new Deserialize());
    }
    static aggregateBoolean(aggregation) {
        return {
            count: aggregation.count,
            percentageFalse: aggregation.percentageFalse,
            percentageTrue: aggregation.percentageTrue,
            totalFalse: aggregation.totalFalse,
            totalTrue: aggregation.totalTrue,
        };
    }
    static aggregateDate(aggregation) {
        const parse = (date) => (date !== undefined ? date : undefined);
        return {
            count: aggregation.count,
            maximum: parse(aggregation.maximum),
            median: parse(aggregation.median),
            minimum: parse(aggregation.minimum),
            mode: parse(aggregation.mode),
        };
    }
    static aggregateInt(aggregation) {
        return {
            count: aggregation.count,
            maximum: aggregation.maximum,
            mean: aggregation.mean,
            median: aggregation.median,
            minimum: aggregation.minimum,
            mode: aggregation.mode,
            sum: aggregation.sum,
        };
    }
    static aggregateNumber(aggregation) {
        return {
            count: aggregation.count,
            maximum: aggregation.maximum,
            mean: aggregation.mean,
            median: aggregation.median,
            minimum: aggregation.minimum,
            mode: aggregation.mode,
            sum: aggregation.sum,
        };
    }
    static aggregateText(aggregation) {
        var _a;
        return {
            count: aggregation.count,
            topOccurrences: (_a = aggregation.topOccurences) === null || _a === void 0 ? void 0 : _a.items.map((occurrence) => {
                return {
                    occurs: occurrence.occurs,
                    value: occurrence.value,
                };
            }),
        };
    }
    static mapAggregate(aggregation) {
        if (aggregation.boolean !== undefined)
            return Deserialize.aggregateBoolean(aggregation.boolean);
        if (aggregation.date !== undefined)
            return Deserialize.aggregateDate(aggregation.date);
        if (aggregation.int !== undefined)
            return Deserialize.aggregateInt(aggregation.int);
        if (aggregation.number !== undefined)
            return Deserialize.aggregateNumber(aggregation.number);
        // if (aggregation.reference !== undefined) return aggregation.reference;
        if (aggregation.text !== undefined)
            return Deserialize.aggregateText(aggregation.text);
        throw new errors_js_1.WeaviateDeserializationError(`Unknown aggregation type: ${aggregation}`);
    }
    static aggregations(aggregations) {
        return aggregations
            ? Object.fromEntries(aggregations.aggregations.map((aggregation) => [
                aggregation.property,
                Deserialize.mapAggregate(aggregation),
            ]))
            : {};
    }
    static aggregate(reply) {
        if (reply.singleResult === undefined) {
            throw new errors_js_1.WeaviateDeserializationError('No single result in aggregate response');
        }
        return {
            totalCount: reply.singleResult.objectsCount,
            properties: Deserialize.aggregations(reply.singleResult.aggregations),
        };
    }
    static aggregateGroupBy(reply) {
        if (reply.groupedResults === undefined)
            throw new errors_js_1.WeaviateDeserializationError('No grouped results in aggregate response');
        const parse = (groupedBy) => {
            if (groupedBy === undefined)
                throw new errors_js_1.WeaviateDeserializationError('No groupedBy in aggregate response');
            let value;
            if (groupedBy.boolean !== undefined)
                value = groupedBy.boolean;
            else if (groupedBy.booleans !== undefined)
                value = groupedBy.booleans.values;
            else if (groupedBy.geo !== undefined)
                value = groupedBy.geo;
            else if (groupedBy.int !== undefined)
                value = groupedBy.int;
            else if (groupedBy.ints !== undefined)
                value = groupedBy.ints.values;
            else if (groupedBy.number !== undefined)
                value = groupedBy.number;
            else if (groupedBy.numbers !== undefined)
                value = groupedBy.numbers.values;
            else if (groupedBy.text !== undefined)
                value = groupedBy.text;
            else if (groupedBy.texts !== undefined)
                value = groupedBy.texts.values;
            else {
                console.warn(`Unknown groupBy type: ${JSON.stringify(groupedBy, null, 2)}`);
                value = '';
            }
            return {
                prop: groupedBy.path[0],
                value,
            };
        };
        return reply.groupedResults.groups.map((group) => {
            return {
                totalCount: group.objectsCount,
                groupedBy: parse(group.groupedBy),
                properties: Deserialize.aggregations(group.aggregations),
            };
        });
    }
    query(reply) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                objects: yield Promise.all(reply.results.map((result) => __awaiter(this, void 0, void 0, function* () {
                    return {
                        metadata: Deserialize.metadata(result.metadata),
                        properties: this.properties(result.properties),
                        references: yield this.references(result.properties),
                        uuid: Deserialize.uuid(result.metadata),
                        vectors: yield Deserialize.vectors(result.metadata),
                    };
                }))),
            };
        });
    }
    generate(reply) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            return {
                objects: yield Promise.all(reply.results.map((result) => __awaiter(this, void 0, void 0, function* () {
                    var _c, _d, _e, _f;
                    return ({
                        generated: ((_c = result.metadata) === null || _c === void 0 ? void 0 : _c.generativePresent)
                            ? (_d = result.metadata) === null || _d === void 0 ? void 0 : _d.generative
                            : result.generative
                                ? result.generative.values[0].result
                                : undefined,
                        generative: result.generative
                            ? {
                                text: result.generative.values[0].result,
                                debug: result.generative.values[0].debug,
                                metadata: result.generative.values[0].metadata,
                            }
                            : ((_e = result.metadata) === null || _e === void 0 ? void 0 : _e.generativePresent)
                                ? {
                                    text: (_f = result.metadata) === null || _f === void 0 ? void 0 : _f.generative,
                                }
                                : undefined,
                        metadata: Deserialize.metadata(result.metadata),
                        properties: this.properties(result.properties),
                        references: yield this.references(result.properties),
                        uuid: Deserialize.uuid(result.metadata),
                        vectors: yield Deserialize.vectors(result.metadata),
                    });
                }))),
                generated: reply.generativeGroupedResult !== ''
                    ? reply.generativeGroupedResult
                    : reply.generativeGroupedResults
                        ? reply.generativeGroupedResults.values[0].result
                        : undefined,
                generative: reply.generativeGroupedResults
                    ? {
                        text: (_a = reply.generativeGroupedResults) === null || _a === void 0 ? void 0 : _a.values[0].result,
                        metadata: (_b = reply.generativeGroupedResults) === null || _b === void 0 ? void 0 : _b.values[0].metadata,
                    }
                    : reply.generativeGroupedResult !== ''
                        ? {
                            text: reply.generativeGroupedResult,
                        }
                        : undefined,
            };
        });
    }
    queryGroupBy(reply) {
        return __awaiter(this, void 0, void 0, function* () {
            const objects = [];
            const groups = {};
            for (const result of reply.groupByResults) {
                // eslint-disable-next-line no-await-in-loop
                const objs = yield Promise.all(result.objects.map((object) => __awaiter(this, void 0, void 0, function* () {
                    return {
                        belongsToGroup: result.name,
                        metadata: Deserialize.metadata(object.metadata),
                        properties: this.properties(object.properties),
                        references: yield this.references(object.properties),
                        uuid: Deserialize.uuid(object.metadata),
                        vectors: yield Deserialize.vectors(object.metadata),
                    };
                })));
                groups[result.name] = {
                    maxDistance: result.maxDistance,
                    minDistance: result.minDistance,
                    name: result.name,
                    numberOfObjects: result.numberOfObjects,
                    objects: objs,
                };
                objects.push(...objs);
            }
            return {
                objects: objects,
                groups: groups,
            };
        });
    }
    generateGroupBy(reply) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const objects = [];
            const groups = {};
            for (const result of reply.groupByResults) {
                // eslint-disable-next-line no-await-in-loop
                const objs = yield Promise.all(result.objects.map((object) => __awaiter(this, void 0, void 0, function* () {
                    return {
                        belongsToGroup: result.name,
                        metadata: Deserialize.metadata(object.metadata),
                        properties: this.properties(object.properties),
                        references: yield this.references(object.properties),
                        uuid: Deserialize.uuid(object.metadata),
                        vectors: yield Deserialize.vectors(object.metadata),
                    };
                })));
                groups[result.name] = {
                    maxDistance: result.maxDistance,
                    minDistance: result.minDistance,
                    name: result.name,
                    numberOfObjects: result.numberOfObjects,
                    objects: objs,
                    generated: (_a = result.generative) === null || _a === void 0 ? void 0 : _a.result,
                };
                objects.push(...objs);
            }
            return {
                objects: objects,
                groups: groups,
                generated: reply.generativeGroupedResult,
            };
        });
    }
    properties(properties) {
        if (!properties)
            return {};
        return this.objectProperties(properties.nonRefProps);
    }
    references(properties) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!properties)
                return undefined;
            if (properties.refProps.length === 0)
                return properties.refPropsRequested ? {} : undefined;
            const out = {};
            for (const property of properties.refProps) {
                const uuids = [];
                out[property.propName] = (0, utils_js_1.referenceFromObjects)(
                // eslint-disable-next-line no-await-in-loop
                yield Promise.all(property.properties.map((property) => __awaiter(this, void 0, void 0, function* () {
                    const uuid = Deserialize.uuid(property.metadata);
                    uuids.push(uuid);
                    return {
                        metadata: Deserialize.metadata(property.metadata),
                        properties: this.properties(property),
                        references: yield this.references(property),
                        uuid: uuid,
                        vectors: yield Deserialize.vectors(property.metadata),
                    };
                }))), property.properties.length > 0 ? property.properties[0].targetCollection : '', uuids);
            }
            return out;
        });
    }
    parsePropertyValue(value) {
        if (value.boolValue !== undefined)
            return value.boolValue;
        if (value.dateValue !== undefined)
            return new Date(value.dateValue);
        if (value.intValue !== undefined)
            return value.intValue;
        if (value.listValue !== undefined)
            return this.parseListValue(value.listValue);
        if (value.numberValue !== undefined)
            return value.numberValue;
        if (value.objectValue !== undefined)
            return this.objectProperties(value.objectValue);
        if (value.textValue !== undefined)
            return value.textValue;
        if (value.uuidValue !== undefined)
            return value.uuidValue;
        if (value.blobValue !== undefined)
            return value.blobValue;
        if (value.geoValue !== undefined)
            return value.geoValue;
        if (value.phoneValue !== undefined)
            return value.phoneValue;
        if (value.nullValue !== undefined)
            return undefined;
        throw new errors_js_1.WeaviateDeserializationError(`Unknown value type: ${JSON.stringify(value, null, 2)}`);
    }
    parseListValue(value) {
        if (value.boolValues !== undefined)
            return value.boolValues.values;
        if (value.dateValues !== undefined)
            return value.dateValues.values.map((date) => new Date(date));
        if (value.intValues !== undefined)
            return Deserialize.intsFromBytes(value.intValues.values);
        if (value.numberValues !== undefined)
            return Deserialize.numbersFromBytes(value.numberValues.values);
        if (value.objectValues !== undefined)
            return value.objectValues.values.map((v) => this.objectProperties(v));
        if (value.textValues !== undefined)
            return value.textValues.values;
        if (value.uuidValues !== undefined)
            return value.uuidValues.values;
        throw new Error(`Unknown list value type: ${JSON.stringify(value, null, 2)}`);
    }
    objectProperties(properties) {
        const out = {};
        if (properties) {
            Object.entries(properties.fields).forEach(([key, value]) => {
                out[key] = this.parsePropertyValue(value);
            });
        }
        return out;
    }
    static metadata(metadata) {
        const out = {};
        if (!metadata)
            return undefined;
        if (metadata.creationTimeUnixPresent)
            out.creationTime = new Date(metadata.creationTimeUnix);
        if (metadata.lastUpdateTimeUnixPresent)
            out.updateTime = new Date(metadata.lastUpdateTimeUnix);
        if (metadata.distancePresent)
            out.distance = metadata.distance;
        if (metadata.certaintyPresent)
            out.certainty = metadata.certainty;
        if (metadata.scorePresent)
            out.score = metadata.score;
        if (metadata.explainScorePresent)
            out.explainScore = metadata.explainScore;
        if (metadata.rerankScorePresent)
            out.rerankScore = metadata.rerankScore;
        if (metadata.isConsistent)
            out.isConsistent = metadata.isConsistent;
        return out;
    }
    static uuid(metadata) {
        if (!metadata || !(metadata.id.length > 0))
            throw new errors_js_1.WeaviateDeserializationError('No uuid returned from server');
        return metadata.id;
    }
    /**
     * Convert an Uint8Array into a 2D vector array.
     *
     * Defined as an async method so that control can be relinquished back to the event loop on each outer loop for large vectors.
     */
    static vectorsFromBytes(bytes) {
        const dimOffset = UINT16LEN;
        const dimBytes = Buffer.from(bytes.slice(0, dimOffset));
        const vectorDimension = dimBytes.readUInt16LE(0);
        const vecByteLength = UINT32LEN * vectorDimension;
        const howMany = (bytes.byteLength - dimOffset) / vecByteLength;
        return Promise.all(Array(howMany)
            .fill(0)
            .map((_, i) => (0, yield_js_1.yieldToEventLoop)().then(() => Deserialize.vectorFromBytes(bytes.slice(dimOffset + i * vecByteLength, dimOffset + (i + 1) * vecByteLength)))));
    }
    static vectorFromBytes(bytes) {
        const buffer = Buffer.from(bytes);
        const view = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4); // vector is float32 in weaviate
        return Array.from(view);
    }
    static intsFromBytes(bytes) {
        const buffer = Buffer.from(bytes);
        const view = new BigInt64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8); // ints are float64 in weaviate
        return Array.from(view).map(Number);
    }
    static numbersFromBytes(bytes) {
        const buffer = Buffer.from(bytes);
        const view = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8); // numbers are float64 in weaviate
        return Array.from(view);
    }
    static vectors(metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!metadata)
                return {};
            if (metadata.vectorBytes.length === 0 && metadata.vector.length === 0 && metadata.vectors.length === 0)
                return {};
            if (metadata.vectorBytes.length > 0)
                return { default: Deserialize.vectorFromBytes(metadata.vectorBytes) };
            return Object.fromEntries(yield Promise.all(metadata.vectors.map((vector) => __awaiter(this, void 0, void 0, function* () {
                return [
                    vector.name,
                    vector.type === base_js_1.Vectors_VectorType.VECTOR_TYPE_MULTI_FP32
                        ? yield Deserialize.vectorsFromBytes(vector.vectorBytes)
                        : Deserialize.vectorFromBytes(vector.vectorBytes),
                ];
            }))));
        });
    }
    static batchObjects(reply, originalObjs, mappedObjs, elapsed) {
        const allResponses = [];
        const errors = {};
        const successes = {};
        const batchErrors = {};
        reply.errors.forEach((error) => {
            batchErrors[error.index] = error.error;
        });
        for (const [index, object] of originalObjs.entries()) {
            if (index in batchErrors) {
                const error = {
                    message: batchErrors[index],
                    object: object,
                    originalUuid: object.id,
                };
                errors[index] = error;
                allResponses[index] = error;
            }
            else {
                const mappedObj = mappedObjs[index];
                successes[index] = mappedObj.uuid;
                allResponses[index] = mappedObj.uuid;
            }
        }
        return {
            uuids: successes,
            errors: errors,
            hasErrors: reply.errors.length > 0,
            allResponses: allResponses,
            elapsedSeconds: elapsed,
        };
    }
    static deleteMany(reply, verbose) {
        return Object.assign(Object.assign({}, reply), { objects: verbose
                ? reply.objects.map((obj) => {
                    return {
                        id: (0, uuid_1.stringify)(obj.uuid),
                        successful: obj.successful,
                        error: obj.error,
                    };
                })
                : undefined });
    }
    static activityStatusGRPC(status) {
        switch (status) {
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_COLD:
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_INACTIVE:
                return 'INACTIVE';
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_HOT:
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_ACTIVE:
                return 'ACTIVE';
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_FROZEN:
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_OFFLOADED:
                return 'OFFLOADED';
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_FREEZING:
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_OFFLOADING:
                return 'OFFLOADING';
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_UNFREEZING:
            case tenants_js_1.TenantActivityStatus.TENANT_ACTIVITY_STATUS_ONLOADING:
                return 'ONLOADING';
            default:
                throw new Error(`Unsupported tenant activity status: ${status}`);
        }
    }
    static activityStatusREST(status) {
        switch (status) {
            case 'COLD':
                return 'INACTIVE';
            case 'HOT':
                return 'ACTIVE';
            case 'FROZEN':
                return 'OFFLOADED';
            case 'FREEZING':
                return 'OFFLOADING';
            case 'UNFREEZING':
                return 'ONLOADING';
            case undefined:
                return 'ACTIVE';
            default:
                return status;
        }
    }
    static tenantsGet(reply) {
        const tenants = {};
        reply.tenants.forEach((t) => {
            tenants[t.name] = {
                name: t.name,
                activityStatus: Deserialize.activityStatusGRPC(t.activityStatus),
            };
        });
        return tenants;
    }
}
exports.Deserialize = Deserialize;
