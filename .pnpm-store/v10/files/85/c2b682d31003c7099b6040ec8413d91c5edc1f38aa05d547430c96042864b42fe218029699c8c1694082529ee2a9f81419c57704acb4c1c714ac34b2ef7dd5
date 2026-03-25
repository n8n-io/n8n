"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var bt = __importStar(require("@babel/types"));
/**
 * true if the left part of the expression of the NodePath is of form `exports.foo = ...;` or
 * `modules.exports = ...;`.
 */
function isExportedAssignment(path) {
    if (bt.isExpressionStatement(path.node)) {
        path = path.get('expression');
    }
    if (!bt.isAssignmentExpression(path.node)) {
        return false;
    }
    var pathLeft = path.get('left');
    var isSimpleExports = bt.isIdentifier(pathLeft.node) && pathLeft.node.name === 'exports';
    // check if we are looking at obj.member = value`
    var isModuleExports = false;
    if (!isSimpleExports && !bt.isMemberExpression(pathLeft.node)) {
        return false;
    }
    else if (bt.isMemberExpression(pathLeft.node)) {
        var leftObject = pathLeft.get('object');
        var leftProp = pathLeft.get('property');
        isModuleExports =
            !Array.isArray(leftProp) &&
                bt.isIdentifier(leftProp.node) &&
                bt.isIdentifier(leftObject.node) &&
                // if exports.xx =
                (leftObject.node.name === 'exports' ||
                    // if module.exports =
                    (leftObject.node.name === 'module' && leftProp.node.name === 'exports'));
    }
    return isSimpleExports || isModuleExports;
}
exports.default = isExportedAssignment;
