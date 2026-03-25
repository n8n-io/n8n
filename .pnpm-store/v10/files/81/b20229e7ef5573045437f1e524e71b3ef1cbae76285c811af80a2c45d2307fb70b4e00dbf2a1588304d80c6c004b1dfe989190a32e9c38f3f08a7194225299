"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var guards_1 = require("./guards");
/**
 * Extract leading comments to an html node
 * Even if the comment is on multiple lines it's still taken as a whole
 * @param templateAst
 * @param rootLeadingComment
 */
function extractLeadingComment(siblings, templateAst) {
    // if the item has no siblings, the item is not documented
    if (siblings.length < 1) {
        return [];
    }
    // First find the position of the item in the siblings list
    var i = siblings.length - 1;
    var currentSlotIndex = -1;
    do {
        if (siblings[i] === templateAst) {
            currentSlotIndex = i;
        }
    } while (currentSlotIndex < 0 && i--);
    // Find the first leading comment
    // get all siblings before the current node
    var slotSiblingsBeforeSlot = siblings
        .slice(0, currentSlotIndex)
        .filter(function (s) { return !(0, guards_1.isTextNode)(s); })
        .reverse();
    // find the first node that is not a potential comment
    var indexLastComment = slotSiblingsBeforeSlot.findIndex(function (sibling) {
        return !(0, guards_1.isCommentNode)(sibling) &&
            !((0, guards_1.isInterpolationNode)(sibling) &&
                (0, guards_1.isSimpleExpressionNode)(sibling.content) &&
                isCodeOnlyJSComment(sibling.content.content));
    });
    // cut the comments array on this index
    var slotLeadingComments = (indexLastComment > 0
        ? slotSiblingsBeforeSlot.slice(0, indexLastComment)
        : slotSiblingsBeforeSlot)
        .reverse()
        .filter(function (s) { return (0, guards_1.isCommentNode)(s) || (0, guards_1.isInterpolationNode)(s); });
    // return each comment text
    return slotLeadingComments.map(function (comment) {
        return (0, guards_1.isCommentNode)(comment)
            ? comment.content.trim()
            : (0, guards_1.isInterpolationNode)(comment) && (0, guards_1.isSimpleExpressionNode)(comment.content)
                ? cleanUpComment(comment.content.content.trim())
                : '';
    });
}
exports.default = extractLeadingComment;
function isCodeOnlyJSComment(code) {
    var codeTrimmed = code.trim();
    return (
    // check single-line comments
    isCodeOnlyJSCommentSingleLine(codeTrimmed) ||
        // check multi-line comments
        isCodeOnlyJSCommentMultiLine(codeTrimmed));
}
function isCodeOnlyJSCommentSingleLine(code) {
    return code.split('\n').every(function (line) { return line.startsWith('//'); });
}
function isCodeOnlyJSCommentMultiLine(code) {
    return (code.startsWith('/*') &&
        code.endsWith('*/') &&
        // avoid picking up comments that have multiple blocks
        code.slice(2, -2).indexOf('*/') === -1);
}
function cleanUpComment(comment) {
    return isCodeOnlyJSCommentMultiLine(comment)
        ? comment.slice(2, -2)
        : comment
            .trim()
            .slice(2)
            .split(/\n\/\//g)
            .join('\n');
}
