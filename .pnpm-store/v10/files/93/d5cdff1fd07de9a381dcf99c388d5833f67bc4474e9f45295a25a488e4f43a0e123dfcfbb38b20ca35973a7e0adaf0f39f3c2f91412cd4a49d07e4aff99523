"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);
  const isPlugin = (plugin, name) => name === "plugin" || Array.isArray(plugin) && plugin[0] === "plugin";
  const options = plugin => Array.isArray(plugin) && plugin.length > 1 ? plugin[1] : {};
  return {
    name: "syntax-import-assertions",
    manipulateOptions(opts, {
      plugins
    }) {
      for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        if (isPlugin(plugin, "deprecatedImportAssert")) return;
        if (isPlugin(plugin, "importAttributes")) {
          plugins.splice(i, 1, "deprecatedImportAssert", ["importAttributes", Object.assign({}, options(plugin), {
            deprecatedAssertSyntax: true
          })]);
          return;
        }
      }
      plugins.push("importAssertions");
    }
  };
});

//# sourceMappingURL=index.js.map
