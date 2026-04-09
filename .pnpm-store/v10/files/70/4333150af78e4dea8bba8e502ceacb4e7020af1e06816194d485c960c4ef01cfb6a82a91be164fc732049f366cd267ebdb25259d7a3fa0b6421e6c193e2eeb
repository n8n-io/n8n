"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
function remover({
  node
}) {
  var _extra$raw;
  const {
    extra
  } = node;
  if (extra != null && (_extra$raw = extra.raw) != null && _extra$raw.includes("_")) {
    extra.raw = extra.raw.replace(/_/g, "");
  }
}
var _default = exports.default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion("^7.0.0-0 || ^8.0.0-0 || >8.0.0-alpha <8.0.0-beta");
  return {
    name: "transform-numeric-separator",
    manipulateOptions: (_, parser) => parser.plugins.push("numericSeparator"),
    visitor: {
      NumericLiteral: remover,
      BigIntLiteral: remover
    }
  };
});

//# sourceMappingURL=index.js.map
