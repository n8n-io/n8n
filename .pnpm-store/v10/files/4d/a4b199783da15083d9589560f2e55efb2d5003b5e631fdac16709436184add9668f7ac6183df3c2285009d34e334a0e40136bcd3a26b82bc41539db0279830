import { c as createRule, g as getNextLocation } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const OPTION_VALUE_SCHEME = [
  "always-multiline",
  "always",
  "never",
  "only-multiline"
];
var commaDangle = createRule({
  name: "comma-dangle",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow trailing commas"
    },
    schema: {
      $defs: {
        value: {
          type: "string",
          enum: OPTION_VALUE_SCHEME
        },
        valueWithIgnore: {
          type: "string",
          enum: [...OPTION_VALUE_SCHEME, "ignore"]
        }
      },
      type: "array",
      items: [
        {
          oneOf: [
            {
              $ref: "#/$defs/value"
            },
            {
              type: "object",
              properties: {
                arrays: { $ref: "#/$defs/valueWithIgnore" },
                objects: { $ref: "#/$defs/valueWithIgnore" },
                imports: { $ref: "#/$defs/valueWithIgnore" },
                exports: { $ref: "#/$defs/valueWithIgnore" },
                functions: { $ref: "#/$defs/valueWithIgnore" },
                importAttributes: { $ref: "#/$defs/valueWithIgnore" },
                dynamicImports: { $ref: "#/$defs/valueWithIgnore" },
                enums: { $ref: "#/$defs/valueWithIgnore" },
                generics: { $ref: "#/$defs/valueWithIgnore" },
                tuples: { $ref: "#/$defs/valueWithIgnore" }
              },
              additionalProperties: false
            }
          ]
        }
      ],
      additionalItems: false
    },
    fixable: "code",
    messages: {
      unexpected: "Unexpected trailing comma.",
      missing: "Missing trailing comma."
    }
  },
  defaultOptions: ["never"],
  create(context, [options]) {
    function normalizeOptions(options2 = {}, ecmaVersion2) {
      const DEFAULT_OPTION_VALUE = "never";
      if (typeof options2 === "string") {
        return {
          arrays: options2,
          objects: options2,
          imports: options2,
          exports: options2,
          functions: !ecmaVersion2 || ecmaVersion2 === "latest" ? options2 : ecmaVersion2 < 2017 ? "ignore" : options2,
          importAttributes: options2,
          dynamicImports: !ecmaVersion2 || ecmaVersion2 === "latest" ? options2 : ecmaVersion2 < 2025 ? "ignore" : options2,
          enums: options2,
          generics: options2,
          tuples: options2
        };
      }
      return {
        arrays: options2.arrays ?? DEFAULT_OPTION_VALUE,
        objects: options2.objects ?? DEFAULT_OPTION_VALUE,
        imports: options2.imports ?? DEFAULT_OPTION_VALUE,
        exports: options2.exports ?? DEFAULT_OPTION_VALUE,
        functions: options2.functions ?? DEFAULT_OPTION_VALUE,
        importAttributes: options2.importAttributes ?? DEFAULT_OPTION_VALUE,
        dynamicImports: options2.dynamicImports ?? DEFAULT_OPTION_VALUE,
        enums: options2.enums ?? DEFAULT_OPTION_VALUE,
        generics: options2.generics ?? DEFAULT_OPTION_VALUE,
        tuples: options2.tuples ?? DEFAULT_OPTION_VALUE
      };
    }
    const ecmaVersion = context?.languageOptions?.ecmaVersion ?? context.parserOptions.ecmaVersion;
    const normalizedOptions = normalizeOptions(options, ecmaVersion);
    const isTSX = context.parserOptions?.ecmaFeatures?.jsx && context.filename?.endsWith(".tsx");
    const sourceCode = context.sourceCode;
    const closeBraces = ["}", "]", ")", ">"];
    const predicate = {
      "always": forceTrailingComma,
      "always-multiline": forceTrailingCommaIfMultiline,
      "only-multiline": allowTrailingCommaIfMultiline,
      "never": forbidTrailingComma,
      // https://github.com/typescript-eslint/typescript-eslint/issues/7220
      "ignore": () => {
      }
    };
    function last(nodes) {
      if (!nodes)
        return null;
      return nodes[nodes.length - 1] ?? null;
    }
    function getTrailingToken(info) {
      switch (info.node.type) {
        case "ObjectExpression":
        case "ArrayExpression":
        case "CallExpression":
        case "NewExpression":
        case "ImportExpression":
          return sourceCode.getLastToken(info.node, 1);
        default: {
          const lastItem = info.lastItem;
          if (!lastItem)
            return null;
          const nextToken = sourceCode.getTokenAfter(lastItem);
          if (astUtilsExports.isCommaToken(nextToken))
            return nextToken;
          return sourceCode.getLastToken(lastItem);
        }
      }
    }
    function isMultiline(info) {
      const lastItem = info.lastItem;
      if (!lastItem)
        return false;
      const penultimateToken = getTrailingToken(info);
      if (!penultimateToken)
        return false;
      const lastToken = sourceCode.getTokenAfter(penultimateToken);
      if (!lastToken)
        return false;
      return lastToken.loc.end.line !== penultimateToken.loc.end.line;
    }
    function isTrailingCommaAllowed(lastItem) {
      return lastItem.type !== "RestElement";
    }
    function forbidTrailingComma(info) {
      if (isTSX && info.node.type === AST_NODE_TYPES.TSTypeParameterDeclaration && info.node.params.length === 1)
        return;
      const lastItem = info.lastItem;
      if (!lastItem)
        return;
      const trailingToken = getTrailingToken(info);
      if (trailingToken && astUtilsExports.isCommaToken(trailingToken)) {
        context.report({
          node: lastItem,
          loc: trailingToken.loc,
          messageId: "unexpected",
          *fix(fixer) {
            yield fixer.remove(trailingToken);
            yield fixer.insertTextBefore(sourceCode.getTokenBefore(trailingToken), "");
            yield fixer.insertTextAfter(sourceCode.getTokenAfter(trailingToken), "");
          }
        });
      }
    }
    function forceTrailingComma(info) {
      const lastItem = info.lastItem;
      if (!lastItem)
        return;
      if (!isTrailingCommaAllowed(lastItem)) {
        forbidTrailingComma(info);
        return;
      }
      const trailingToken = getTrailingToken(info);
      if (!trailingToken || trailingToken.value === ",")
        return;
      const nextToken = sourceCode.getTokenAfter(trailingToken);
      if (!nextToken || !closeBraces.includes(nextToken.value))
        return;
      context.report({
        node: lastItem,
        loc: {
          start: trailingToken.loc.end,
          end: getNextLocation(sourceCode, trailingToken.loc.end)
        },
        messageId: "missing",
        *fix(fixer) {
          yield fixer.insertTextAfter(trailingToken, ",");
          yield fixer.insertTextBefore(trailingToken, "");
          yield fixer.insertTextAfter(sourceCode.getTokenAfter(trailingToken), "");
        }
      });
    }
    function allowTrailingCommaIfMultiline(info) {
      if (!isMultiline(info))
        forbidTrailingComma(info);
    }
    function forceTrailingCommaIfMultiline(info) {
      if (isMultiline(info))
        forceTrailingComma(info);
      else
        forbidTrailingComma(info);
    }
    return {
      ObjectExpression: (node) => {
        predicate[normalizedOptions.objects]({
          node,
          lastItem: last(node.properties)
        });
      },
      ObjectPattern: (node) => {
        predicate[normalizedOptions.objects]({
          node,
          lastItem: last(node.properties)
        });
      },
      ArrayExpression: (node) => {
        predicate[normalizedOptions.arrays]({
          node,
          lastItem: last(node.elements)
        });
      },
      ArrayPattern: (node) => {
        predicate[normalizedOptions.arrays]({
          node,
          lastItem: last(node.elements)
        });
      },
      ImportDeclaration: (node) => {
        const lastSpecifier = last(node.specifiers);
        if (lastSpecifier?.type === "ImportSpecifier") {
          predicate[normalizedOptions.imports]({
            node,
            lastItem: lastSpecifier
          });
        }
        predicate[normalizedOptions.importAttributes]({
          node,
          lastItem: last(node.attributes)
        });
      },
      ExportNamedDeclaration: (node) => {
        predicate[normalizedOptions.exports]({
          node,
          lastItem: last(node.specifiers)
        });
        predicate[normalizedOptions.importAttributes]({
          node,
          lastItem: last(node.attributes)
        });
      },
      ExportAllDeclaration: (node) => {
        predicate[normalizedOptions.importAttributes]({
          node,
          lastItem: last(node.attributes)
        });
      },
      FunctionDeclaration: (node) => {
        predicate[normalizedOptions.functions]({
          node,
          lastItem: last(node.params)
        });
      },
      FunctionExpression: (node) => {
        predicate[normalizedOptions.functions]({
          node,
          lastItem: last(node.params)
        });
      },
      ArrowFunctionExpression: (node) => {
        predicate[normalizedOptions.functions]({
          node,
          lastItem: last(node.params)
        });
      },
      CallExpression: (node) => {
        predicate[normalizedOptions.functions]({
          node,
          lastItem: last(node.arguments)
        });
      },
      NewExpression: (node) => {
        predicate[normalizedOptions.functions]({
          node,
          lastItem: last(node.arguments)
        });
      },
      ImportExpression: (node) => {
        predicate[normalizedOptions.dynamicImports]({
          node,
          lastItem: node.options ?? node.source
        });
      },
      TSEnumDeclaration(node) {
        predicate[normalizedOptions.enums]({
          node,
          lastItem: last(node.body?.members ?? node.members)
        });
      },
      TSTypeParameterDeclaration(node) {
        predicate[normalizedOptions.generics]({
          node,
          lastItem: last(node.params)
        });
      },
      TSTupleType(node) {
        predicate[normalizedOptions.tuples]({
          node,
          lastItem: last(node.elementTypes)
        });
      }
    };
  }
});

export { commaDangle as default };
