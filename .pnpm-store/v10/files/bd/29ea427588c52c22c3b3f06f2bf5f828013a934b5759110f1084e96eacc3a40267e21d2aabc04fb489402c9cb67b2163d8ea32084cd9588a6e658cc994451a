import { c as createRule, r as isDOMComponent, t as getElementType } from '../utils.js';
import picomatch from 'picomatch';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function testDigit(char) {
  const charCode = char.charCodeAt(0);
  return charCode >= 48 && charCode <= 57;
}
function testUpperCase(char) {
  const upperCase = char.toUpperCase();
  return char === upperCase && upperCase !== char.toLowerCase();
}
function testLowerCase(char) {
  const lowerCase = char.toLowerCase();
  return char === lowerCase && lowerCase !== char.toUpperCase();
}
function testPascalCase(name) {
  if (!testUpperCase(name.charAt(0)))
    return false;
  const anyNonAlphaNumeric = Array.prototype.some.call(
    name.slice(1),
    (char) => char.toLowerCase() === char.toUpperCase() && !testDigit(char)
  );
  if (anyNonAlphaNumeric)
    return false;
  return Array.prototype.some.call(
    name.slice(1),
    (char) => testLowerCase(char) || testDigit(char)
  );
}
function testAllCaps(name) {
  const firstChar = name.charAt(0);
  if (!(testUpperCase(firstChar) || testDigit(firstChar)))
    return false;
  for (let i = 1; i < name.length - 1; i += 1) {
    const char = name.charAt(i);
    if (!(testUpperCase(char) || testDigit(char) || char === "_"))
      return false;
  }
  const lastChar = name.charAt(name.length - 1);
  if (!(testUpperCase(lastChar) || testDigit(lastChar)))
    return false;
  return true;
}
const messages = {
  usePascalCase: "Imported JSX component {{name}} must be in PascalCase",
  usePascalOrSnakeCase: "Imported JSX component {{name}} must be in PascalCase or SCREAMING_SNAKE_CASE"
};
var jsxPascalCase = createRule({
  name: "jsx-pascal-case",
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce PascalCase for user-defined JSX components"
      // category: 'Stylistic Issues',
    },
    messages,
    schema: [{
      type: "object",
      properties: {
        allowAllCaps: {
          type: "boolean"
        },
        allowLeadingUnderscore: {
          type: "boolean"
        },
        allowNamespace: {
          type: "boolean"
        },
        ignore: {
          items: {
            type: "string"
          },
          type: "array",
          uniqueItems: true
        }
      },
      additionalProperties: false
    }]
  },
  create(context) {
    const configuration = context.options[0] || {};
    const {
      allowAllCaps = false,
      allowLeadingUnderscore = false,
      allowNamespace = false,
      ignore = []
    } = configuration;
    const isMatchIgnore = picomatch(ignore, { noglobstar: true });
    function ignoreCheck(name) {
      return isMatchIgnore(name) || ignore.includes(name);
    }
    return {
      JSXOpeningElement(node) {
        const isCompatTag = isDOMComponent(node);
        if (isCompatTag)
          return;
        const name = getElementType(node);
        let checkNames = [name];
        let index = 0;
        if (name.includes(":"))
          checkNames = name.split(":");
        else if (name.includes("."))
          checkNames = name.split(".");
        do {
          const splitName = checkNames[index];
          if (splitName.length === 1)
            return;
          const isIgnored = ignoreCheck(splitName);
          const checkName = allowLeadingUnderscore && splitName.startsWith("_") ? splitName.slice(1) : splitName;
          const isPascalCase = testPascalCase(checkName);
          const isAllowedAllCaps = allowAllCaps && testAllCaps(checkName);
          if (!isPascalCase && !isAllowedAllCaps && !isIgnored) {
            const messageId = allowAllCaps ? "usePascalOrSnakeCase" : "usePascalCase";
            context.report({
              messageId,
              node,
              data: {
                name: splitName
              }
            });
            break;
          }
          index += 1;
        } while (index < checkNames.length && !allowNamespace);
      }
    };
  }
});

export { jsxPascalCase as default };
