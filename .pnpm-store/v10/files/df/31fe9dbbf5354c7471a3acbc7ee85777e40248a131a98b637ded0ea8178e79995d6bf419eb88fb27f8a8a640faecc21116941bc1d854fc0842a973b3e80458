"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bm25Operator = exports.TargetVectorInputGuards = exports.ArrayInputGuards = exports.NearVectorInputGuards = void 0;
class NearVectorInputGuards {
    static is1D(input) {
        return Array.isArray(input) && input.length > 0 && !Array.isArray(input[0]);
    }
    static is2D(input) {
        return Array.isArray(input) && input.length > 0 && Array.isArray(input[0]) && input[0].length > 0;
    }
    static isObject(input) {
        return !Array.isArray(input);
    }
    static isListOf1D(input) {
        const i = input;
        return !Array.isArray(input) && i.kind === 'listOfVectors' && i.dimensionality == '1D';
    }
    static isListOf2D(input) {
        const i = input;
        return !Array.isArray(input) && i.kind === 'listOfVectors' && i.dimensionality == '2D';
    }
}
exports.NearVectorInputGuards = NearVectorInputGuards;
class ArrayInputGuards {
    static is1DArray(input) {
        return Array.isArray(input) && input.length > 0 && !Array.isArray(input[0]);
    }
    static is2DArray(input) {
        return Array.isArray(input) && input.length > 0 && Array.isArray(input[0]);
    }
}
exports.ArrayInputGuards = ArrayInputGuards;
class TargetVectorInputGuards {
    static isSingle(input) {
        return typeof input === 'string';
    }
    static isMulti(input) {
        return Array.isArray(input);
    }
    static isMultiJoin(input) {
        const i = input;
        return i.combination !== undefined && i.targetVectors !== undefined;
    }
}
exports.TargetVectorInputGuards = TargetVectorInputGuards;
class Bm25Operator {
    static and() {
        return { operator: 'And' };
    }
    static or(opts) {
        return Object.assign(Object.assign({}, opts), { operator: 'Or' });
    }
}
exports.Bm25Operator = Bm25Operator;
