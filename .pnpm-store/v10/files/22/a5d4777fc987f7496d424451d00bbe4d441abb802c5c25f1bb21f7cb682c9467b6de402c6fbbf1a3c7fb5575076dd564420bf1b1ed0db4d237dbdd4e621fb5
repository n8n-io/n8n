import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

const listeningNodes = [
  "BreakStatement",
  "ClassDeclaration",
  "ContinueStatement",
  "DebuggerStatement",
  "DoWhileStatement",
  "ExpressionStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "FunctionDeclaration",
  "IfStatement",
  "ImportDeclaration",
  "LabeledStatement",
  "ReturnStatement",
  "SwitchStatement",
  "ThrowStatement",
  "TryStatement",
  "VariableDeclaration",
  "WhileStatement",
  "WithStatement",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration"
];
var maxStatementsPerLine = createRule({
  name: "max-statements-per-line",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce a maximum number of statements allowed per line"
    },
    schema: [
      {
        type: "object",
        properties: {
          max: {
            type: "integer",
            minimum: 1,
            default: 1
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
      }
    ],
    messages: {
      exceed: "This line has {{numberOfStatementsOnThisLine}} {{statements}}. Maximum allowed is {{maxStatementsPerLine}}."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const options = context.options[0] || {};
    const maxStatementsPerLine = typeof options.max !== "undefined" ? options.max : 1;
    const ignoredNodes = options.ignoredNodes || [];
    let lastStatementLine = 0;
    let numberOfStatementsOnThisLine = 0;
    let firstExtraStatement = null;
    const SINGLE_CHILD_ALLOWED = /^(?:(?:DoWhile|For|ForIn|ForOf|If|Labeled|While)Statement|Export(?:Default|Named)Declaration)$/u;
    function reportFirstExtraStatementAndClear() {
      if (firstExtraStatement) {
        context.report({
          node: firstExtraStatement,
          messageId: "exceed",
          data: {
            numberOfStatementsOnThisLine,
            maxStatementsPerLine,
            statements: numberOfStatementsOnThisLine === 1 ? "statement" : "statements"
          }
        });
      }
      firstExtraStatement = null;
    }
    function getActualLastToken(node) {
      return sourceCode.getLastToken(node, astUtilsExports.isNotSemicolonToken);
    }
    function enterStatement(node) {
      const line = node.loc.start.line;
      if (node.parent && SINGLE_CHILD_ALLOWED.test(node.parent.type) && (!("alternate" in node.parent) || node.parent.alternate !== node)) {
        return;
      }
      if (line === lastStatementLine) {
        numberOfStatementsOnThisLine += 1;
      } else {
        reportFirstExtraStatementAndClear();
        numberOfStatementsOnThisLine = 1;
        lastStatementLine = line;
      }
      if (numberOfStatementsOnThisLine === maxStatementsPerLine + 1)
        firstExtraStatement = firstExtraStatement || node;
    }
    function leaveStatement(node) {
      const line = getActualLastToken(node).loc.end.line;
      if (line !== lastStatementLine) {
        reportFirstExtraStatementAndClear();
        numberOfStatementsOnThisLine = 1;
        lastStatementLine = line;
      }
    }
    const listeners = {
      "Program:exit": reportFirstExtraStatementAndClear
    };
    for (const node of listeningNodes) {
      if (ignoredNodes.includes(node))
        continue;
      listeners[node] = enterStatement;
      listeners[`${node}:exit`] = leaveStatement;
    }
    return listeners;
  }
});

export { maxStatementsPerLine as default };
