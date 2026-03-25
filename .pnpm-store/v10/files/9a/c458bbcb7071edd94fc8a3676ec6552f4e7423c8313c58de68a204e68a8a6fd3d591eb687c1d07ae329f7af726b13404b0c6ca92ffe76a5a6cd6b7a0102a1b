import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import "./chunk-DRM3MJ7Y.js";

// ../node_modules/camelcase/index.js
var UPPERCASE = /[\p{Lu}]/u, LOWERCASE = /[\p{Ll}]/u, LEADING_CAPITAL = /^[\p{Lu}](?![\p{Lu}])/gu, IDENTIFIER = /([\p{Alpha}\p{N}_]|$)/u, SEPARATORS = /[_.\- ]+/, LEADING_SEPARATORS = new RegExp("^" + SEPARATORS.source), SEPARATORS_AND_IDENTIFIER = new RegExp(SEPARATORS.source + IDENTIFIER.source, "gu"), NUMBERS_AND_IDENTIFIER = new RegExp("\\d+" + IDENTIFIER.source, "gu"), preserveCamelCase = (string, toLowerCase, toUpperCase, preserveConsecutiveUppercase2) => {
  let isLastCharLower = !1, isLastCharUpper = !1, isLastLastCharUpper = !1, isLastLastCharPreserved = !1;
  for (let index = 0; index < string.length; index++) {
    let character = string[index];
    isLastLastCharPreserved = index > 2 ? string[index - 3] === "-" : !0, isLastCharLower && UPPERCASE.test(character) ? (string = string.slice(0, index) + "-" + string.slice(index), isLastCharLower = !1, isLastLastCharUpper = isLastCharUpper, isLastCharUpper = !0, index++) : isLastCharUpper && isLastLastCharUpper && LOWERCASE.test(character) && (!isLastLastCharPreserved || preserveConsecutiveUppercase2) ? (string = string.slice(0, index - 1) + "-" + string.slice(index - 1), isLastLastCharUpper = isLastCharUpper, isLastCharUpper = !1, isLastCharLower = !0) : (isLastCharLower = toLowerCase(character) === character && toUpperCase(character) !== character, isLastLastCharUpper = isLastCharUpper, isLastCharUpper = toUpperCase(character) === character && toLowerCase(character) !== character);
  }
  return string;
}, preserveConsecutiveUppercase = (input, toLowerCase) => (LEADING_CAPITAL.lastIndex = 0, input.replaceAll(LEADING_CAPITAL, (match) => toLowerCase(match))), postProcess = (input, toUpperCase) => (SEPARATORS_AND_IDENTIFIER.lastIndex = 0, NUMBERS_AND_IDENTIFIER.lastIndex = 0, input.replaceAll(NUMBERS_AND_IDENTIFIER, (match, pattern, offset) => ["_", "-"].includes(input.charAt(offset + match.length)) ? match : toUpperCase(match)).replaceAll(SEPARATORS_AND_IDENTIFIER, (_, identifier) => toUpperCase(identifier)));
function camelCase(input, options) {
  if (!(typeof input == "string" || Array.isArray(input)))
    throw new TypeError("Expected the input to be `string | string[]`");
  if (options = {
    pascalCase: !1,
    preserveConsecutiveUppercase: !1,
    ...options
  }, Array.isArray(input) ? input = input.map((x) => x.trim()).filter((x) => x.length).join("-") : input = input.trim(), input.length === 0)
    return "";
  let toLowerCase = options.locale === !1 ? (string) => string.toLowerCase() : (string) => string.toLocaleLowerCase(options.locale), toUpperCase = options.locale === !1 ? (string) => string.toUpperCase() : (string) => string.toLocaleUpperCase(options.locale);
  return input.length === 1 ? SEPARATORS.test(input) ? "" : options.pascalCase ? toUpperCase(input) : toLowerCase(input) : (input !== toLowerCase(input) && (input = preserveCamelCase(input, toLowerCase, toUpperCase, options.preserveConsecutiveUppercase)), input = input.replace(LEADING_SEPARATORS, ""), input = options.preserveConsecutiveUppercase ? preserveConsecutiveUppercase(input, toLowerCase) : toLowerCase(input), options.pascalCase && (input = toUpperCase(input.charAt(0)) + input.slice(1)), postProcess(input, toUpperCase));
}
export {
  camelCase as default
};
