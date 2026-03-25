"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_js_1 = require("../proto/v1/base.js");
class Base {
    constructor(connection, collection, metadata, timeout, consistencyLevel, tenant) {
        this.sendWithTimeout = (send) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);
            return send(controller.signal).finally(() => clearTimeout(timeoutId));
        };
        this.connection = connection;
        this.collection = collection;
        this.metadata = metadata;
        this.timeout = timeout;
        this.consistencyLevel = this.mapConsistencyLevel(consistencyLevel);
        this.tenant = tenant;
    }
    mapConsistencyLevel(consistencyLevel) {
        switch (consistencyLevel) {
            case 'ALL':
                return base_js_1.ConsistencyLevel.CONSISTENCY_LEVEL_ALL;
            case 'QUORUM':
                return base_js_1.ConsistencyLevel.CONSISTENCY_LEVEL_QUORUM;
            case 'ONE':
                return base_js_1.ConsistencyLevel.CONSISTENCY_LEVEL_ONE;
            default:
                return base_js_1.ConsistencyLevel.CONSISTENCY_LEVEL_UNSPECIFIED;
        }
    }
}
exports.default = Base;
