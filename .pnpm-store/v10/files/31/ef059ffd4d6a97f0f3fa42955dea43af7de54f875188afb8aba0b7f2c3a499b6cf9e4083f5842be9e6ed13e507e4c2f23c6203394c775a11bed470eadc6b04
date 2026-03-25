// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNode, DocNodeKind } from '../nodes';
/**
 * Renders a DocNode tree as plain text, without any rich text formatting or markup.
 */
var PlainTextEmitter = /** @class */ (function () {
    function PlainTextEmitter() {
    }
    PlainTextEmitter.hasAnyTextContent = function (nodeOrNodes, requiredCharacters) {
        if (requiredCharacters === undefined || requiredCharacters < 1) {
            requiredCharacters = 1; // default
        }
        var nodes;
        if (nodeOrNodes instanceof DocNode) {
            nodes = [nodeOrNodes];
        }
        else {
            nodes = nodeOrNodes;
        }
        var foundCharacters = PlainTextEmitter._scanTextContent(nodes, requiredCharacters, 0);
        return foundCharacters >= requiredCharacters;
    };
    PlainTextEmitter._scanTextContent = function (nodes, requiredCharacters, foundCharacters) {
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            switch (node.kind) {
                case DocNodeKind.FencedCode:
                    var docFencedCode = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docFencedCode.code);
                    break;
                case DocNodeKind.CodeSpan:
                    var docCodeSpan = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docCodeSpan.code);
                    break;
                case DocNodeKind.EscapedText:
                    var docEscapedText = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docEscapedText.decodedText);
                    break;
                case DocNodeKind.LinkTag:
                    var docLinkTag = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docLinkTag.linkText || '');
                    break;
                case DocNodeKind.PlainText:
                    var docPlainText = node;
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
    };
    PlainTextEmitter._countNonSpaceCharacters = function (s) {
        var count = 0;
        var length = s.length;
        var i = 0;
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
    };
    return PlainTextEmitter;
}());
export { PlainTextEmitter };
//# sourceMappingURL=PlainTextEmitter.js.map