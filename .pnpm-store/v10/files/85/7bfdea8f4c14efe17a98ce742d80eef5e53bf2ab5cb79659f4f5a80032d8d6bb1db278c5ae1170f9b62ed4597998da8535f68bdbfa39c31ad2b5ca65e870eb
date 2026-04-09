"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlainTextEmitter = void 0;
const nodes_1 = require("../nodes");
/**
 * Renders a DocNode tree as plain text, without any rich text formatting or markup.
 */
class PlainTextEmitter {
    static hasAnyTextContent(nodeOrNodes, requiredCharacters) {
        if (requiredCharacters === undefined || requiredCharacters < 1) {
            requiredCharacters = 1; // default
        }
        let nodes;
        if (nodeOrNodes instanceof nodes_1.DocNode) {
            nodes = [nodeOrNodes];
        }
        else {
            nodes = nodeOrNodes;
        }
        const foundCharacters = PlainTextEmitter._scanTextContent(nodes, requiredCharacters, 0);
        return foundCharacters >= requiredCharacters;
    }
    static _scanTextContent(nodes, requiredCharacters, foundCharacters) {
        for (const node of nodes) {
            switch (node.kind) {
                case nodes_1.DocNodeKind.FencedCode:
                    const docFencedCode = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docFencedCode.code);
                    break;
                case nodes_1.DocNodeKind.CodeSpan:
                    const docCodeSpan = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docCodeSpan.code);
                    break;
                case nodes_1.DocNodeKind.EscapedText:
                    const docEscapedText = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docEscapedText.decodedText);
                    break;
                case nodes_1.DocNodeKind.LinkTag:
                    const docLinkTag = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docLinkTag.linkText || '');
                    break;
                case nodes_1.DocNodeKind.PlainText:
                    const docPlainText = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docPlainText.text);
                    break;
            }
            if (foundCharacters >= requiredCharacters) {
                break;
            }
            foundCharacters += PlainTextEmitter._scanTextContent(node.getChildNodes(), requiredCharacters, foundCharacters);
            if (foundCharacters >= requiredCharacters) {
                break;
            }
        }
        return foundCharacters;
    }
    static _countNonSpaceCharacters(s) {
        let count = 0;
        const length = s.length;
        let i = 0;
        while (i < length) {
            switch (s.charCodeAt(i)) {
                case 32: // space
                case 9: // tab
                case 13: // CR
                case 10: // LF
                    break;
                default:
                    ++count;
            }
            ++i;
        }
        return count;
    }
}
exports.PlainTextEmitter = PlainTextEmitter;
//# sourceMappingURL=PlainTextEmitter.js.map