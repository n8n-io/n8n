"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElementNode = exports.isCommentNode = exports.isTextNode = exports.CommentNode = exports.NodeType = void 0;
const node_html_parser_1 = require("node-html-parser");
Object.defineProperty(exports, "CommentNode", { enumerable: true, get: function () { return node_html_parser_1.CommentNode; } });
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return node_html_parser_1.NodeType; } });
// endregion
/* ****************************************************************************************************************** */
// region: TypeGuards
/* ****************************************************************************************************************** */
const isTextNode = (node) => node.nodeType === node_html_parser_1.NodeType.TEXT_NODE;
exports.isTextNode = isTextNode;
const isCommentNode = (node) => node.nodeType === node_html_parser_1.NodeType.COMMENT_NODE;
exports.isCommentNode = isCommentNode;
const isElementNode = (node) => node.nodeType === node_html_parser_1.NodeType.ELEMENT_NODE;
exports.isElementNode = isElementNode;
// endregion
//# sourceMappingURL=nodes.js.map