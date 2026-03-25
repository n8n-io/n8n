export class NearVectorInputGuards {
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
export class ArrayInputGuards {
    static is1DArray(input) {
        return Array.isArray(input) && input.length > 0 && !Array.isArray(input[0]);
    }
    static is2DArray(input) {
        return Array.isArray(input) && input.length > 0 && Array.isArray(input[0]);
    }
}
export class TargetVectorInputGuards {
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
export class Bm25Operator {
    static and() {
        return { operator: 'And' };
    }
    static or(opts) {
        return Object.assign(Object.assign({}, opts), { operator: 'Or' });
    }
}
