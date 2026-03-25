"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Graph_instances, _Graph_client, _Graph_name, _Graph_metadata, _Graph_setMetadataPromise, _Graph_updateMetadata, _Graph_setMetadata, _Graph_cleanMetadataArray, _Graph_getMetadata, _Graph_getMetadataAsync, _Graph_parseReply, _Graph_parseValue, _Graph_parseEdge, _Graph_parseNode, _Graph_parseProperties;
Object.defineProperty(exports, "__esModule", { value: true });
// https://github.com/RedisGraph/RedisGraph/blob/master/src/resultset/formatters/resultset_formatter.h#L20
var GraphValueTypes;
(function (GraphValueTypes) {
    GraphValueTypes[GraphValueTypes["UNKNOWN"] = 0] = "UNKNOWN";
    GraphValueTypes[GraphValueTypes["NULL"] = 1] = "NULL";
    GraphValueTypes[GraphValueTypes["STRING"] = 2] = "STRING";
    GraphValueTypes[GraphValueTypes["INTEGER"] = 3] = "INTEGER";
    GraphValueTypes[GraphValueTypes["BOOLEAN"] = 4] = "BOOLEAN";
    GraphValueTypes[GraphValueTypes["DOUBLE"] = 5] = "DOUBLE";
    GraphValueTypes[GraphValueTypes["ARRAY"] = 6] = "ARRAY";
    GraphValueTypes[GraphValueTypes["EDGE"] = 7] = "EDGE";
    GraphValueTypes[GraphValueTypes["NODE"] = 8] = "NODE";
    GraphValueTypes[GraphValueTypes["PATH"] = 9] = "PATH";
    GraphValueTypes[GraphValueTypes["MAP"] = 10] = "MAP";
    GraphValueTypes[GraphValueTypes["POINT"] = 11] = "POINT";
})(GraphValueTypes || (GraphValueTypes = {}));
class Graph {
    constructor(client, name) {
        _Graph_instances.add(this);
        _Graph_client.set(this, void 0);
        _Graph_name.set(this, void 0);
        _Graph_metadata.set(this, void 0);
        _Graph_setMetadataPromise.set(this, void 0);
        __classPrivateFieldSet(this, _Graph_client, client, "f");
        __classPrivateFieldSet(this, _Graph_name, name, "f");
    }
    async query(query, options) {
        return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseReply).call(this, await __classPrivateFieldGet(this, _Graph_client, "f").graph.query(__classPrivateFieldGet(this, _Graph_name, "f"), query, options, true));
    }
    async roQuery(query, options) {
        return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseReply).call(this, await __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), query, options, true));
    }
}
_Graph_client = new WeakMap(), _Graph_name = new WeakMap(), _Graph_metadata = new WeakMap(), _Graph_setMetadataPromise = new WeakMap(), _Graph_instances = new WeakSet(), _Graph_updateMetadata = function _Graph_updateMetadata() {
    __classPrivateFieldSet(this, _Graph_setMetadataPromise, __classPrivateFieldGet(this, _Graph_setMetadataPromise, "f") ?? __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_setMetadata).call(this)
        .finally(() => __classPrivateFieldSet(this, _Graph_setMetadataPromise, undefined, "f")), "f");
    return __classPrivateFieldGet(this, _Graph_setMetadataPromise, "f");
}, _Graph_setMetadata = 
// DO NOT use directly, use #updateMetadata instead
async function _Graph_setMetadata() {
    const [labels, relationshipTypes, propertyKeys] = await Promise.all([
        __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), 'CALL db.labels()'),
        __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), 'CALL db.relationshipTypes()'),
        __classPrivateFieldGet(this, _Graph_client, "f").graph.roQuery(__classPrivateFieldGet(this, _Graph_name, "f"), 'CALL db.propertyKeys()')
    ]);
    __classPrivateFieldSet(this, _Graph_metadata, {
        labels: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_cleanMetadataArray).call(this, labels.data),
        relationshipTypes: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_cleanMetadataArray).call(this, relationshipTypes.data),
        propertyKeys: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_cleanMetadataArray).call(this, propertyKeys.data)
    }, "f");
    return __classPrivateFieldGet(this, _Graph_metadata, "f");
}, _Graph_cleanMetadataArray = function _Graph_cleanMetadataArray(arr) {
    return arr.map(([value]) => value);
}, _Graph_getMetadata = function _Graph_getMetadata(key, id) {
    return __classPrivateFieldGet(this, _Graph_metadata, "f")?.[key][id] ?? __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadataAsync).call(this, key, id);
}, _Graph_getMetadataAsync = 
// DO NOT use directly, use #getMetadata instead
async function _Graph_getMetadataAsync(key, id) {
    const value = (await __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_updateMetadata).call(this))[key][id];
    if (value === undefined)
        throw new Error(`Cannot find value from ${key}[${id}]`);
    return value;
}, _Graph_parseReply = async function _Graph_parseReply(reply) {
    if (!reply.data)
        return reply;
    const promises = [], parsed = {
        metadata: reply.metadata,
        data: reply.data.map((row) => {
            const data = {};
            for (let i = 0; i < row.length; i++) {
                data[reply.headers[i][1]] = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue).call(this, row[i], promises);
            }
            return data;
        })
    };
    if (promises.length)
        await Promise.all(promises);
    return parsed;
}, _Graph_parseValue = function _Graph_parseValue([valueType, value], promises) {
    switch (valueType) {
        case GraphValueTypes.NULL:
            return null;
        case GraphValueTypes.STRING:
        case GraphValueTypes.INTEGER:
            return value;
        case GraphValueTypes.BOOLEAN:
            return value === 'true';
        case GraphValueTypes.DOUBLE:
            return parseFloat(value);
        case GraphValueTypes.ARRAY:
            return value.map(x => __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue).call(this, x, promises));
        case GraphValueTypes.EDGE:
            return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseEdge).call(this, value, promises);
        case GraphValueTypes.NODE:
            return __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseNode).call(this, value, promises);
        case GraphValueTypes.PATH:
            return {
                nodes: value[0][1].map(([, node]) => __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseNode).call(this, node, promises)),
                edges: value[1][1].map(([, edge]) => __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseEdge).call(this, edge, promises))
            };
        case GraphValueTypes.MAP:
            const map = {};
            for (let i = 0; i < value.length; i++) {
                map[value[i++]] = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue).call(this, value[i], promises);
            }
            return map;
        case GraphValueTypes.POINT:
            return {
                latitude: parseFloat(value[0]),
                longitude: parseFloat(value[1])
            };
        default:
            throw new Error(`unknown scalar type: ${valueType}`);
    }
}, _Graph_parseEdge = function _Graph_parseEdge([id, relationshipTypeId, sourceId, destinationId, properties], promises) {
    const edge = {
        id,
        sourceId,
        destinationId,
        properties: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseProperties).call(this, properties, promises)
    };
    const relationshipType = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadata).call(this, 'relationshipTypes', relationshipTypeId);
    if (relationshipType instanceof Promise) {
        promises.push(relationshipType.then(value => edge.relationshipType = value));
    }
    else {
        edge.relationshipType = relationshipType;
    }
    return edge;
}, _Graph_parseNode = function _Graph_parseNode([id, labelIds, properties], promises) {
    const labels = new Array(labelIds.length);
    for (let i = 0; i < labelIds.length; i++) {
        const value = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadata).call(this, 'labels', labelIds[i]);
        if (value instanceof Promise) {
            promises.push(value.then(value => labels[i] = value));
        }
        else {
            labels[i] = value;
        }
    }
    return {
        id,
        labels,
        properties: __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseProperties).call(this, properties, promises)
    };
}, _Graph_parseProperties = function _Graph_parseProperties(raw, promises) {
    const parsed = {};
    for (const [id, type, value] of raw) {
        const parsedValue = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_parseValue).call(this, [type, value], promises), key = __classPrivateFieldGet(this, _Graph_instances, "m", _Graph_getMetadata).call(this, 'propertyKeys', id);
        if (key instanceof Promise) {
            promises.push(key.then(key => parsed[key] = parsedValue));
        }
        else {
            parsed[key] = parsedValue;
        }
    }
    return parsed;
};
exports.default = Graph;
