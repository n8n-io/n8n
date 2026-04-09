"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion("^7.0.0-0 || ^8.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  const regex = /(\\*)([\u2028\u2029])/g;
  function replace(match, escapes, separator) {
    const isEscaped = escapes.length % 2 === 1;
    if (isEscaped) return match;
    return `${escapes}\\u${separator.charCodeAt(0).toString(16)}`;
  }
  return {
    name: "transform-json-strings",
    manipulateOptions: (_, parser) => parser.plugins.push("jsonStrings"),
    visitor: {
      "DirectiveLiteral|StringLiteral"({
        node
      }) {
        const {
          extra
        } = node;
        if (!(extra != null && extra.raw)) return;
        extra.raw = extra.raw.replace(regex, replace);
      }
    }
  };
});

//# sourceMappingURL=index.js.map
