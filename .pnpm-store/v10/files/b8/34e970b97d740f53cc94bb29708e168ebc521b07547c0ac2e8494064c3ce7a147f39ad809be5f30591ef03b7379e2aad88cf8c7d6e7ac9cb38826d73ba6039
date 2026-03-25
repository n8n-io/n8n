import { c as createRule, D as isHashbangComment, M as LINEBREAKS } from '../utils.js';
import '@typescript-eslint/types';
import { e as escapeStringRegexp } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function escape(s) {
  return `(?:${escapeStringRegexp(s)})`;
}
function escapeAndRepeat(s) {
  return `${escape(s)}+`;
}
function parseMarkersOption(markers) {
  if (!markers.includes("*"))
    return markers.concat("*");
  return markers;
}
function createExceptionsPattern(exceptions) {
  let pattern = "";
  if (exceptions.length === 0) {
    pattern += "\\s";
  } else {
    pattern += "(?:\\s|";
    if (exceptions.length === 1) {
      pattern += escapeAndRepeat(exceptions[0]);
    } else {
      pattern += "(?:";
      pattern += exceptions.map(escapeAndRepeat).join("|");
      pattern += ")";
    }
    pattern += `(?:$|[${Array.from(LINEBREAKS).join("")}]))`;
  }
  return pattern;
}
function createAlwaysStylePattern(markers, exceptions) {
  let pattern = "^";
  if (markers.length === 1) {
    pattern += escape(markers[0]);
  } else {
    pattern += "(?:";
    pattern += markers.map(escape).join("|");
    pattern += ")";
  }
  pattern += "?";
  pattern += createExceptionsPattern(exceptions);
  return new RegExp(pattern, "u");
}
function createNeverStylePattern(markers) {
  const pattern = `^(${markers.map(escape).join("|")})?[ 	]+`;
  return new RegExp(pattern, "u");
}
var spacedComment = createRule({
  name: "spaced-comment",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing after the `//` or `/*` in a comment"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      },
      {
        type: "object",
        properties: {
          exceptions: {
            type: "array",
            items: {
              type: "string"
            }
          },
          markers: {
            type: "array",
            items: {
              type: "string"
            }
          },
          line: {
            type: "object",
            properties: {
              exceptions: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              markers: {
                type: "array",
                items: {
                  type: "string"
                }
              }
            },
            additionalProperties: false
          },
          block: {
            type: "object",
            properties: {
              exceptions: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              markers: {
                type: "array",
                items: {
                  type: "string"
                }
              },
              balanced: {
                type: "boolean",
                default: false
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedSpaceAfterMarker: "Unexpected space or tab after marker ({{refChar}}) in comment.",
      expectedExceptionAfter: "Expected exception block, space or tab after '{{refChar}}' in comment.",
      unexpectedSpaceBefore: "Unexpected space or tab before '*/' in comment.",
      unexpectedSpaceAfter: "Unexpected space or tab after '{{refChar}}' in comment.",
      expectedSpaceBefore: "Expected space or tab before '*/' in comment.",
      expectedSpaceAfter: "Expected space or tab after '{{refChar}}' in comment."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const requireSpace = context.options[0] !== "never";
    const config = context.options[1] || {};
    const balanced = config.block && config.block.balanced;
    const styleRules = ["block", "line"].reduce((rule, type) => {
      const nodeType = type;
      const markers = parseMarkersOption(config[nodeType] && config[nodeType]?.markers || config.markers || []);
      const exceptions = config[nodeType] && config[nodeType]?.exceptions || config.exceptions || [];
      const endNeverPattern = "[ 	]+$";
      rule[nodeType] = {
        beginRegex: requireSpace ? createAlwaysStylePattern(markers, exceptions) : createNeverStylePattern(markers),
        endRegex: balanced && requireSpace ? new RegExp(`${createExceptionsPattern(exceptions)}$`, "u") : new RegExp(endNeverPattern, "u"),
        hasExceptions: exceptions.length > 0,
        captureMarker: new RegExp(`^(${markers.map(escape).join("|")})`, "u"),
        markers: new Set(markers)
      };
      return rule;
    }, {});
    function reportBegin(node, messageId, match, refChar) {
      const type = node.type.toLowerCase();
      const commentIdentifier = type === "block" ? "/*" : "//";
      context.report({
        node,
        fix(fixer) {
          const start = node.range[0];
          let end = start + 2;
          if (requireSpace) {
            if (match)
              end += match[0].length;
            return fixer.insertTextAfterRange([start, end], " ");
          }
          if (match)
            end += match[0].length;
          return fixer.replaceTextRange([start, end], commentIdentifier + (match && match[1] ? match[1] : ""));
        },
        messageId,
        data: { refChar }
      });
    }
    function reportEnd(node, messageId, match) {
      context.report({
        node,
        fix(fixer) {
          if (requireSpace)
            return fixer.insertTextAfterRange([node.range[0], node.range[1] - 2], " ");
          const end = node.range[1] - 2;
          let start = end;
          if (match)
            start -= match[0].length;
          return fixer.replaceTextRange([start, end], "");
        },
        messageId
      });
    }
    function checkCommentForSpace(node) {
      const type = node.type.toLowerCase();
      const rule = styleRules[type];
      const commentIdentifier = type === "block" ? "/*" : "//";
      if (node.value.length === 0 || rule.markers.has(node.value))
        return;
      if (type === "line" && (node.value.startsWith("/ <reference") || node.value.startsWith("/ <amd")))
        return;
      const beginMatch = rule.beginRegex.exec(node.value);
      const endMatch = rule.endRegex.exec(node.value);
      if (requireSpace) {
        if (!beginMatch) {
          const hasMarker = rule.captureMarker.exec(node.value);
          const marker = hasMarker ? commentIdentifier + hasMarker[0] : commentIdentifier;
          if (rule.hasExceptions)
            reportBegin(node, "expectedExceptionAfter", hasMarker, marker);
          else
            reportBegin(node, "expectedSpaceAfter", hasMarker, marker);
        }
        if (balanced && type === "block" && !endMatch)
          reportEnd(node, "expectedSpaceBefore", null);
      } else {
        if (beginMatch) {
          if (!beginMatch[1])
            reportBegin(node, "unexpectedSpaceAfter", beginMatch, commentIdentifier);
          else
            reportBegin(node, "unexpectedSpaceAfterMarker", beginMatch, beginMatch[1]);
        }
        if (balanced && type === "block" && endMatch)
          reportEnd(node, "unexpectedSpaceBefore", endMatch);
      }
    }
    return {
      Program() {
        const comments = sourceCode.getAllComments();
        comments.filter((token) => !isHashbangComment(token)).forEach(checkCommentForSpace);
      }
    };
  }
});

export { spacedComment as default };
