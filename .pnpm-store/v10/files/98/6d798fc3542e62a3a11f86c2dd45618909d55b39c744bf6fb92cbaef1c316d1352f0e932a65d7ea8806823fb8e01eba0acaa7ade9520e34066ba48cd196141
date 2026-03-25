"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionName = exports.weightSrvRecords = exports.groupSrvRecords = exports.getUniqueHostnamesFromOptions = exports.normalizeNodeOptions = exports.nodeKeyToRedisOptions = exports.getNodeKey = void 0;
const utils_1 = require("../utils");
const net_1 = require("net");
function getNodeKey(node) {
    node.port = node.port || 6379;
    node.host = node.host || "127.0.0.1";
    return node.host + ":" + node.port;
}
exports.getNodeKey = getNodeKey;
function nodeKeyToRedisOptions(nodeKey) {
    const portIndex = nodeKey.lastIndexOf(":");
    if (portIndex === -1) {
        throw new Error(`Invalid node key ${nodeKey}`);
    }
    return {
        host: nodeKey.slice(0, portIndex),
        port: Number(nodeKey.slice(portIndex + 1)),
    };
}
exports.nodeKeyToRedisOptions = nodeKeyToRedisOptions;
function normalizeNodeOptions(nodes) {
    return nodes.map((node) => {
        const options = {};
        if (typeof node === "object") {
            Object.assign(options, node);
        }
        else if (typeof node === "string") {
            Object.assign(options, (0, utils_1.parseURL)(node));
        }
        else if (typeof node === "number") {
            options.port = node;
        }
        else {
            throw new Error("Invalid argument " + node);
        }
        if (typeof options.port === "string") {
            options.port = parseInt(options.port, 10);
        }
        // Cluster mode only support db 0
        delete options.db;
        if (!options.port) {
            options.port = 6379;
        }
        if (!options.host) {
            options.host = "127.0.0.1";
        }
        return (0, utils_1.resolveTLSProfile)(options);
    });
}
exports.normalizeNodeOptions = normalizeNodeOptions;
function getUniqueHostnamesFromOptions(nodes) {
    const uniqueHostsMap = {};
    nodes.forEach((node) => {
        uniqueHostsMap[node.host] = true;
    });
    return Object.keys(uniqueHostsMap).filter((host) => !(0, net_1.isIP)(host));
}
exports.getUniqueHostnamesFromOptions = getUniqueHostnamesFromOptions;
function groupSrvRecords(records) {
    const recordsByPriority = {};
    for (const record of records) {
        if (!recordsByPriority.hasOwnProperty(record.priority)) {
            recordsByPriority[record.priority] = {
                totalWeight: record.weight,
                records: [record],
            };
        }
        else {
            recordsByPriority[record.priority].totalWeight += record.weight;
            recordsByPriority[record.priority].records.push(record);
        }
    }
    return recordsByPriority;
}
exports.groupSrvRecords = groupSrvRecords;
function weightSrvRecords(recordsGroup) {
    if (recordsGroup.records.length === 1) {
        recordsGroup.totalWeight = 0;
        return recordsGroup.records.shift();
    }
    // + `recordsGroup.records.length` to support `weight` 0
    const random = Math.floor(Math.random() * (recordsGroup.totalWeight + recordsGroup.records.length));
    let total = 0;
    for (const [i, record] of recordsGroup.records.entries()) {
        total += 1 + record.weight;
        if (total > random) {
            recordsGroup.totalWeight -= record.weight;
            recordsGroup.records.splice(i, 1);
            return record;
        }
    }
}
exports.weightSrvRecords = weightSrvRecords;
function getConnectionName(component, nodeConnectionName) {
    const prefix = `ioredis-cluster(${component})`;
    return nodeConnectionName ? `${prefix}:${nodeConnectionName}` : prefix;
}
exports.getConnectionName = getConnectionName;
