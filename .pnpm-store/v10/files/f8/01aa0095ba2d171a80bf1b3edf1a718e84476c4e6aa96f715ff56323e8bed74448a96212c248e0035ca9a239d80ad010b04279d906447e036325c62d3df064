"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInterpolationNode = exports.isCompoundExpressionNode = exports.isSimpleExpressionNode = exports.isAttributeNode = exports.isDirectiveNode = exports.isBaseElementNode = exports.isCommentNode = exports.isTextNode = void 0;
var NodeTypesLitteral = {
    ELEMENT: 1,
    TEXT: 2,
    COMMENT: 3,
    SIMPLE_EXPRESSION: 4,
    INTERPOLATION: 5,
    ATTRIBUTE: 6,
    DIRECTIVE: 7,
    COMPOUND_EXPRESSION: 8
};
function isTextNode(node) {
    return !!node && node.type === NodeTypesLitteral.TEXT;
}
exports.isTextNode = isTextNode;
function isCommentNode(node) {
    return !!node && node.type === NodeTypesLitteral.COMMENT;
}
exports.isCommentNode = isCommentNode;
function isBaseElementNode(node) {
    return !!node && node.type === NodeTypesLitteral.ELEMENT;
}
exports.isBaseElementNode = isBaseElementNode;
function isDirectiveNode(prop) {
    return !!prop && prop.type === NodeTypesLitteral.DIRECTIVE;
}
exports.isDirectiveNode = isDirectiveNode;
function isAttributeNode(prop) {
    return !!prop && prop.type === NodeTypesLitteral.ATTRIBUTE;
}
exports.isAttributeNode = isAttributeNode;
function isSimpleExpressionNode(exp) {
    return !!exp && exp.type === NodeTypesLitteral.SIMPLE_EXPRESSION;
}
exports.isSimpleExpressionNode = isSimpleExpressionNode;
function isCompoundExpressionNode(exp) {
    return !!exp && exp.type === NodeTypesLitteral.COMPOUND_EXPRESSION;
}
exports.isCompoundExpressionNode = isCompoundExpressionNode;
function isInterpolationNode(exp) {
    return !!exp && exp.type === NodeTypesLitteral.INTERPOLATION;
}
exports.isInterpolationNode = isInterpolationNode;
