"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithDefault = exports.MultiVectorEncodingGuards = exports.VectorIndexGuards = exports.QuantizerGuards = void 0;
class QuantizerGuards {
    static isPQCreate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'pq';
    }
    static isPQUpdate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'pq';
    }
    static isBQCreate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'bq';
    }
    static isBQUpdate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'bq';
    }
    static isSQCreate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'sq';
    }
    static isSQUpdate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'sq';
    }
    static isRQCreate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'rq';
    }
    static isRQUpdate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'rq';
    }
    static isUncompressedCreate(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'none';
    }
}
exports.QuantizerGuards = QuantizerGuards;
class VectorIndexGuards {
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
exports.VectorIndexGuards = VectorIndexGuards;
class MultiVectorEncodingGuards {
    static isMuvera(config) {
        return (config === null || config === void 0 ? void 0 : config.type) === 'muvera';
    }
}
exports.MultiVectorEncodingGuards = MultiVectorEncodingGuards;
function parseWithDefault(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
}
exports.parseWithDefault = parseWithDefault;
