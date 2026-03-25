"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printComments = exports.attach = void 0;
var tslib_1 = require("tslib");
var tiny_invariant_1 = tslib_1.__importDefault(require("tiny-invariant"));
var types = tslib_1.__importStar(require("ast-types"));
var n = types.namedTypes;
var isArray = types.builtInTypes.array;
var isObject = types.builtInTypes.object;
var lines_1 = require("./lines");
var util_1 = require("./util");
var childNodesCache = new WeakMap();
// TODO Move a non-caching implementation of this function into ast-types,
// and implement a caching wrapper function here.
function getSortedChildNodes(node, lines, resultArray) {
    if (!node) {
        return resultArray;
    }
    // The .loc checks below are sensitive to some of the problems that
    // are fixed by this utility function. Specifically, if it decides to
    // set node.loc to null, indicating that the node's .loc information
    // is unreliable, then we don't want to add node to the resultArray.
    (0, util_1.fixFaultyLocations)(node, lines);
    if (resultArray) {
        if (n.Node.check(node) && n.SourceLocation.check(node.loc)) {
            // This reverse insertion sort almost always takes constant
            // time because we almost always (maybe always?) append the
            // nodes in order anyway.
            var i = resultArray.length - 1;
            for (; i >= 0; --i) {
                var child = resultArray[i];
                if (child &&
                    child.loc &&
                    (0, util_1.comparePos)(child.loc.end, node.loc.start) <= 0) {
                    break;
                }
            }
            resultArray.splice(i + 1, 0, node);
            return resultArray;
        }
    }
    else {
        var childNodes = childNodesCache.get(node);
        if (childNodes) {
            return childNodes;
        }
    }
    var names;
    if (isArray.check(node)) {
        names = Object.keys(node);
    }
    else if (isObject.check(node)) {
        names = types.getFieldNames(node);
    }
    else {
        return resultArray;
    }
    if (!resultArray) {
        childNodesCache.set(node, (resultArray = []));
    }
    for (var i = 0, nameCount = names.length; i < nameCount; ++i) {
        getSortedChildNodes(node[names[i]], lines, resultArray);
    }
    return resultArray;
}
// As efficiently as possible, decorate the comment object with
// .precedingNode, .enclosingNode, and/or .followingNode properties, at
// least one of which is guaranteed to be defined.
function decorateComment(node, comment, lines) {
    var childNodes = getSortedChildNodes(node, lines);
    // Time to dust off the old binary search robes and wizard hat.
    var left = 0;
    var right = childNodes && childNodes.length;
    var precedingNode;
    var followingNode;
    while (typeof right === "number" && left < right) {
        var middle = (left + right) >> 1;
        var child = childNodes[middle];
        if ((0, util_1.comparePos)(child.loc.start, comment.loc.start) <= 0 &&
            (0, util_1.comparePos)(comment.loc.end, child.loc.end) <= 0) {
            // The comment is completely contained by this child node.
            decorateComment((comment.enclosingNode = child), comment, lines);
            return; // Abandon the binary search at this level.
        }
        if ((0, util_1.comparePos)(child.loc.end, comment.loc.start) <= 0) {
            // This child node falls completely before the comment.
            // Because we will never consider this node or any nodes
            // before it again, this node must be the closest preceding
            // node we have encountered so far.
            precedingNode = child;
            left = middle + 1;
            continue;
        }
        if ((0, util_1.comparePos)(comment.loc.end, child.loc.start) <= 0) {
            // This child node falls completely after the comment.
            // Because we will never consider this node or any nodes after
            // it again, this node must be the closest following node we
            // have encountered so far.
            followingNode = child;
            right = middle;
            continue;
        }
        throw new Error("Comment location overlaps with node location");
    }
    if (precedingNode) {
        comment.precedingNode = precedingNode;
    }
    if (followingNode) {
        comment.followingNode = followingNode;
    }
}
function attach(comments, ast, lines) {
    if (!isArray.check(comments)) {
        return;
    }
    var tiesToBreak = [];
    comments.forEach(function (comment) {
        comment.loc.lines = lines;
        decorateComment(ast, comment, lines);
        var pn = comment.precedingNode;
        var en = comment.enclosingNode;
        var fn = comment.followingNode;
        if (pn && fn) {
            var tieCount = tiesToBreak.length;
            if (tieCount > 0) {
                var lastTie = tiesToBreak[tieCount - 1];
                (0, tiny_invariant_1.default)((lastTie.precedingNode === comment.precedingNode) ===
                    (lastTie.followingNode === comment.followingNode));
                if (lastTie.followingNode !== comment.followingNode) {
                    breakTies(tiesToBreak, lines);
                }
            }
            tiesToBreak.push(comment);
        }
        else if (pn) {
            // No contest: we have a trailing comment.
            breakTies(tiesToBreak, lines);
            addTrailingComment(pn, comment);
        }
        else if (fn) {
            // No contest: we have a leading comment.
            breakTies(tiesToBreak, lines);
            addLeadingComment(fn, comment);
        }
        else if (en) {
            // The enclosing node has no child nodes at all, so what we
            // have here is a dangling comment, e.g. [/* crickets */].
            breakTies(tiesToBreak, lines);
            addDanglingComment(en, comment);
        }
        else {
            throw new Error("AST contains no nodes at all?");
        }
    });
    breakTies(tiesToBreak, lines);
    comments.forEach(function (comment) {
        // These node references were useful for breaking ties, but we
        // don't need them anymore, and they create cycles in the AST that
        // may lead to infinite recursion if we don't delete them here.
        delete comment.precedingNode;
        delete comment.enclosingNode;
        delete comment.followingNode;
    });
}
exports.attach = attach;
function breakTies(tiesToBreak, lines) {
    var tieCount = tiesToBreak.length;
    if (tieCount === 0) {
        return;
    }
    var pn = tiesToBreak[0].precedingNode;
    var fn = tiesToBreak[0].followingNode;
    var gapEndPos = fn.loc.start;
    // Iterate backwards through tiesToBreak, examining the gaps
    // between the tied comments. In order to qualify as leading, a
    // comment must be separated from fn by an unbroken series of
    // whitespace-only gaps (or other comments).
    var indexOfFirstLeadingComment = tieCount;
    var comment;
    for (; indexOfFirstLeadingComment > 0; --indexOfFirstLeadingComment) {
        comment = tiesToBreak[indexOfFirstLeadingComment - 1];
        (0, tiny_invariant_1.default)(comment.precedingNode === pn);
        (0, tiny_invariant_1.default)(comment.followingNode === fn);
        var gap = lines.sliceString(comment.loc.end, gapEndPos);
        if (/\S/.test(gap)) {
            // The gap string contained something other than whitespace.
            break;
        }
        gapEndPos = comment.loc.start;
    }
    while (indexOfFirstLeadingComment <= tieCount &&
        (comment = tiesToBreak[indexOfFirstLeadingComment]) &&
        // If the comment is a //-style comment and indented more
        // deeply than the node itself, reconsider it as trailing.
        (comment.type === "Line" || comment.type === "CommentLine") &&
        comment.loc.start.column > fn.loc.start.column) {
        ++indexOfFirstLeadingComment;
    }
    if (indexOfFirstLeadingComment) {
        var enclosingNode = tiesToBreak[indexOfFirstLeadingComment - 1].enclosingNode;
        if ((enclosingNode === null || enclosingNode === void 0 ? void 0 : enclosingNode.type) === "CallExpression") {
            --indexOfFirstLeadingComment;
        }
    }
    tiesToBreak.forEach(function (comment, i) {
        if (i < indexOfFirstLeadingComment) {
            addTrailingComment(pn, comment);
        }
        else {
            addLeadingComment(fn, comment);
        }
    });
    tiesToBreak.length = 0;
}
function addCommentHelper(node, comment) {
    var comments = node.comments || (node.comments = []);
    comments.push(comment);
}
function addLeadingComment(node, comment) {
    comment.leading = true;
    comment.trailing = false;
    addCommentHelper(node, comment);
}
function addDanglingComment(node, comment) {
    comment.leading = false;
    comment.trailing = false;
    addCommentHelper(node, comment);
}
function addTrailingComment(node, comment) {
    comment.leading = false;
    comment.trailing = true;
    addCommentHelper(node, comment);
}
function printLeadingComment(commentPath, print) {
    var comment = commentPath.getValue();
    n.Comment.assert(comment);
    var loc = comment.loc;
    var lines = loc && loc.lines;
    var parts = [print(commentPath)];
    if (comment.trailing) {
        // When we print trailing comments as leading comments, we don't
        // want to bring any trailing spaces along.
        parts.push("\n");
    }
    else if (lines instanceof lines_1.Lines) {
        var trailingSpace = lines.slice(loc.end, lines.skipSpaces(loc.end) || lines.lastPos());
        if (trailingSpace.length === 1) {
            // If the trailing space contains no newlines, then we want to
            // preserve it exactly as we found it.
            parts.push(trailingSpace);
        }
        else {
            // If the trailing space contains newlines, then replace it
            // with just that many newlines, with all other spaces removed.
            parts.push(new Array(trailingSpace.length).join("\n"));
        }
    }
    else {
        parts.push("\n");
    }
    return (0, lines_1.concat)(parts);
}
function printTrailingComment(commentPath, print) {
    var comment = commentPath.getValue(commentPath);
    n.Comment.assert(comment);
    var loc = comment.loc;
    var lines = loc && loc.lines;
    var parts = [];
    if (lines instanceof lines_1.Lines) {
        var fromPos = lines.skipSpaces(loc.start, true) || lines.firstPos();
        var leadingSpace = lines.slice(fromPos, loc.start);
        if (leadingSpace.length === 1) {
            // If the leading space contains no newlines, then we want to
            // preserve it exactly as we found it.
            parts.push(leadingSpace);
        }
        else {
            // If the leading space contains newlines, then replace it
            // with just that many newlines, sans all other spaces.
            parts.push(new Array(leadingSpace.length).join("\n"));
        }
    }
    parts.push(print(commentPath));
    return (0, lines_1.concat)(parts);
}
function printComments(path, print) {
    var value = path.getValue();
    var innerLines = print(path);
    var comments = n.Node.check(value) && types.getFieldValue(value, "comments");
    if (!comments || comments.length === 0) {
        return innerLines;
    }
    var leadingParts = [];
    var trailingParts = [innerLines];
    path.each(function (commentPath) {
        var comment = commentPath.getValue();
        var leading = types.getFieldValue(comment, "leading");
        var trailing = types.getFieldValue(comment, "trailing");
        if (leading ||
            (trailing &&
                !(n.Statement.check(value) ||
                    comment.type === "Block" ||
                    comment.type === "CommentBlock"))) {
            leadingParts.push(printLeadingComment(commentPath, print));
        }
        else if (trailing) {
            trailingParts.push(printTrailingComment(commentPath, print));
        }
    }, "comments");
    leadingParts.push.apply(leadingParts, trailingParts);
    return (0, lines_1.concat)(leadingParts);
}
exports.printComments = printComments;
