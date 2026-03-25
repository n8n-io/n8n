import { c as createRule, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const OPTIONS_SCHEMA = {
  type: "object",
  properties: {
    code: {
      type: "integer",
      minimum: 0
    },
    comments: {
      type: "integer",
      minimum: 0
    },
    tabWidth: {
      type: "integer",
      minimum: 0
    },
    ignorePattern: {
      type: "string"
    },
    ignoreComments: {
      type: "boolean"
    },
    ignoreStrings: {
      type: "boolean"
    },
    ignoreUrls: {
      type: "boolean"
    },
    ignoreTemplateLiterals: {
      type: "boolean"
    },
    ignoreRegExpLiterals: {
      type: "boolean"
    },
    ignoreTrailingComments: {
      type: "boolean"
    }
  },
  additionalProperties: false
};
const OPTIONS_OR_INTEGER_SCHEMA = {
  anyOf: [
    OPTIONS_SCHEMA,
    {
      type: "integer",
      minimum: 0
    }
  ]
};
var maxLen = createRule({
  name: "max-len",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce a maximum line length"
    },
    schema: [
      OPTIONS_OR_INTEGER_SCHEMA,
      OPTIONS_OR_INTEGER_SCHEMA,
      OPTIONS_SCHEMA
    ],
    messages: {
      max: "This line has a length of {{lineLength}}. Maximum allowed is {{maxLength}}.",
      maxComment: "This line has a comment length of {{lineLength}}. Maximum allowed is {{maxCommentLength}}."
    }
  },
  create(context) {
    const URL_REGEXP = /[^:/?#]:\/\/[^?#]/u;
    const sourceCode = context.sourceCode;
    function computeLineLength(line, tabWidth2) {
      let extraCharacterCount = 0;
      line.replace(/\t/gu, (_, offset) => {
        const totalOffset = offset + extraCharacterCount;
        const previousTabStopOffset = tabWidth2 ? totalOffset % tabWidth2 : 0;
        const spaceCount = tabWidth2 - previousTabStopOffset;
        extraCharacterCount += spaceCount - 1;
        return "";
      });
      return Array.from(line).length + extraCharacterCount;
    }
    const options = Object.assign({}, context.options[context.options.length - 1]);
    if (typeof context.options[0] === "number")
      options.code = context.options[0];
    if (typeof context.options[1] === "number")
      options.tabWidth = context.options[1];
    const maxLength = typeof options.code === "number" ? options.code : 80;
    const tabWidth = typeof options.tabWidth === "number" ? options.tabWidth : 4;
    const ignoreComments = !!options.ignoreComments;
    const ignoreStrings = !!options.ignoreStrings;
    const ignoreTemplateLiterals = !!options.ignoreTemplateLiterals;
    const ignoreRegExpLiterals = !!options.ignoreRegExpLiterals;
    const ignoreTrailingComments = !!options.ignoreTrailingComments || !!options.ignoreComments;
    const ignoreUrls = !!options.ignoreUrls;
    const maxCommentLength = options.comments;
    let ignorePattern = null;
    if (options.ignorePattern)
      ignorePattern = new RegExp(options.ignorePattern, "u");
    function isTrailingComment(line, lineNumber, comment) {
      return comment && (comment.loc.start.line === lineNumber && lineNumber <= comment.loc.end.line) && (comment.loc.end.line > lineNumber || comment.loc.end.column === line.length);
    }
    function isFullLineComment(line, lineNumber, comment) {
      const start = comment.loc.start;
      const end = comment.loc.end;
      const isFirstTokenOnLine = !line.slice(0, comment.loc.start.column).trim();
      return comment && (start.line < lineNumber || start.line === lineNumber && isFirstTokenOnLine) && (end.line > lineNumber || end.line === lineNumber && end.column === line.length);
    }
    function isJSXEmptyExpressionInSingleLineContainer(node) {
      if (!node || !node.parent || node.type !== "JSXEmptyExpression" || node.parent.type !== "JSXExpressionContainer")
        return false;
      const parent = node.parent;
      return isSingleLine(parent);
    }
    function stripTrailingComment(line, comment) {
      return line.slice(0, comment.loc.start.column).replace(/\s+$/u, "");
    }
    function ensureArrayAndPush(object, key, value) {
      if (!Array.isArray(object[key]))
        object[key] = [];
      object[key].push(value);
    }
    function getAllStrings() {
      return sourceCode.ast.tokens.filter((token) => token.type === "String" || token.type === "JSXText" && sourceCode.getNodeByRangeIndex(token.range[0] - 1).type === "JSXAttribute");
    }
    function getAllTemplateLiterals() {
      return sourceCode.ast.tokens.filter((token) => token.type === "Template");
    }
    function getAllRegExpLiterals() {
      return sourceCode.ast.tokens.filter((token) => token.type === "RegularExpression");
    }
    function groupArrayByLineNumber(arr) {
      const obj = {};
      for (let i = 0; i < arr.length; i++) {
        const node = arr[i];
        for (let j = node.loc.start.line; j <= node.loc.end.line; ++j)
          ensureArrayAndPush(obj, j, node);
      }
      return obj;
    }
    function getAllComments() {
      const comments = [];
      sourceCode.getAllComments().forEach((commentNode) => {
        const containingNode = sourceCode.getNodeByRangeIndex(commentNode.range[0]);
        if (isJSXEmptyExpressionInSingleLineContainer(containingNode)) {
          if (comments[comments.length - 1] !== containingNode.parent)
            comments.push(containingNode.parent);
        } else {
          comments.push(commentNode);
        }
      });
      return comments;
    }
    function checkProgramForMaxLength(node) {
      const lines = sourceCode.lines;
      const comments = ignoreComments || maxCommentLength || ignoreTrailingComments ? getAllComments() : [];
      let commentsIndex = 0;
      const strings = getAllStrings();
      const stringsByLine = groupArrayByLineNumber(strings);
      const templateLiterals = getAllTemplateLiterals();
      const templateLiteralsByLine = groupArrayByLineNumber(templateLiterals);
      const regExpLiterals = getAllRegExpLiterals();
      const regExpLiteralsByLine = groupArrayByLineNumber(regExpLiterals);
      lines.forEach((line, i) => {
        const lineNumber = i + 1;
        let lineIsComment = false;
        let textToMeasure;
        if (commentsIndex < comments.length) {
          let comment = null;
          do
            comment = comments[++commentsIndex];
          while (comment && comment.loc.start.line <= lineNumber);
          comment = comments[--commentsIndex];
          if (isFullLineComment(line, lineNumber, comment)) {
            lineIsComment = true;
            textToMeasure = line;
          } else if (ignoreTrailingComments && isTrailingComment(line, lineNumber, comment)) {
            textToMeasure = stripTrailingComment(line, comment);
            let lastIndex = commentsIndex;
            while (isTrailingComment(textToMeasure, lineNumber, comments[--lastIndex]))
              textToMeasure = stripTrailingComment(textToMeasure, comments[lastIndex]);
          } else {
            textToMeasure = line;
          }
        } else {
          textToMeasure = line;
        }
        if (ignorePattern && ignorePattern.test(textToMeasure) || ignoreUrls && URL_REGEXP.test(textToMeasure) || ignoreStrings && stringsByLine[lineNumber] || ignoreTemplateLiterals && templateLiteralsByLine[lineNumber] || ignoreRegExpLiterals && regExpLiteralsByLine[lineNumber]) {
          return;
        }
        const lineLength = computeLineLength(textToMeasure, tabWidth);
        const commentLengthApplies = lineIsComment && maxCommentLength;
        if (lineIsComment && ignoreComments)
          return;
        const loc = {
          start: {
            line: lineNumber,
            column: 0
          },
          end: {
            line: lineNumber,
            column: textToMeasure.length
          }
        };
        if (commentLengthApplies) {
          if (lineLength > maxCommentLength) {
            context.report({
              node,
              loc,
              messageId: "maxComment",
              data: {
                lineLength,
                maxCommentLength
              }
            });
          }
        } else if (lineLength > maxLength) {
          context.report({
            node,
            loc,
            messageId: "max",
            data: {
              lineLength,
              maxLength
            }
          });
        }
      });
    }
    return {
      Program: checkProgramForMaxLength
    };
  }
});

export { maxLen as default };
