"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeResultFromProto = void 0;
function describeResultFromProto(result) {
    return {
        paramNames: result.params.map((p) => p.name),
        columns: result.cols,
        isExplain: result.isExplain,
        isReadonly: result.isReadonly,
    };
}
exports.describeResultFromProto = describeResultFromProto;
