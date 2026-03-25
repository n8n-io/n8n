import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const messages = {
  bracketLocation: "The closing bracket must be {{location}}{{details}}"
};
var jsxClosingBracketLocation = createRule({
  name: "jsx-closing-bracket-location",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce closing bracket location in JSX"
    },
    fixable: "code",
    messages,
    schema: [{
      anyOf: [
        {
          type: "string",
          enum: ["after-props", "props-aligned", "tag-aligned", "line-aligned"]
        },
        {
          type: "object",
          properties: {
            location: {
              type: "string",
              enum: ["after-props", "props-aligned", "tag-aligned", "line-aligned"]
            }
          },
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            nonEmpty: {
              oneOf: [
                {
                  type: "string",
                  enum: ["after-props", "props-aligned", "tag-aligned", "line-aligned"]
                },
                {
                  type: "boolean",
                  enum: [false]
                }
              ]
            },
            selfClosing: {
              oneOf: [
                {
                  type: "string",
                  enum: ["after-props", "props-aligned", "tag-aligned", "line-aligned"]
                },
                {
                  type: "boolean",
                  enum: [false]
                }
              ]
            }
          },
          additionalProperties: false
        }
      ]
    }]
  },
  create(context) {
    const MESSAGE_LOCATION = {
      "after-props": "placed after the last prop",
      "after-tag": "placed after the opening tag",
      "props-aligned": "aligned with the last prop",
      "tag-aligned": "aligned with the opening tag",
      "line-aligned": "aligned with the line containing the opening tag"
    };
    const DEFAULT_LOCATION = "tag-aligned";
    const config = context.options[0];
    const options = {
      nonEmpty: DEFAULT_LOCATION,
      selfClosing: DEFAULT_LOCATION
    };
    if (typeof config === "string") {
      options.nonEmpty = config;
      options.selfClosing = config;
    } else if (typeof config === "object") {
      if ("location" in config) {
        options.nonEmpty = config.location;
        options.selfClosing = config.location;
      }
      if ("nonEmpty" in config)
        options.nonEmpty = config.nonEmpty;
      if ("selfClosing" in config)
        options.selfClosing = config.selfClosing;
    }
    function getExpectedLocation(tokens) {
      let location;
      if (typeof tokens.lastProp === "undefined")
        location = "after-tag";
      else if (tokens.opening.line === tokens.lastProp.lastLine)
        location = "after-props";
      else
        location = tokens.selfClosing ? options.selfClosing : options.nonEmpty;
      return location;
    }
    function getCorrectColumn(tokens, expectedLocation) {
      switch (expectedLocation) {
        case "props-aligned":
          return tokens.lastProp.column;
        case "tag-aligned":
          return tokens.opening.column;
        case "line-aligned":
          return tokens.openingStartOfLine.column;
        default:
          return null;
      }
    }
    function hasCorrectLocation(tokens, expectedLocation) {
      switch (expectedLocation) {
        case "after-tag":
          return tokens.tag.line === tokens.closing.line;
        case "after-props":
          return tokens.lastProp.lastLine === tokens.closing.line;
        case "props-aligned":
        case "tag-aligned":
        case "line-aligned": {
          const correctColumn = getCorrectColumn(tokens, expectedLocation);
          return correctColumn === tokens.closing.column;
        }
        default:
          return true;
      }
    }
    function getIndentation(tokens, expectedLocation, correctColumn) {
      const newColumn = correctColumn || 0;
      let indentation;
      let spaces = [];
      switch (expectedLocation) {
        case "props-aligned":
          indentation = /^\s*/.exec(context.sourceCode.lines[tokens.lastProp.firstLine - 1])[0];
          break;
        case "tag-aligned":
        case "line-aligned":
          indentation = /^\s*/.exec(context.sourceCode.lines[tokens.opening.line - 1])[0];
          break;
        default:
          indentation = "";
      }
      if (indentation.length + 1 < newColumn) {
        spaces = Array.from({ length: +correctColumn + 1 - indentation.length });
      }
      return indentation + spaces.join(" ");
    }
    function getTokensLocations(node) {
      const sourceCode = context.sourceCode;
      const opening = sourceCode.getFirstToken(node).loc.start;
      const closing = sourceCode.getLastTokens(node, node.selfClosing ? 2 : 1)[0].loc.start;
      const tag = sourceCode.getFirstToken(node.name).loc.start;
      let lastProp;
      if (node.attributes.length) {
        lastProp = node.attributes[node.attributes.length - 1];
        lastProp = {
          column: sourceCode.getFirstToken(lastProp).loc.start.column,
          firstLine: sourceCode.getFirstToken(lastProp).loc.start.line,
          lastLine: sourceCode.getLastToken(lastProp).loc.end.line
        };
      }
      const openingLine = sourceCode.lines[opening.line - 1];
      const closingLine = sourceCode.lines[closing.line - 1];
      const isTab = {
        openTab: /^\t/.test(openingLine),
        closeTab: /^\t/.test(closingLine)
      };
      const openingStartOfLine = {
        column: /^\s*/.exec(openingLine)?.[0].length,
        line: opening.line
      };
      return {
        isTab,
        tag,
        opening,
        closing,
        lastProp,
        selfClosing: node.selfClosing,
        openingStartOfLine
      };
    }
    return {
      "JSXOpeningElement:exit": function(node) {
        const lastAttributeNode = node.attributes.at(-1);
        const cachedLastAttributeEndPos = lastAttributeNode ? lastAttributeNode.range[1] : null;
        let expectedNextLine;
        const tokens = getTokensLocations(node);
        let expectedLocation = getExpectedLocation(tokens);
        let usingSameIndentation = true;
        if (expectedLocation === "tag-aligned")
          usingSameIndentation = tokens.isTab.openTab === tokens.isTab.closeTab;
        const lastComment = context.sourceCode.getCommentsInside(node).at(-1);
        const hasTrailingComment = lastComment && lastComment.range[0] > (lastAttributeNode ?? node.name).range[1];
        if ((expectedLocation === "after-props" || expectedLocation === "after-tag") && !(hasCorrectLocation(tokens, expectedLocation) && usingSameIndentation) && hasTrailingComment) {
          expectedLocation = "line-aligned";
        }
        if (hasCorrectLocation(tokens, expectedLocation) && usingSameIndentation)
          return;
        const data = {
          location: MESSAGE_LOCATION[expectedLocation],
          details: ""
        };
        const correctColumn = getCorrectColumn(tokens, expectedLocation);
        if (correctColumn !== null) {
          expectedNextLine = tokens.lastProp && tokens.lastProp.lastLine === tokens.closing.line;
          data.details = ` (expected column ${correctColumn + 1}${expectedNextLine ? " on the next line)" : ")"}`;
        }
        context.report({
          node,
          messageId: "bracketLocation",
          loc: tokens.closing,
          data,
          fix(fixer) {
            const closingTag = tokens.selfClosing ? "/>" : ">";
            switch (expectedLocation) {
              case "after-tag":
                if (cachedLastAttributeEndPos)
                  return fixer.replaceTextRange([cachedLastAttributeEndPos, node.range[1]], (expectedNextLine ? "\n" : "") + closingTag);
                return fixer.replaceTextRange([node.name.range[1], node.range[1]], (expectedNextLine ? "\n" : " ") + closingTag);
              case "after-props":
                return fixer.replaceTextRange([cachedLastAttributeEndPos, node.range[1]], (expectedNextLine ? "\n" : "") + closingTag);
              case "props-aligned":
              case "tag-aligned":
              case "line-aligned": {
                const rangeStart = hasTrailingComment ? lastComment.range[1] : cachedLastAttributeEndPos;
                return fixer.replaceTextRange([rangeStart, node.range[1]], `
${getIndentation(tokens, expectedLocation, correctColumn)}${closingTag}`);
              }
            }
            return null;
          }
        });
      }
    };
  }
});

export { jsxClosingBracketLocation as default };
