import { c as createRule, D as isHashbangComment, C as COMMENTS_IGNORE_PATTERN, i as isSingleLine, o as isWhiteSpaces, W as WHITE_SPACES_PATTERN } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var multilineCommentStyle = createRule({
  name: "multiline-comment-style",
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce a particular style for multiline comments"
    },
    fixable: "whitespace",
    schema: {
      anyOf: [
        {
          type: "array",
          items: [
            {
              enum: ["starred-block", "bare-block"],
              type: "string"
            }
          ],
          additionalItems: false
        },
        {
          type: "array",
          items: [
            {
              enum: ["separate-lines"],
              type: "string"
            },
            {
              type: "object",
              properties: {
                checkJSDoc: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          ],
          additionalItems: false
        }
      ]
    },
    messages: {
      expectedBlock: "Expected a block comment instead of consecutive line comments.",
      expectedBareBlock: "Expected a block comment without padding stars.",
      startNewline: "Expected a linebreak after '/*'.",
      endNewline: "Expected a linebreak before '*/'.",
      missingStar: "Expected a '*' at the start of this line.",
      alignment: "Expected this line to be aligned with the start of the comment.",
      expectedLines: "Expected multiple line comments instead of a block comment."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const option = context.options[0] || "starred-block";
    const params = context.options[1] || {};
    const checkJSDoc = !!params.checkJSDoc;
    function isStarredCommentLine(line) {
      return /^\s*\*/u.test(line);
    }
    function isStarredBlockComment([firstComment]) {
      if (firstComment.type !== "Block")
        return false;
      const lines = firstComment.value.split(astUtilsExports.LINEBREAK_MATCHER);
      return lines.length > 0 && lines.every((line, i) => i === 0 || i === lines.length - 1 ? isWhiteSpaces(line) : isStarredCommentLine(line));
    }
    function isJSDocComment([firstComment]) {
      if (firstComment.type !== "Block")
        return false;
      const lines = firstComment.value.split(astUtilsExports.LINEBREAK_MATCHER);
      return /^\*\s*$/u.test(lines[0]) && lines.slice(1, -1).every((line) => /^\s* /u.test(line)) && isWhiteSpaces(lines.at(-1));
    }
    function processSeparateLineComments(commentGroup) {
      const allLinesHaveLeadingSpace = commentGroup.map(({ value }) => value).filter((line) => line.trim().length).every((line) => line.startsWith(" "));
      return commentGroup.map(({ value }) => allLinesHaveLeadingSpace ? value.replace(/^ /u, "") : value);
    }
    function processStarredBlockComment(comment) {
      const lines = comment.value.split(astUtilsExports.LINEBREAK_MATCHER).filter((line, i, linesArr) => !(i === 0 || i === linesArr.length - 1)).map((line) => line.replace(WHITE_SPACES_PATTERN, ""));
      const allLinesHaveLeadingSpace = lines.map((line) => line.replace(/\s*\*/u, "")).filter((line) => line.trim().length).every((line) => line.startsWith(" "));
      return lines.map((line) => line.replace(allLinesHaveLeadingSpace ? /\s*\* ?/u : /\s*\*/u, ""));
    }
    function processBareBlockComment(comment) {
      const lines = comment.value.split(astUtilsExports.LINEBREAK_MATCHER).map((line) => line.replace(WHITE_SPACES_PATTERN, ""));
      const leadingWhitespace = `${sourceCode.text.slice(comment.range[0] - comment.loc.start.column, comment.range[0])}   `;
      let offset = "";
      for (const [i, line] of lines.entries()) {
        if (!line.trim().length || i === 0)
          continue;
        const [, lineOffset] = line.match(/^(\s*\*?\s*)/u);
        if (lineOffset.length < leadingWhitespace.length) {
          const newOffset = leadingWhitespace.slice(lineOffset.length - leadingWhitespace.length);
          if (newOffset.length > offset.length)
            offset = newOffset;
        }
      }
      return lines.map((line) => {
        const match = line.match(/^(\s*\*?\s*)(.*)/u);
        const [, lineOffset, lineContents] = match;
        if (lineOffset.length > leadingWhitespace.length)
          return `${lineOffset.slice(leadingWhitespace.length - (offset.length + lineOffset.length))}${lineContents}`;
        if (lineOffset.length < leadingWhitespace.length)
          return `${lineOffset.slice(leadingWhitespace.length)}${lineContents}`;
        return lineContents;
      });
    }
    function getCommentLines(commentGroup) {
      const [firstComment] = commentGroup;
      if (firstComment.type === "Line")
        return processSeparateLineComments(commentGroup);
      if (isStarredBlockComment(commentGroup))
        return processStarredBlockComment(firstComment);
      return processBareBlockComment(firstComment);
    }
    function getInitialOffset(comment) {
      return sourceCode.text.slice(comment.range[0] - comment.loc.start.column, comment.range[0]);
    }
    function convertToStarredBlock(firstComment, commentLinesList) {
      const initialOffset = getInitialOffset(firstComment);
      return `/*
${commentLinesList.map((line) => `${initialOffset} * ${line}`).join("\n")}
${initialOffset} */`;
    }
    function convertToSeparateLines(firstComment, commentLinesList) {
      return commentLinesList.map((line) => `// ${line}`).join(`
${getInitialOffset(firstComment)}`);
    }
    function convertToBlock(firstComment, commentLinesList) {
      return `/* ${commentLinesList.join(`
${getInitialOffset(firstComment)}   `)} */`;
    }
    const commentGroupCheckers = {
      "starred-block": function(commentGroup) {
        const [firstComment] = commentGroup;
        const commentLines = getCommentLines(commentGroup);
        if (commentLines.some((value) => value.includes("*/")))
          return;
        if (commentGroup.length > 1) {
          context.report({
            loc: {
              start: firstComment.loc.start,
              end: commentGroup.at(-1).loc.end
            },
            messageId: "expectedBlock",
            fix(fixer) {
              const range = [firstComment.range[0], commentGroup.at(-1).range[1]];
              return commentLines.some((value) => value.startsWith("/")) ? null : fixer.replaceTextRange(range, convertToStarredBlock(firstComment, commentLines));
            }
          });
        } else {
          const lines = firstComment.value.split(astUtilsExports.LINEBREAK_MATCHER);
          const expectedLeadingWhitespace = getInitialOffset(firstComment);
          const expectedLinePrefix = `${expectedLeadingWhitespace} *`;
          if (!/^\*?\s*$/u.test(lines[0])) {
            const start = firstComment.value.startsWith("*") ? firstComment.range[0] + 1 : firstComment.range[0];
            context.report({
              loc: {
                start: firstComment.loc.start,
                end: { line: firstComment.loc.start.line, column: firstComment.loc.start.column + 2 }
              },
              messageId: "startNewline",
              fix: (fixer) => fixer.insertTextAfterRange([start, start + 2], `
${expectedLinePrefix}`)
            });
          }
          if (!isWhiteSpaces(lines.at(-1))) {
            context.report({
              loc: {
                start: { line: firstComment.loc.end.line, column: firstComment.loc.end.column - 2 },
                end: firstComment.loc.end
              },
              messageId: "endNewline",
              fix: (fixer) => fixer.replaceTextRange([firstComment.range[1] - 2, firstComment.range[1]], `
${expectedLinePrefix}/`)
            });
          }
          for (let lineNumber = firstComment.loc.start.line + 1; lineNumber <= firstComment.loc.end.line; lineNumber++) {
            const lineText = sourceCode.lines[lineNumber - 1];
            const errorType = isStarredCommentLine(lineText) ? "alignment" : "missingStar";
            if (!lineText.startsWith(expectedLinePrefix)) {
              context.report({
                loc: {
                  start: { line: lineNumber, column: 0 },
                  end: { line: lineNumber, column: lineText.length }
                },
                messageId: errorType,
                fix(fixer) {
                  const lineStartIndex = sourceCode.getIndexFromLoc({ line: lineNumber, column: 0 });
                  if (errorType === "alignment") {
                    const [, commentTextPrefix2 = ""] = lineText.match(/^(\s*\*)/u) || [];
                    const commentTextStartIndex2 = lineStartIndex + commentTextPrefix2.length;
                    return fixer.replaceTextRange([lineStartIndex, commentTextStartIndex2], expectedLinePrefix);
                  }
                  const [, commentTextPrefix = ""] = lineText.match(/^(\s*)/u) || [];
                  const commentTextStartIndex = lineStartIndex + commentTextPrefix.length;
                  let offset;
                  for (const [idx, line] of lines.entries()) {
                    if (!/\S+/u.test(line))
                      continue;
                    const lineTextToAlignWith = sourceCode.lines[firstComment.loc.start.line - 1 + idx];
                    const [, prefix = "", initialOffset = ""] = lineTextToAlignWith.match(/^(\s*(?:\/?\*)?(\s*))/u) || [];
                    offset = `${commentTextPrefix.slice(prefix.length)}${initialOffset}`;
                    if (/^\s*\//u.test(lineText) && offset.length === 0)
                      offset += " ";
                    break;
                  }
                  return fixer.replaceTextRange([lineStartIndex, commentTextStartIndex], `${expectedLinePrefix}${offset}`);
                }
              });
            }
          }
        }
      },
      "separate-lines": function(commentGroup) {
        const [firstComment] = commentGroup;
        const isJSDoc = isJSDocComment(commentGroup);
        if (firstComment.type !== "Block" || !checkJSDoc && isJSDoc)
          return;
        let commentLines = getCommentLines(commentGroup);
        if (isJSDoc)
          commentLines = commentLines.slice(1, commentLines.length - 1);
        const tokenAfter = sourceCode.getTokenAfter(firstComment, { includeComments: true });
        if (tokenAfter && astUtilsExports.isTokenOnSameLine(firstComment, tokenAfter))
          return;
        context.report({
          loc: {
            start: firstComment.loc.start,
            end: { line: firstComment.loc.start.line, column: firstComment.loc.start.column + 2 }
          },
          messageId: "expectedLines",
          fix(fixer) {
            return fixer.replaceText(firstComment, convertToSeparateLines(firstComment, commentLines));
          }
        });
      },
      "bare-block": function(commentGroup) {
        if (isJSDocComment(commentGroup))
          return;
        const [firstComment] = commentGroup;
        const commentLines = getCommentLines(commentGroup);
        if (firstComment.type === "Line" && commentLines.length > 1 && !commentLines.some((value) => value.includes("*/"))) {
          context.report({
            loc: {
              start: firstComment.loc.start,
              end: commentGroup.at(-1).loc.end
            },
            messageId: "expectedBlock",
            fix(fixer) {
              return fixer.replaceTextRange(
                [firstComment.range[0], commentGroup.at(-1).range[1]],
                convertToBlock(firstComment, commentLines)
              );
            }
          });
        }
        if (isStarredBlockComment(commentGroup)) {
          context.report({
            loc: {
              start: firstComment.loc.start,
              end: { line: firstComment.loc.start.line, column: firstComment.loc.start.column + 2 }
            },
            messageId: "expectedBareBlock",
            fix(fixer) {
              return fixer.replaceText(firstComment, convertToBlock(firstComment, commentLines));
            }
          });
        }
      }
    };
    return {
      Program() {
        return sourceCode.getAllComments().filter((comment) => {
          if (isHashbangComment(comment))
            return false;
          if (COMMENTS_IGNORE_PATTERN.test(comment.value))
            return false;
          const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: true });
          return !tokenBefore || tokenBefore.loc.end.line < comment.loc.start.line;
        }).reduce((commentGroups, comment, index, commentList) => {
          const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: true });
          if (comment.type === "Line" && index && commentList[index - 1].type === "Line" && tokenBefore && tokenBefore.loc.end.line === comment.loc.start.line - 1 && tokenBefore === commentList[index - 1]) {
            commentGroups.at(-1).push(comment);
          } else {
            commentGroups.push([comment]);
          }
          return commentGroups;
        }, []).filter((commentGroup) => !(commentGroup.length === 1 && isSingleLine(commentGroup[0]))).forEach(commentGroupCheckers[option]);
      }
    };
  }
});

export { multilineCommentStyle as default };
