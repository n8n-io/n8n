"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const t = __importStar(require("@babel/types"));
function isReferenced(node, parent) {
    switch (parent.type) {
        // yes: { [NODE]: '' }
        // yes: { NODE }
        // no: { NODE: '' }
        case 'ObjectProperty':
            return parent.value === node || parent.computed;
        // no: break NODE;
        // no: continue NODE;
        case 'BreakStatement':
        case 'ContinueStatement':
            return false;
        // yes: left = NODE;
        // yes: NODE = right;
        case 'AssignmentExpression':
            return true;
    }
    return t.isReferenced(node, parent);
}
exports.default = isReferenced;
//# sourceMappingURL=reference.js.map