import { c as createRule, i as isSingleLine, y as getStringLength, z as getStaticPropertyName } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const listeningNodes = [
  "ObjectExpression",
  "ObjectPattern",
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportAllDeclaration",
  "TSTypeLiteral",
  "TSInterfaceBody",
  "ClassBody"
];
function initOptionProperty(toOptions, fromOptions) {
  toOptions.mode = fromOptions.mode || "strict";
  if (typeof fromOptions.beforeColon !== "undefined")
    toOptions.beforeColon = +fromOptions.beforeColon;
  else
    toOptions.beforeColon = 0;
  if (typeof fromOptions.afterColon !== "undefined")
    toOptions.afterColon = +fromOptions.afterColon;
  else
    toOptions.afterColon = 1;
  if (typeof fromOptions.align !== "undefined") {
    if (typeof fromOptions.align === "object") {
      toOptions.align = fromOptions.align;
    } else {
      toOptions.align = {
        on: fromOptions.align,
        mode: toOptions.mode,
        beforeColon: toOptions.beforeColon,
        afterColon: toOptions.afterColon
      };
    }
  }
  return toOptions;
}
function initOptions(toOptions, fromOptions) {
  if (typeof fromOptions.align === "object") {
    toOptions.align = initOptionProperty({}, fromOptions.align);
    toOptions.align.on = fromOptions.align.on || "colon";
    toOptions.align.mode = fromOptions.align.mode || "strict";
    toOptions.multiLine = initOptionProperty({}, fromOptions.multiLine || fromOptions);
    toOptions.singleLine = initOptionProperty({}, fromOptions.singleLine || fromOptions);
  } else {
    toOptions.multiLine = initOptionProperty({}, fromOptions.multiLine || fromOptions);
    toOptions.singleLine = initOptionProperty({}, fromOptions.singleLine || fromOptions);
    if (toOptions.multiLine.align) {
      toOptions.align = {
        on: toOptions.multiLine.align.on,
        mode: toOptions.multiLine.align.mode || toOptions.multiLine.mode,
        beforeColon: toOptions.multiLine.align.beforeColon,
        afterColon: toOptions.multiLine.align.afterColon
      };
    }
  }
  toOptions.ignoredNodes = fromOptions.ignoredNodes || [];
  return toOptions;
}
var keySpacing = createRule({
  name: "key-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing between property names and type annotations in types and interfaces"
    },
    fixable: "whitespace",
    schema: [{
      anyOf: [
        {
          type: "object",
          properties: {
            align: {
              anyOf: [
                {
                  type: "string",
                  enum: ["colon", "value"]
                },
                {
                  type: "object",
                  properties: {
                    mode: {
                      type: "string",
                      enum: ["strict", "minimum"]
                    },
                    on: {
                      type: "string",
                      enum: ["colon", "value"]
                    },
                    beforeColon: {
                      type: "boolean"
                    },
                    afterColon: {
                      type: "boolean"
                    }
                  },
                  additionalProperties: false
                }
              ]
            },
            mode: {
              type: "string",
              enum: ["strict", "minimum"]
            },
            beforeColon: {
              type: "boolean"
            },
            afterColon: {
              type: "boolean"
            },
            ignoredNodes: {
              type: "array",
              items: {
                type: "string",
                enum: listeningNodes
              }
            }
          },
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            singleLine: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            },
            multiLine: {
              type: "object",
              properties: {
                align: {
                  anyOf: [
                    {
                      type: "string",
                      enum: ["colon", "value"]
                    },
                    {
                      type: "object",
                      properties: {
                        mode: {
                          type: "string",
                          enum: ["strict", "minimum"]
                        },
                        on: {
                          type: "string",
                          enum: ["colon", "value"]
                        },
                        beforeColon: {
                          type: "boolean"
                        },
                        afterColon: {
                          type: "boolean"
                        }
                      },
                      additionalProperties: false
                    }
                  ]
                },
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            singleLine: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            },
            multiLine: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            },
            align: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["strict", "minimum"]
                },
                on: {
                  type: "string",
                  enum: ["colon", "value"]
                },
                beforeColon: {
                  type: "boolean"
                },
                afterColon: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      ]
    }],
    messages: {
      extraKey: "Extra space after {{computed}}key '{{key}}'.",
      extraValue: "Extra space before value for {{computed}}key '{{key}}'.",
      missingKey: "Missing space after {{computed}}key '{{key}}'.",
      missingValue: "Missing space before value for {{computed}}key '{{key}}'."
    }
  },
  defaultOptions: [{}],
  create(context, [_options]) {
    const options = _options || {};
    const ruleOptions = initOptions({}, options);
    const multiLineOptions = ruleOptions.multiLine;
    const singleLineOptions = ruleOptions.singleLine;
    const alignmentOptions = ruleOptions.align || null;
    const ignoredNodes = ruleOptions.ignoredNodes;
    const sourceCode = context.sourceCode;
    function containsLineTerminator(str) {
      return astUtilsExports.LINEBREAK_MATCHER.test(str);
    }
    function isSingleLineImportAttributes(node, sourceCode2) {
      if (node.type === "TSImportType") {
        if ("options" in node && node.options) {
          return isSingleLine(node.options);
        }
        return false;
      }
      const openingBrace = sourceCode2.getTokenBefore(node.attributes[0], astUtilsExports.isOpeningBraceToken);
      const closingBrace = sourceCode2.getTokenAfter(node.attributes[node.attributes.length - 1], astUtilsExports.isClosingBraceToken);
      return astUtilsExports.isTokenOnSameLine(closingBrace, openingBrace);
    }
    function isSingleLineProperties(properties) {
      const [firstProp] = properties;
      const lastProp = properties.at(-1);
      return astUtilsExports.isTokenOnSameLine(lastProp, firstProp);
    }
    function isKeyValueProperty(property) {
      if (property.type === "ImportAttribute")
        return true;
      return !("method" in property && property.method || "shorthand" in property && property.shorthand || "kind" in property && property.kind !== "init" || property.type !== "Property");
    }
    function getNextColon(node) {
      return sourceCode.getTokenAfter(node, astUtilsExports.isColonToken);
    }
    function getLastTokenBeforeColon(node) {
      const colonToken = getNextColon(node);
      return sourceCode.getTokenBefore(colonToken);
    }
    function getFirstTokenAfterColon(node) {
      const colonToken = getNextColon(node);
      return sourceCode.getTokenAfter(colonToken);
    }
    function continuesPropertyGroup(lastMember, candidate) {
      const groupEndLine = lastMember.loc.start.line;
      const candidateValueStartLine = (isKeyValueProperty(candidate) ? getFirstTokenAfterColon(candidate.key) : candidate).loc.start.line;
      if (candidateValueStartLine - groupEndLine <= 1)
        return true;
      const leadingComments = sourceCode.getCommentsBefore(candidate);
      if (leadingComments.length && leadingComments[0].loc.start.line - groupEndLine <= 1 && candidateValueStartLine - leadingComments.at(-1).loc.end.line <= 1) {
        for (let i = 1; i < leadingComments.length; i++) {
          if (leadingComments[i].loc.start.line - leadingComments[i - 1].loc.end.line > 1)
            return false;
        }
        return true;
      }
      return false;
    }
    function getKey(property) {
      const key = property.key;
      if (property.type !== "ImportAttribute" && property.computed)
        return sourceCode.getText().slice(key.range[0], key.range[1]);
      return getStaticPropertyName(property);
    }
    function report(property, side, whitespace, expected, mode) {
      const diff = whitespace.length - expected;
      if ((diff && mode === "strict" || diff < 0 && mode === "minimum" || diff > 0 && !expected && mode === "minimum") && !(expected && containsLineTerminator(whitespace))) {
        const nextColon = getNextColon(property.key);
        const tokenBeforeColon = sourceCode.getTokenBefore(nextColon, { includeComments: true });
        const tokenAfterColon = sourceCode.getTokenAfter(nextColon, { includeComments: true });
        const isKeySide = side === "key";
        const isExtra = diff > 0;
        const diffAbs = Math.abs(diff);
        const spaces = new Array(diffAbs + 1).join(" ");
        const locStart = isKeySide ? tokenBeforeColon.loc.end : nextColon.loc.start;
        const locEnd = isKeySide ? nextColon.loc.start : tokenAfterColon.loc.start;
        const missingLoc = isKeySide ? tokenBeforeColon.loc : tokenAfterColon.loc;
        const loc = isExtra ? { start: locStart, end: locEnd } : missingLoc;
        let fix;
        if (isExtra) {
          let range;
          if (isKeySide)
            range = [tokenBeforeColon.range[1], tokenBeforeColon.range[1] + diffAbs];
          else
            range = [tokenAfterColon.range[0] - diffAbs, tokenAfterColon.range[0]];
          fix = function(fixer) {
            return fixer.removeRange(range);
          };
        } else {
          if (isKeySide) {
            fix = function(fixer) {
              return fixer.insertTextAfter(tokenBeforeColon, spaces);
            };
          } else {
            fix = function(fixer) {
              return fixer.insertTextBefore(tokenAfterColon, spaces);
            };
          }
        }
        let messageId;
        if (isExtra)
          messageId = side === "key" ? "extraKey" : "extraValue";
        else
          messageId = side === "key" ? "missingKey" : "missingValue";
        context.report({
          node: property[side],
          loc,
          messageId,
          data: {
            computed: property.type !== "ImportAttribute" && property.computed ? "computed " : "",
            key: getKey(property)
          },
          fix
        });
      }
    }
    function getKeyWidth(property) {
      const startToken = sourceCode.getFirstToken(property);
      const endToken = getLastTokenBeforeColon(property.key);
      return getStringLength(sourceCode.getText().slice(startToken.range[0], endToken.range[1]));
    }
    function getPropertyWhitespace(property) {
      const whitespace = /(\s*):(\s*)/u.exec(sourceCode.getText().slice(
        property.key.range[1],
        property.value.range[0]
      ));
      if (whitespace) {
        return {
          beforeColon: whitespace[1],
          afterColon: whitespace[2]
        };
      }
      return null;
    }
    function createGroups(properties) {
      if (properties.length === 1)
        return [properties];
      return properties.reduce((groups, property) => {
        const currentGroup = groups.at(-1);
        const prev = currentGroup.at(-1);
        if (!prev || continuesPropertyGroup(prev, property))
          currentGroup.push(property);
        else
          groups.push([property]);
        return groups;
      }, [
        []
      ]);
    }
    function verifyGroupAlignment(properties) {
      const length = properties.length;
      const widths = properties.map(getKeyWidth);
      const align = alignmentOptions.on;
      let targetWidth = Math.max(...widths);
      let beforeColon;
      let afterColon;
      let mode;
      if (alignmentOptions && length > 1) {
        beforeColon = alignmentOptions.beforeColon;
        afterColon = alignmentOptions.afterColon;
        mode = alignmentOptions.mode;
      } else {
        beforeColon = multiLineOptions.beforeColon;
        afterColon = multiLineOptions.afterColon;
        mode = alignmentOptions.mode;
      }
      targetWidth += align === "colon" ? beforeColon : afterColon;
      for (let i = 0; i < length; i++) {
        const property = properties[i];
        const whitespace = getPropertyWhitespace(property);
        if (whitespace) {
          const width = widths[i];
          if (align === "value") {
            report(property, "key", whitespace.beforeColon, beforeColon, mode);
            report(property, "value", whitespace.afterColon, targetWidth - width, mode);
          } else {
            report(property, "key", whitespace.beforeColon, targetWidth - width, mode);
            report(property, "value", whitespace.afterColon, afterColon, mode);
          }
        }
      }
    }
    function verifySpacing(node, lineOptions) {
      if (ignoredNodes.includes(node.parent.type))
        return;
      const actual = getPropertyWhitespace(node);
      if (actual) {
        report(node, "key", actual.beforeColon, lineOptions.beforeColon, lineOptions.mode);
        report(node, "value", actual.afterColon, lineOptions.afterColon, lineOptions.mode);
      }
    }
    function verifyListSpacing(properties, lineOptions) {
      const length = properties.length;
      for (let i = 0; i < length; i++)
        verifySpacing(properties[i], lineOptions);
    }
    function verifyAlignment(properties) {
      createGroups(properties).forEach((group) => {
        const properties2 = group.filter(isKeyValueProperty);
        if (properties2.length > 0 && isSingleLineProperties(properties2))
          verifyListSpacing(properties2, multiLineOptions);
        else
          verifyGroupAlignment(properties2);
      });
    }
    function verifyImportAttributes(node) {
      if (ignoredNodes.includes(node.type))
        return;
      if (!node.attributes)
        return;
      if (!node.attributes.length)
        return;
      if (isSingleLineImportAttributes(node, sourceCode))
        verifyListSpacing(node.attributes, singleLineOptions);
      else
        verifyAlignment(node.attributes);
    }
    const baseRules = alignmentOptions ? {
      // Verify vertical alignment
      ObjectExpression(node) {
        if (ignoredNodes.includes(node.type))
          return;
        if (isSingleLine(node))
          verifyListSpacing(node.properties.filter(isKeyValueProperty), singleLineOptions);
        else
          verifyAlignment(node.properties);
      },
      ImportDeclaration(node) {
        verifyImportAttributes(node);
      },
      ExportNamedDeclaration(node) {
        verifyImportAttributes(node);
      },
      ExportAllDeclaration(node) {
        verifyImportAttributes(node);
      }
    } : {
      // Obey beforeColon and afterColon in each property as configured
      Property(node) {
        verifySpacing(node, isSingleLine(node.parent) ? singleLineOptions : multiLineOptions);
      },
      ImportAttribute(node) {
        const parent = node.parent;
        verifySpacing(node, isSingleLineImportAttributes(parent, sourceCode) ? singleLineOptions : multiLineOptions);
      }
    };
    function adjustedColumn(position) {
      const line = position.line - 1;
      return getStringLength(
        sourceCode.lines.at(line).slice(0, position.column)
      );
    }
    function isKeyTypeNode(node) {
      return (node.type === AST_NODE_TYPES.TSPropertySignature || node.type === AST_NODE_TYPES.TSIndexSignature || node.type === AST_NODE_TYPES.PropertyDefinition) && !!node.typeAnnotation;
    }
    function isApplicable(node) {
      return isKeyTypeNode(node) && astUtilsExports.isTokenOnSameLine(node, node.typeAnnotation);
    }
    function getKeyText(node) {
      if (node.type !== AST_NODE_TYPES.TSIndexSignature)
        return sourceCode.getText(node.key);
      const code = sourceCode.getText(node);
      return code.slice(
        0,
        sourceCode.getTokenAfter(
          node.parameters.at(-1),
          astUtilsExports.isClosingBracketToken
        ).range[1] - node.range[0]
      );
    }
    function getKeyLocEnd(node) {
      return getLastTokenBeforeColon(
        node.type !== AST_NODE_TYPES.TSIndexSignature ? node.key : node.parameters.at(-1)
      ).loc.end;
    }
    function checkBeforeColon(node, expectedWhitespaceBeforeColon, mode) {
      const { typeAnnotation } = node;
      const colon = typeAnnotation.loc.start.column;
      const keyEnd = getKeyLocEnd(node);
      const difference = colon - keyEnd.column - expectedWhitespaceBeforeColon;
      if (mode === "strict" ? difference : difference < 0) {
        context.report({
          node,
          messageId: difference > 0 ? "extraKey" : "missingKey",
          fix: (fixer) => {
            if (difference > 0) {
              return fixer.removeRange([
                typeAnnotation.range[0] - difference,
                typeAnnotation.range[0]
              ]);
            }
            return fixer.insertTextBefore(
              typeAnnotation,
              " ".repeat(-difference)
            );
          },
          data: {
            computed: "",
            key: getKeyText(node)
          }
        });
      }
    }
    function checkAfterColon(node, expectedWhitespaceAfterColon, mode) {
      const { typeAnnotation } = node;
      const colonToken = sourceCode.getFirstToken(typeAnnotation);
      const typeStart = sourceCode.getTokenAfter(colonToken, {
        includeComments: true
      }).loc.start.column;
      const difference = typeStart - colonToken.loc.start.column - 1 - expectedWhitespaceAfterColon;
      if (mode === "strict" ? difference : difference < 0) {
        context.report({
          node,
          messageId: difference > 0 ? "extraValue" : "missingValue",
          fix: (fixer) => {
            if (difference > 0) {
              return fixer.removeRange([
                colonToken.range[1],
                colonToken.range[1] + difference
              ]);
            }
            return fixer.insertTextAfter(colonToken, " ".repeat(-difference));
          },
          data: {
            computed: "",
            key: getKeyText(node)
          }
        });
      }
    }
    function continuesAlignGroup(lastMember, candidate) {
      const groupEndLine = lastMember.loc.start.line;
      const candidateValueStartLine = (isKeyTypeNode(candidate) ? candidate.typeAnnotation : candidate).loc.start.line;
      if (candidateValueStartLine === groupEndLine)
        return false;
      if (candidateValueStartLine - groupEndLine === 1)
        return true;
      const leadingComments = sourceCode.getCommentsBefore(candidate);
      if (leadingComments.length && leadingComments[0].loc.start.line - groupEndLine <= 1 && candidateValueStartLine - leadingComments.at(-1).loc.end.line <= 1) {
        for (let i = 1; i < leadingComments.length; i++) {
          if (leadingComments[i].loc.start.line - leadingComments[i - 1].loc.end.line > 1) {
            return false;
          }
        }
        return true;
      }
      return false;
    }
    function checkAlignGroup(group) {
      let alignColumn = 0;
      const align = (typeof options.align === "object" ? options.align.on : typeof options.multiLine?.align === "object" ? options.multiLine.align.on : options.multiLine?.align ?? options.align) ?? "colon";
      const beforeColon = (typeof options.align === "object" ? options.align.beforeColon : options.multiLine ? typeof options.multiLine.align === "object" ? options.multiLine.align.beforeColon : options.multiLine.beforeColon : options.beforeColon) ?? false;
      const expectedWhitespaceBeforeColon = beforeColon ? 1 : 0;
      const afterColon = (typeof options.align === "object" ? options.align.afterColon : options.multiLine ? typeof options.multiLine.align === "object" ? options.multiLine.align.afterColon : options.multiLine.afterColon : options.afterColon) ?? true;
      const expectedWhitespaceAfterColon = afterColon ? 1 : 0;
      const mode = (typeof options.align === "object" ? options.align.mode : options.multiLine ? typeof options.multiLine.align === "object" ? options.multiLine.align.mode ?? options.multiLine.mode : options.multiLine.mode : options.mode) ?? "strict";
      for (const node of group) {
        if (isKeyTypeNode(node)) {
          const keyEnd = adjustedColumn(getKeyLocEnd(node));
          alignColumn = Math.max(
            alignColumn,
            align === "colon" ? keyEnd + expectedWhitespaceBeforeColon : keyEnd + ":".length + expectedWhitespaceAfterColon + expectedWhitespaceBeforeColon
          );
        }
      }
      for (const node of group) {
        if (!isApplicable(node))
          continue;
        const { typeAnnotation } = node;
        const toCheck = align === "colon" ? typeAnnotation : typeAnnotation.typeAnnotation;
        const difference = adjustedColumn(toCheck.loc.start) - alignColumn;
        if (difference) {
          context.report({
            node,
            messageId: difference > 0 ? align === "colon" ? "extraKey" : "extraValue" : align === "colon" ? "missingKey" : "missingValue",
            fix: (fixer) => {
              if (difference > 0) {
                return fixer.removeRange([
                  toCheck.range[0] - difference,
                  toCheck.range[0]
                ]);
              }
              return fixer.insertTextBefore(toCheck, " ".repeat(-difference));
            },
            data: {
              computed: "",
              key: getKeyText(node)
            }
          });
        }
        if (align === "colon")
          checkAfterColon(node, expectedWhitespaceAfterColon, mode);
        else
          checkBeforeColon(node, expectedWhitespaceBeforeColon, mode);
      }
    }
    function checkIndividualNode(node, { singleLine }) {
      const beforeColon = (singleLine ? options.singleLine ? options.singleLine.beforeColon : options.beforeColon : options.multiLine ? options.multiLine.beforeColon : options.beforeColon) ?? false;
      const expectedWhitespaceBeforeColon = beforeColon ? 1 : 0;
      const afterColon = (singleLine ? options.singleLine ? options.singleLine.afterColon : options.afterColon : options.multiLine ? options.multiLine.afterColon : options.afterColon) ?? true;
      const expectedWhitespaceAfterColon = afterColon ? 1 : 0;
      const mode = (singleLine ? options.singleLine ? options.singleLine.mode : options.mode : options.multiLine ? options.multiLine.mode : options.mode) ?? "strict";
      if (isApplicable(node)) {
        checkBeforeColon(node, expectedWhitespaceBeforeColon, mode);
        checkAfterColon(node, expectedWhitespaceAfterColon, mode);
      }
    }
    function validateBody(body) {
      if (ignoredNodes.includes(body.type))
        return;
      const members = body.type === AST_NODE_TYPES.TSTypeLiteral ? body.members : body.body;
      let alignGroups = [];
      let unalignedElements = [];
      if (options.align || options.multiLine?.align) {
        let currentAlignGroup = [];
        alignGroups.push(currentAlignGroup);
        let prevNode;
        for (const node of members) {
          let prevAlignedNode = currentAlignGroup.at(-1);
          if (prevAlignedNode !== prevNode)
            prevAlignedNode = void 0;
          if (prevAlignedNode && continuesAlignGroup(prevAlignedNode, node)) {
            currentAlignGroup.push(node);
          } else if (prevNode?.loc.start.line === node.loc.start.line) {
            if (prevAlignedNode) {
              unalignedElements.push(prevAlignedNode);
              currentAlignGroup.pop();
            }
            unalignedElements.push(node);
          } else {
            currentAlignGroup = [node];
            alignGroups.push(currentAlignGroup);
          }
          prevNode = node;
        }
        unalignedElements = unalignedElements.concat(
          ...alignGroups.filter((group) => group.length === 1)
        );
        alignGroups = alignGroups.filter((group) => group.length >= 2);
      } else {
        unalignedElements = members;
      }
      for (const group of alignGroups)
        checkAlignGroup(group);
      for (const node of unalignedElements)
        checkIndividualNode(node, { singleLine: isSingleLine(body) });
    }
    return {
      ...baseRules,
      TSTypeLiteral: validateBody,
      TSInterfaceBody: validateBody,
      ClassBody: validateBody
    };
  }
});

export { keySpacing as default };
