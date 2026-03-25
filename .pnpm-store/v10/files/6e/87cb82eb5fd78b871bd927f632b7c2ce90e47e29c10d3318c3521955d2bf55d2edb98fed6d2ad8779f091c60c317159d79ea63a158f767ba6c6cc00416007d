"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsDocumentFragmentNode = exports.assertIsDocumentTypeNode = exports.assertIsDocumentNode = exports.assertIsCommentNode = exports.assertIsProcessingInstructionNode = exports.assertIsCDATASectionNode = exports.assertIsTextNode = exports.assertIsAttributeNode = exports.assertIsElementNode = exports.isDocumentFragmentNode = exports.isDocumentTypeNode = exports.isDocumentNode = exports.isCommentNode = exports.isProcessingInstructionNode = exports.isCDATASectionNode = exports.isTextNode = exports.isAttributeNode = exports.isElementNode = exports.assertIsArrayOfNodes = exports.isArrayOfNodes = exports.assertIsNodeLike = exports.isNodeLike = exports.NodeTypes = void 0;
var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
    NodeTypes[NodeTypes["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
    NodeTypes[NodeTypes["TEXT_NODE"] = 3] = "TEXT_NODE";
    NodeTypes[NodeTypes["CDATA_SECTION_NODE"] = 4] = "CDATA_SECTION_NODE";
    NodeTypes[NodeTypes["PROCESSING_INSTRUCTION_NODE"] = 7] = "PROCESSING_INSTRUCTION_NODE";
    NodeTypes[NodeTypes["COMMENT_NODE"] = 8] = "COMMENT_NODE";
    NodeTypes[NodeTypes["DOCUMENT_NODE"] = 9] = "DOCUMENT_NODE";
    NodeTypes[NodeTypes["DOCUMENT_TYPE_NODE"] = 10] = "DOCUMENT_TYPE_NODE";
    NodeTypes[NodeTypes["DOCUMENT_FRAGMENT_NODE"] = 11] = "DOCUMENT_FRAGMENT_NODE";
})(NodeTypes || (exports.NodeTypes = NodeTypes = {}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNodeLike(value) {
    return (value &&
        typeof value === "object" &&
        Number.isInteger(value.nodeType) &&
        value.nodeType >= 1 &&
        value.nodeType <= 11 &&
        typeof value.nodeName === "string" &&
        typeof value.appendChild === "function" &&
        typeof value.removeChild === "function");
}
exports.isNodeLike = isNodeLike;
function assertIsNodeLike(value) {
    if (!isNodeLike(value)) {
        throw new Error(`Value is not a Node-like object. Received: ${value}`);
    }
}
exports.assertIsNodeLike = assertIsNodeLike;
function isArrayOfNodes(value) {
    return Array.isArray(value) && value.every(isNodeLike);
}
exports.isArrayOfNodes = isArrayOfNodes;
function assertIsArrayOfNodes(value) {
    if (!isArrayOfNodes(value)) {
        throw new Error("Value is not an array of Nodes");
    }
}
exports.assertIsArrayOfNodes = assertIsArrayOfNodes;
function isNodeOfType(type, value) {
    return isNodeLike(value) && value.nodeType === type;
}
function assertIsNodeOfType(type, value) {
    const typeName = Object.keys(NodeTypes).find((key) => NodeTypes[key] === type);
    if (!isNodeOfType(type, value)) {
        throw new Error(`Value is not of type ${typeName}`);
    }
}
const isElementNode = (value) => isNodeOfType(NodeTypes.ELEMENT_NODE, value);
exports.isElementNode = isElementNode;
const isAttributeNode = (value) => isNodeOfType(NodeTypes.ATTRIBUTE_NODE, value);
exports.isAttributeNode = isAttributeNode;
const isTextNode = (value) => isNodeOfType(NodeTypes.TEXT_NODE, value);
exports.isTextNode = isTextNode;
const isCDATASectionNode = (value) => isNodeOfType(NodeTypes.CDATA_SECTION_NODE, value);
exports.isCDATASectionNode = isCDATASectionNode;
const isProcessingInstructionNode = (value) => isNodeOfType(NodeTypes.PROCESSING_INSTRUCTION_NODE, value);
exports.isProcessingInstructionNode = isProcessingInstructionNode;
const isCommentNode = (value) => isNodeOfType(NodeTypes.COMMENT_NODE, value);
exports.isCommentNode = isCommentNode;
const isDocumentNode = (value) => isNodeOfType(NodeTypes.DOCUMENT_NODE, value);
exports.isDocumentNode = isDocumentNode;
const isDocumentTypeNode = (value) => isNodeOfType(NodeTypes.DOCUMENT_TYPE_NODE, value);
exports.isDocumentTypeNode = isDocumentTypeNode;
const isDocumentFragmentNode = (value) => isNodeOfType(NodeTypes.DOCUMENT_FRAGMENT_NODE, value);
exports.isDocumentFragmentNode = isDocumentFragmentNode;
const assertIsElementNode = (value) => {
    assertIsNodeOfType(NodeTypes.ELEMENT_NODE, value);
};
exports.assertIsElementNode = assertIsElementNode;
const assertIsAttributeNode = (value) => assertIsNodeOfType(NodeTypes.ATTRIBUTE_NODE, value);
exports.assertIsAttributeNode = assertIsAttributeNode;
const assertIsTextNode = (value) => assertIsNodeOfType(NodeTypes.TEXT_NODE, value);
exports.assertIsTextNode = assertIsTextNode;
const assertIsCDATASectionNode = (value) => assertIsNodeOfType(NodeTypes.CDATA_SECTION_NODE, value);
exports.assertIsCDATASectionNode = assertIsCDATASectionNode;
const assertIsProcessingInstructionNode = (value) => assertIsNodeOfType(NodeTypes.PROCESSING_INSTRUCTION_NODE, value);
exports.assertIsProcessingInstructionNode = assertIsProcessingInstructionNode;
const assertIsCommentNode = (value) => assertIsNodeOfType(NodeTypes.COMMENT_NODE, value);
exports.assertIsCommentNode = assertIsCommentNode;
const assertIsDocumentNode = (value) => assertIsNodeOfType(NodeTypes.DOCUMENT_NODE, value);
exports.assertIsDocumentNode = assertIsDocumentNode;
const assertIsDocumentTypeNode = (value) => assertIsNodeOfType(NodeTypes.DOCUMENT_TYPE_NODE, value);
exports.assertIsDocumentTypeNode = assertIsDocumentTypeNode;
const assertIsDocumentFragmentNode = (value) => assertIsNodeOfType(NodeTypes.DOCUMENT_FRAGMENT_NODE, value);
exports.assertIsDocumentFragmentNode = assertIsDocumentFragmentNode;
//# sourceMappingURL=index.js.map