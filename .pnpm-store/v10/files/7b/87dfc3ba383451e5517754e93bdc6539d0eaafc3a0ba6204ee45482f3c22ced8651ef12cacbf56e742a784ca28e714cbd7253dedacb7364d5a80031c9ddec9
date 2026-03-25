"use strict";

/**
 * Check if a comment is inline one (i.e. on the same line as some non-comment
 * code). Only works with comments that are not ignored by PostCSS. To work
 * with those that are ignored use `findCommentInRaws`
 *
 * @param {Comment} comment - PostCSS comment node
 * @return {boolean} true, if the comment is an inline one
 */
module.exports = function isInlineComment(comment) {
  const nextNode = comment.next();
  const isBeforeSomething =
    !!nextNode &&
    nextNode.type !== "comment" &&
    comment.source.end.line === nextNode.source.start.line;
  const isAfterSomething = comment.raws.before.search(/\n/) === -1;

  return isAfterSomething || isBeforeSomething;
};
