import { c as createRule, O as isNumericLiteral, K as KEYWORDS_JS, u as isStringLiteral } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import { tokenize } from 'espree';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'estraverse';

var quoteProps = createRule({
  name: "quote-props",
  meta: {
    type: "layout",
    docs: {
      description: "Require quotes around object literal, type literal, interfaces and enums property names"
    },
    fixable: "code",
    schema: {
      anyOf: [
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["always", "as-needed", "consistent", "consistent-as-needed"]
            }
          ],
          minItems: 0,
          maxItems: 1
        },
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["always", "as-needed", "consistent", "consistent-as-needed"]
            },
            {
              type: "object",
              properties: {
                keywords: {
                  type: "boolean"
                },
                unnecessary: {
                  type: "boolean"
                },
                numbers: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          ],
          minItems: 0,
          maxItems: 2
        }
      ]
    },
    messages: {
      requireQuotesDueToReservedWord: "Properties should be quoted as '{{property}}' is a reserved word.",
      inconsistentlyQuotedProperty: "Inconsistently quoted property '{{key}}' found.",
      unnecessarilyQuotedProperty: "Unnecessarily quoted property '{{property}}' found.",
      unquotedReservedProperty: "Unquoted reserved word '{{property}}' used as key.",
      unquotedNumericProperty: "Unquoted number literal '{{property}}' used as key.",
      unquotedPropertyFound: "Unquoted property '{{property}}' found.",
      redundantQuoting: "Properties shouldn't be quoted as all quotes are redundant."
    }
  },
  defaultOptions: ["always"],
  create(context) {
    const MODE = context.options[0];
    const KEYWORDS = context.options[1] && context.options[1].keywords;
    const CHECK_UNNECESSARY = !context.options[1] || context.options[1].unnecessary !== false;
    const NUMBERS = context.options[1] && context.options[1].numbers;
    const sourceCode = context.sourceCode;
    function isKeyword(tokenStr) {
      return KEYWORDS_JS.includes(tokenStr);
    }
    function areQuotesRedundant(rawKey, tokens, skipNumberLiterals = false) {
      return tokens.length === 1 && tokens[0].start === 0 && tokens[0].end === rawKey.length && (["Identifier", "Keyword", "Null", "Boolean"].includes(tokens[0].type) || tokens[0].type === "Numeric" && !skipNumberLiterals && String(+tokens[0].value) === tokens[0].value);
    }
    function getUnquotedKey(key) {
      return key.type === "Identifier" ? key.name : key.value;
    }
    function getQuotedKey(key) {
      if (isStringLiteral(key)) {
        return sourceCode.getText(key);
      }
      return `"${key.type === "Identifier" ? key.name : key.value}"`;
    }
    function checkUnnecessaryQuotes(node) {
      if (node.type === "Property" && (node.method || node.computed || node.shorthand))
        return;
      if (node.type !== "ImportAttribute" && node.computed)
        return;
      const key = node.type === "TSEnumMember" ? node.id : node.key;
      if (key.type === "Literal" && typeof key.value === "string") {
        let tokens;
        try {
          tokens = tokenize(key.value);
        } catch {
          return;
        }
        if (tokens.length !== 1)
          return;
        const isKeywordToken = isKeyword(tokens[0].value);
        if (isKeywordToken && KEYWORDS)
          return;
        if (CHECK_UNNECESSARY && areQuotesRedundant(key.value, tokens, NUMBERS)) {
          context.report({
            node,
            messageId: "unnecessarilyQuotedProperty",
            data: { property: key.value },
            fix: (fixer) => fixer.replaceText(key, getUnquotedKey(key))
          });
        }
      } else if (KEYWORDS && key.type === "Identifier" && isKeyword(key.name)) {
        context.report({
          node,
          messageId: "unquotedReservedProperty",
          data: { property: key.name },
          fix: (fixer) => fixer.replaceText(key, getQuotedKey(key))
        });
      } else if (NUMBERS && isNumericLiteral(key)) {
        context.report({
          node,
          messageId: "unquotedNumericProperty",
          data: { property: key.value },
          fix: (fixer) => fixer.replaceText(key, getQuotedKey(key))
        });
      }
    }
    function checkOmittedQuotes(node) {
      if (node.type === "Property" && (node.method || node.computed || node.shorthand))
        return;
      if (node.type !== "ImportAttribute" && node.computed)
        return;
      const key = node.type === "TSEnumMember" ? node.id : node.key;
      if (key.type === "Literal" && typeof key.value === "string")
        return;
      context.report({
        node,
        messageId: "unquotedPropertyFound",
        data: { property: key.name || key.value },
        fix: (fixer) => fixer.replaceText(key, getQuotedKey(key))
      });
    }
    function checkConsistencyForObject(properties, checkQuotesRedundancy) {
      checkConsistency(
        properties.filter(
          (property) => property.type !== "SpreadElement" && property.key && !property.method && !property.computed && !property.shorthand
        ),
        checkQuotesRedundancy
      );
    }
    function checkImportAttributes(attributes) {
      if (!attributes)
        return;
      if (MODE === "consistent")
        checkConsistency(attributes, false);
      if (MODE === "consistent-as-needed")
        checkConsistency(attributes, true);
    }
    function checkConsistency(properties, checkQuotesRedundancy) {
      const quotedProps = [];
      const unquotedProps = [];
      let keywordKeyName = null;
      let necessaryQuotes = false;
      properties.forEach((property) => {
        const key = property.key;
        if (key.type === "Literal" && typeof key.value === "string") {
          quotedProps.push(property);
          if (checkQuotesRedundancy) {
            let tokens;
            try {
              tokens = tokenize(key.value);
            } catch {
              necessaryQuotes = true;
              return;
            }
            necessaryQuotes = necessaryQuotes || !areQuotesRedundant(key.value, tokens) || KEYWORDS && isKeyword(tokens[0].value);
          }
        } else if (KEYWORDS && checkQuotesRedundancy && key.type === "Identifier" && isKeyword(key.name)) {
          unquotedProps.push(property);
          necessaryQuotes = true;
          keywordKeyName = key.name;
        } else {
          unquotedProps.push(property);
        }
      });
      if (checkQuotesRedundancy && quotedProps.length && !necessaryQuotes) {
        quotedProps.forEach((property) => {
          const key = property.key;
          context.report({
            node: property,
            messageId: "redundantQuoting",
            fix: (fixer) => fixer.replaceText(key, getUnquotedKey(key))
          });
        });
      } else if (unquotedProps.length && keywordKeyName) {
        unquotedProps.forEach((property) => {
          context.report({
            node: property,
            messageId: "requireQuotesDueToReservedWord",
            data: { property: keywordKeyName },
            fix: (fixer) => fixer.replaceText(property.key, getQuotedKey(property.key))
          });
        });
      } else if (quotedProps.length && unquotedProps.length) {
        unquotedProps.forEach((property) => {
          context.report({
            node: property,
            messageId: "inconsistentlyQuotedProperty",
            data: { key: property.key.name || property.key.value },
            fix: (fixer) => fixer.replaceText(property.key, getQuotedKey(property.key))
          });
        });
      }
    }
    return {
      Property(node) {
        if (MODE === "always" || !MODE)
          checkOmittedQuotes(node);
        if (MODE === "as-needed")
          checkUnnecessaryQuotes(node);
      },
      ObjectExpression(node) {
        if (MODE === "consistent")
          checkConsistencyForObject(node.properties, false);
        if (MODE === "consistent-as-needed")
          checkConsistencyForObject(node.properties, true);
      },
      ImportAttribute(node) {
        if (MODE === "always" || !MODE)
          checkOmittedQuotes(node);
        if (MODE === "as-needed")
          checkUnnecessaryQuotes(node);
      },
      ImportDeclaration(node) {
        checkImportAttributes(node.attributes);
      },
      ExportAllDeclaration(node) {
        checkImportAttributes(node.attributes);
      },
      ExportNamedDeclaration(node) {
        checkImportAttributes(node.attributes);
      },
      TSPropertySignature(node) {
        if (MODE === "always" || !MODE)
          checkOmittedQuotes(node);
        if (MODE === "as-needed")
          checkUnnecessaryQuotes(node);
      },
      TSEnumMember(node) {
        if (MODE === "always" || !MODE)
          checkOmittedQuotes(node);
        if (MODE === "as-needed")
          checkUnnecessaryQuotes(node);
      },
      TSTypeLiteral(node) {
        if (MODE === "consistent")
          checkConsistencyForObject(node.members, false);
        if (MODE === "consistent-as-needed")
          checkConsistencyForObject(node.members, true);
      },
      TSInterfaceBody(node) {
        if (MODE === "consistent")
          checkConsistencyForObject(node.body, false);
        if (MODE === "consistent-as-needed")
          checkConsistencyForObject(node.body, true);
      },
      TSEnumDeclaration(node) {
        const members = (node.body?.members || node.members).map((member) => ({ ...member, key: member.id }));
        if (MODE === "consistent")
          checkConsistencyForObject(members, false);
        if (MODE === "consistent-as-needed")
          checkConsistencyForObject(members, true);
      }
    };
  }
});

export { quoteProps as default };
