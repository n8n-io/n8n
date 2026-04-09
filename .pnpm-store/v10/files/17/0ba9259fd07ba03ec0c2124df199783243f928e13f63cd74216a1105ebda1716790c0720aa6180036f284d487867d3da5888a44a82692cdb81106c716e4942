// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNode, DocNodeKind } from '../nodes';
/**
 * Renders a DocNode tree as plain text, without any rich text formatting or markup.
 */
export class PlainTextEmitter {
    static hasAnyTextContent(nodeOrNodes, requiredCharacters) {
        if (requiredCharacters === undefined || requiredCharacters < 1) {
            requiredCharacters = 1; // default
        }
        let nodes;
        if (nodeOrNodes instanceof DocNode) {
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
                case DocNodeKind.FencedCode:
                    const docFencedCode = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docFencedCode.code);
                    break;
                case DocNodeKind.CodeSpan:
                    const docCodeSpan = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docCodeSpan.code);
                    break;
                case DocNodeKind.EscapedText:
                    const docEscapedText = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docEscapedText.decodedText);
                    break;
                case DocNodeKind.LinkTag:
                    const docLinkTag = node;
                    foundCharacters += PlainTextEmitter._countNonSpaceCharacters(docLinkTag.linkText || '');
                    break;
                case DocNodeKind.PlainText:
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
//# sourceMappingURL=PlainTextEmitter.js.map