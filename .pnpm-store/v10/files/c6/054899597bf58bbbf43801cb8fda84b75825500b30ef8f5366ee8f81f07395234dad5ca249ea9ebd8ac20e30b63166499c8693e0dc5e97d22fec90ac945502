import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var oneVarDeclarationPerLine = createRule({
  name: "one-var-declaration-per-line",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow newlines around variable declarations"
    },
    schema: [
      {
        type: "string",
        enum: ["always", "initializations"]
      }
    ],
    fixable: "whitespace",
    messages: {
      expectVarOnNewline: "Expected variable declaration to be on a new line."
    }
  },
  create(context) {
    const { sourceCode } = context;
    const always = context.options[0] === "always";
    function isForTypeSpecifier(keyword) {
      return keyword === "ForStatement" || keyword === "ForInStatement" || keyword === "ForOfStatement";
    }
    function checkForNewLine(node) {
      if (isForTypeSpecifier(node.parent.type))
        return;
      const declarations = node.declarations;
      let prev;
      declarations.forEach((current) => {
        if (prev && astUtilsExports.isTokenOnSameLine(prev, current)) {
          if (always || prev.init || current.init) {
            let fix = (fixer) => fixer.insertTextBefore(current, "\n");
            const tokenBeforeDeclarator = sourceCode.getTokenBefore(current, { includeComments: false });
            if (tokenBeforeDeclarator) {
              const betweenText = sourceCode.text.slice(
                tokenBeforeDeclarator.range[1],
                current.range[0]
              );
              fix = (fixer) => fixer.replaceTextRange([tokenBeforeDeclarator.range[1], current.range[0]], `${betweenText}
`);
            }
            context.report({
              node,
              messageId: "expectVarOnNewline",
              loc: current.loc,
              fix
            });
          }
        }
        prev = current;
      });
    }
    return {
      VariableDeclaration: checkForNewLine
    };
  }
});

export { oneVarDeclarationPerLine as default };
