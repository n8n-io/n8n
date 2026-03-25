import { c as createRule, E as deepMerge, i as isSingleLine } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function isLastTokenEndOfLine(token, line) {
  const positionInLine = token.loc.start.column;
  return positionInLine === line.length - 1;
}
function isCommentsEndOfLine(token, comments, line) {
  if (!comments)
    return false;
  if (comments.loc.end.line > token.loc.end.line)
    return true;
  const positionInLine = comments.loc.end.column;
  return positionInLine === line.length;
}
function makeFixFunction({
  optsNone,
  optsSemi,
  lastToken,
  commentsAfterLastToken,
  missingDelimiter,
  lastTokenLine,
  isSingleLine: isSingleLine2
}) {
  if (optsNone && !isLastTokenEndOfLine(lastToken, lastTokenLine) && !isCommentsEndOfLine(lastToken, commentsAfterLastToken, lastTokenLine) && !isSingleLine2) {
    return;
  }
  return (fixer) => {
    if (optsNone) {
      return fixer.remove(lastToken);
    }
    const token = optsSemi ? ";" : ",";
    if (missingDelimiter) {
      return fixer.insertTextAfter(lastToken, token);
    }
    return fixer.replaceText(lastToken, token);
  };
}
const BASE_SCHEMA = {
  type: "object",
  properties: {
    multiline: {
      type: "object",
      properties: {
        delimiter: { $ref: "#/items/0/$defs/multiLineOption" },
        requireLast: { type: "boolean" }
      },
      additionalProperties: false
    },
    singleline: {
      type: "object",
      properties: {
        delimiter: { $ref: "#/items/0/$defs/singleLineOption" },
        requireLast: { type: "boolean" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};
var memberDelimiterStyle = createRule({
  name: "member-delimiter-style",
  meta: {
    type: "layout",
    docs: {
      description: "Require a specific member delimiter style for interfaces and type literals"
    },
    fixable: "whitespace",
    messages: {
      unexpectedComma: "Unexpected separator (,).",
      unexpectedSemi: "Unexpected separator (;).",
      expectedComma: "Expected a comma.",
      expectedSemi: "Expected a semicolon."
    },
    schema: [
      {
        $defs: {
          multiLineOption: {
            type: "string",
            enum: ["none", "semi", "comma"]
          },
          // note can't have "none" for single line delimiter as it's invalid syntax
          singleLineOption: {
            type: "string",
            enum: ["semi", "comma"]
          },
          // note - need to define this last as it references the enums
          delimiterConfig: BASE_SCHEMA
        },
        type: "object",
        properties: {
          ...BASE_SCHEMA.properties,
          overrides: {
            type: "object",
            properties: {
              interface: {
                $ref: "#/items/0/$defs/delimiterConfig"
              },
              typeLiteral: {
                $ref: "#/items/0/$defs/delimiterConfig"
              }
            },
            additionalProperties: false
          },
          multilineDetection: {
            type: "string",
            enum: ["brackets", "last-member"]
          }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    {
      multiline: {
        delimiter: "semi",
        requireLast: true
      },
      singleline: {
        delimiter: "semi",
        requireLast: false
      },
      multilineDetection: "brackets"
    }
  ],
  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const baseOptions = options;
    const overrides = baseOptions.overrides ?? {};
    const interfaceOptions = deepMerge(
      baseOptions,
      overrides.interface
    );
    const typeLiteralOptions = deepMerge(
      baseOptions,
      overrides.typeLiteral
    );
    function checkLastToken(member, opts, isLast) {
      function getOption(type) {
        if (isLast && !opts.requireLast) {
          return type === "none";
        }
        return opts.delimiter === type;
      }
      let messageId = null;
      let missingDelimiter = false;
      const lastToken = sourceCode.getLastToken(member, {
        includeComments: false
      });
      if (!lastToken)
        return;
      const commentsAfterLastToken = sourceCode.getCommentsAfter(lastToken).pop();
      const sourceCodeLines = sourceCode.getLines();
      const lastTokenLine = sourceCodeLines[lastToken?.loc.start.line - 1];
      const optsSemi = getOption("semi");
      const optsComma = getOption("comma");
      const optsNone = getOption("none");
      if (lastToken.value === ";") {
        if (optsComma) {
          messageId = "expectedComma";
        } else if (optsNone) {
          missingDelimiter = true;
          messageId = "unexpectedSemi";
        }
      } else if (lastToken.value === ",") {
        if (optsSemi) {
          messageId = "expectedSemi";
        } else if (optsNone) {
          missingDelimiter = true;
          messageId = "unexpectedComma";
        }
      } else {
        if (optsSemi) {
          missingDelimiter = true;
          messageId = "expectedSemi";
        } else if (optsComma) {
          missingDelimiter = true;
          messageId = "expectedComma";
        }
      }
      if (messageId) {
        context.report({
          node: lastToken,
          loc: {
            start: {
              line: lastToken.loc.end.line,
              column: lastToken.loc.end.column
            },
            end: {
              line: lastToken.loc.end.line,
              column: lastToken.loc.end.column
            }
          },
          messageId,
          fix: makeFixFunction({
            optsNone,
            optsSemi,
            lastToken,
            commentsAfterLastToken,
            missingDelimiter,
            lastTokenLine,
            isSingleLine: opts.type === "single-line"
          })
        });
      }
    }
    function checkMemberSeparatorStyle(node) {
      const members = node.type === AST_NODE_TYPES.TSInterfaceBody ? node.body : node.members;
      let _isSingleLine = isSingleLine(node);
      if (options.multilineDetection === "last-member" && !_isSingleLine && members.length > 0) {
        const lastMember = members[members.length - 1];
        if (lastMember.loc.end.line === node.loc.end.line)
          _isSingleLine = true;
      }
      const typeOpts = node.type === AST_NODE_TYPES.TSInterfaceBody ? interfaceOptions : typeLiteralOptions;
      const opts = _isSingleLine ? { ...typeOpts.singleline, type: "single-line" } : { ...typeOpts.multiline, type: "multi-line" };
      members.forEach((member, index) => {
        checkLastToken(member, opts ?? {}, index === members.length - 1);
      });
    }
    return {
      TSInterfaceBody: checkMemberSeparatorStyle,
      TSTypeLiteral: checkMemberSeparatorStyle
    };
  }
});

export { memberDelimiterStyle as default };
