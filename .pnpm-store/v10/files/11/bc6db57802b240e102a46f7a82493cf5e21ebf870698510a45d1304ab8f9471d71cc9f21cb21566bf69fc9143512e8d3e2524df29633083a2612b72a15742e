import { c as createRule, D as isHashbangComment, C as COMMENTS_IGNORE_PATTERN } from '../utils.js';
import { AST_TOKEN_TYPES, AST_NODE_TYPES } from '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function getEmptyLineNums(lines) {
  const emptyLines = lines.map((line, i) => ({
    code: line.trim(),
    num: i + 1
  })).filter((line) => !line.code).map((line) => line.num);
  return emptyLines;
}
function getCommentLineNums(comments) {
  const lines = [];
  comments.forEach((token) => {
    const start = token.loc.start.line;
    const end = token.loc.end.line;
    lines.push(start, end);
  });
  return lines;
}
var linesAroundComment = createRule({
  name: "lines-around-comment",
  meta: {
    type: "layout",
    docs: {
      description: "Require empty lines around comments"
    },
    schema: [
      {
        type: "object",
        properties: {
          beforeBlockComment: {
            type: "boolean",
            default: true
          },
          afterBlockComment: {
            type: "boolean",
            default: false
          },
          beforeLineComment: {
            type: "boolean",
            default: false
          },
          afterLineComment: {
            type: "boolean",
            default: false
          },
          allowBlockStart: {
            type: "boolean",
            default: false
          },
          allowBlockEnd: {
            type: "boolean",
            default: false
          },
          allowClassStart: {
            type: "boolean"
          },
          allowClassEnd: {
            type: "boolean"
          },
          allowObjectStart: {
            type: "boolean"
          },
          allowObjectEnd: {
            type: "boolean"
          },
          allowArrayStart: {
            type: "boolean"
          },
          allowArrayEnd: {
            type: "boolean"
          },
          allowInterfaceStart: {
            type: "boolean"
          },
          allowInterfaceEnd: {
            type: "boolean"
          },
          allowTypeStart: {
            type: "boolean"
          },
          allowTypeEnd: {
            type: "boolean"
          },
          allowEnumStart: {
            type: "boolean"
          },
          allowEnumEnd: {
            type: "boolean"
          },
          allowModuleStart: {
            type: "boolean"
          },
          allowModuleEnd: {
            type: "boolean"
          },
          ignorePattern: {
            type: "string"
          },
          applyDefaultIgnorePatterns: {
            type: "boolean"
          },
          afterHashbangComment: {
            type: "boolean"
          }
        },
        additionalProperties: false
      }
    ],
    fixable: "whitespace",
    messages: {
      after: "Expected line after comment.",
      before: "Expected line before comment."
    }
  },
  defaultOptions: [
    {
      beforeBlockComment: true
    }
  ],
  create(context, [_options]) {
    const options = _options;
    const defaultIgnoreRegExp = COMMENTS_IGNORE_PATTERN;
    const customIgnoreRegExp = new RegExp(options.ignorePattern ?? "", "u");
    const sourceCode = context.sourceCode;
    const comments = sourceCode.getAllComments();
    const lines = sourceCode.lines;
    const numLines = lines.length + 1;
    const commentLines = getCommentLineNums(comments);
    const emptyLines = getEmptyLineNums(lines);
    const commentAndEmptyLines = new Set(commentLines.concat(emptyLines));
    function codeAroundComment(token) {
      let currentToken = token;
      do {
        currentToken = sourceCode.getTokenBefore(currentToken, {
          includeComments: true
        });
      } while (currentToken && astUtilsExports.isCommentToken(currentToken));
      if (currentToken && astUtilsExports.isTokenOnSameLine(currentToken, token))
        return true;
      currentToken = token;
      do {
        currentToken = sourceCode.getTokenAfter(currentToken, {
          includeComments: true
        });
      } while (currentToken && astUtilsExports.isCommentToken(currentToken));
      if (currentToken && astUtilsExports.isTokenOnSameLine(token, currentToken))
        return true;
      return false;
    }
    function isParentNodeType(parent, nodeType) {
      return parent.type === nodeType;
    }
    function getParentNodeOfToken(token) {
      const node = sourceCode.getNodeByRangeIndex(token.range[0]);
      if (node && node.type === "StaticBlock") {
        const openingBrace = sourceCode.getFirstToken(node, { skip: 1 });
        return openingBrace && token.range[0] >= openingBrace.range[0] ? node : null;
      }
      return node;
    }
    function isCommentAtParentStart(token, nodeType) {
      const parent = getParentNodeOfToken(token);
      if (parent && isParentNodeType(parent, nodeType)) {
        let parentStartNodeOrToken = parent;
        if (parent.type === "StaticBlock") {
          parentStartNodeOrToken = sourceCode.getFirstToken(parent, { skip: 1 });
        } else if (parent.type === "SwitchStatement") {
          parentStartNodeOrToken = sourceCode.getTokenAfter(parent.discriminant, {
            filter: astUtilsExports.isOpeningBraceToken
          });
        }
        return !!parentStartNodeOrToken && token.loc.start.line - parentStartNodeOrToken.loc.start.line === 1;
      }
      return false;
    }
    function isCommentAtParentEnd(token, nodeType) {
      const parent = getParentNodeOfToken(token);
      return !!parent && isParentNodeType(parent, nodeType) && parent.loc.end.line - token.loc.end.line === 1;
    }
    function isCommentAtBlockStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.ClassBody) || isCommentAtParentStart(token, AST_NODE_TYPES.BlockStatement) || isCommentAtParentStart(token, AST_NODE_TYPES.StaticBlock) || isCommentAtParentStart(token, AST_NODE_TYPES.SwitchCase) || isCommentAtParentStart(token, AST_NODE_TYPES.SwitchStatement);
    }
    function isCommentAtBlockEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.ClassBody) || isCommentAtParentEnd(token, AST_NODE_TYPES.BlockStatement) || isCommentAtParentEnd(token, AST_NODE_TYPES.StaticBlock) || isCommentAtParentEnd(token, AST_NODE_TYPES.SwitchCase) || isCommentAtParentEnd(token, AST_NODE_TYPES.SwitchStatement);
    }
    function isCommentAtClassStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.ClassBody);
    }
    function isCommentAtClassEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.ClassBody);
    }
    function isCommentAtObjectStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.ObjectExpression) || isCommentAtParentStart(token, AST_NODE_TYPES.ObjectPattern);
    }
    function isCommentAtObjectEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.ObjectExpression) || isCommentAtParentEnd(token, AST_NODE_TYPES.ObjectPattern);
    }
    function isCommentAtArrayStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.ArrayExpression) || isCommentAtParentStart(token, AST_NODE_TYPES.ArrayPattern);
    }
    function isCommentAtArrayEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.ArrayExpression) || isCommentAtParentEnd(token, AST_NODE_TYPES.ArrayPattern);
    }
    function isCommentAtInterfaceStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.TSInterfaceBody);
    }
    function isCommentAtInterfaceEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.TSInterfaceBody);
    }
    function isCommentAtTypeStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.TSTypeLiteral);
    }
    function isCommentAtTypeEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.TSTypeLiteral);
    }
    function isCommentAtEnumStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.TSEnumBody) || isCommentAtParentStart(token, AST_NODE_TYPES.TSEnumDeclaration);
    }
    function isCommentAtEnumEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.TSEnumBody) || isCommentAtParentEnd(token, AST_NODE_TYPES.TSEnumDeclaration);
    }
    function isCommentAtModuleStart(token) {
      return isCommentAtParentStart(token, AST_NODE_TYPES.TSModuleBlock);
    }
    function isCommentAtModuleEnd(token) {
      return isCommentAtParentEnd(token, AST_NODE_TYPES.TSModuleBlock);
    }
    function checkForEmptyLine(token, { before, after }) {
      if (options.applyDefaultIgnorePatterns !== false && defaultIgnoreRegExp.test(token.value)) {
        return;
      }
      if (options.ignorePattern && customIgnoreRegExp.test(token.value))
        return;
      const prevLineNum = token.loc.start.line - 1;
      const nextLineNum = token.loc.end.line + 1;
      if (prevLineNum < 1)
        before = false;
      if (nextLineNum >= numLines)
        after = false;
      if (codeAroundComment(token))
        return;
      const blockStartAllowed = Boolean(options.allowBlockStart) && isCommentAtBlockStart(token) && !(options.allowClassStart === false && isCommentAtClassStart(token));
      const blockEndAllowed = Boolean(options.allowBlockEnd) && isCommentAtBlockEnd(token) && !(options.allowClassEnd === false && isCommentAtClassEnd(token));
      const classStartAllowed = Boolean(options.allowClassStart) && isCommentAtClassStart(token);
      const classEndAllowed = Boolean(options.allowClassEnd) && isCommentAtClassEnd(token);
      const objectStartAllowed = Boolean(options.allowObjectStart) && isCommentAtObjectStart(token);
      const objectEndAllowed = Boolean(options.allowObjectEnd) && isCommentAtObjectEnd(token);
      const arrayStartAllowed = Boolean(options.allowArrayStart) && isCommentAtArrayStart(token);
      const arrayEndAllowed = Boolean(options.allowArrayEnd) && isCommentAtArrayEnd(token);
      const interfaceStartAllowed = Boolean(options.allowInterfaceStart) && isCommentAtInterfaceStart(token);
      const interfaceEndAllowed = Boolean(options.allowInterfaceEnd) && isCommentAtInterfaceEnd(token);
      const typeStartAllowed = Boolean(options.allowTypeStart) && isCommentAtTypeStart(token);
      const typeEndAllowed = Boolean(options.allowTypeEnd) && isCommentAtTypeEnd(token);
      const enumStartAllowed = Boolean(options.allowEnumStart) && isCommentAtEnumStart(token);
      const enumEndAllowed = Boolean(options.allowEnumEnd) && isCommentAtEnumEnd(token);
      const moduleStartAllowed = Boolean(options.allowModuleStart) && isCommentAtModuleStart(token);
      const moduleEndAllowed = Boolean(options.allowModuleEnd) && isCommentAtModuleEnd(token);
      const exceptionStartAllowed = blockStartAllowed || classStartAllowed || objectStartAllowed || arrayStartAllowed || interfaceStartAllowed || typeStartAllowed || enumStartAllowed || moduleStartAllowed;
      const exceptionEndAllowed = blockEndAllowed || classEndAllowed || objectEndAllowed || arrayEndAllowed || interfaceEndAllowed || typeEndAllowed || enumEndAllowed || moduleEndAllowed;
      const previousTokenOrComment = sourceCode.getTokenBefore(token, {
        includeComments: true
      });
      const nextTokenOrComment = sourceCode.getTokenAfter(token, {
        includeComments: true
      });
      if (!exceptionStartAllowed && before && !commentAndEmptyLines.has(prevLineNum) && !(astUtilsExports.isCommentToken(previousTokenOrComment) && astUtilsExports.isTokenOnSameLine(previousTokenOrComment, token))) {
        const lineStart = token.range[0] - token.loc.start.column;
        const range = [lineStart, lineStart];
        context.report({
          node: token,
          messageId: "before",
          fix(fixer) {
            return fixer.insertTextBeforeRange(range, "\n");
          }
        });
      }
      if (!exceptionEndAllowed && after && !commentAndEmptyLines.has(nextLineNum) && !(astUtilsExports.isCommentToken(nextTokenOrComment) && astUtilsExports.isTokenOnSameLine(token, nextTokenOrComment))) {
        context.report({
          node: token,
          messageId: "after",
          fix(fixer) {
            return fixer.insertTextAfter(token, "\n");
          }
        });
      }
    }
    return {
      Program() {
        comments.forEach((token) => {
          if (token.type === AST_TOKEN_TYPES.Line) {
            if (options.beforeLineComment || options.afterLineComment) {
              checkForEmptyLine(token, {
                after: options.afterLineComment,
                before: options.beforeLineComment
              });
            }
          } else if (token.type === AST_TOKEN_TYPES.Block) {
            if (options.beforeBlockComment || options.afterBlockComment) {
              checkForEmptyLine(token, {
                after: options.afterBlockComment,
                before: options.beforeBlockComment
              });
            }
          } else if (isHashbangComment(token)) {
            if (options.afterHashbangComment) {
              checkForEmptyLine(token, {
                after: options.afterHashbangComment,
                before: false
              });
            }
          }
        });
      }
    };
  }
});

export { linesAroundComment as default };
