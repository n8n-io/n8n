"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _helperPluginUtils = require("@babel/helper-plugin-utils");

function removePlugin(plugins, name) {
  const indices = [];
  plugins.forEach((plugin, i) => {
    const n = Array.isArray(plugin) ? plugin[0] : plugin;

    if (n === name) {
      indices.unshift(i);
    }
  });

  for (const i of indices) {
    plugins.splice(i, 1);
  }
}

var _default = (0, _helperPluginUtils.declare)((api, {
  disallowAmbiguousJSXLike,
  dts,
  isTSX
}) => {
  api.assertVersion(7);
  return {
    name: "syntax-typescript",

    manipulateOptions(opts, parserOpts) {
      const {
        plugins
      } = parserOpts;
      removePlugin(plugins, "flow");
      removePlugin(plugins, "jsx");
      plugins.push(["typescript", {
        disallowAmbiguousJSXLike,
        dts
      }], "classProperties");
      {
        plugins.push("objectRestSpread");
      }

      if (isTSX) {
        plugins.push("jsx");
      }
    }

  };
});

exports.default = _default;

//# sourceMappingURL=index.js.map
