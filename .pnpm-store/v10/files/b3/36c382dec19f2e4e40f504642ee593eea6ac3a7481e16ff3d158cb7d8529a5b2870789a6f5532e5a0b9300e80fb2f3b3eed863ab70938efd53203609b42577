"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)((api, {
  deprecatedAssertSyntax
}) => {
  api.assertVersion("^7.22.0 || >8.0.0-alpha <8.0.0-beta");
  if (deprecatedAssertSyntax != null && typeof deprecatedAssertSyntax !== "boolean") {
    throw new Error("'deprecatedAssertSyntax' must be a boolean, if specified.");
  }
  return {
    name: "syntax-import-attributes",
    manipulateOptions({
      parserOpts,
      generatorOpts
    }) {
      var _generatorOpts$import;
      (_generatorOpts$import = generatorOpts.importAttributesKeyword) != null ? _generatorOpts$import : generatorOpts.importAttributesKeyword = "with";
      const importAssertionsPluginIndex = parserOpts.plugins.indexOf("importAssertions");
      if (importAssertionsPluginIndex !== -1) {
        parserOpts.plugins.splice(importAssertionsPluginIndex, 1);
        deprecatedAssertSyntax = true;
      }
      if (deprecatedAssertSyntax) {
        parserOpts.plugins.push("deprecatedImportAssert", ["importAttributes", {
          deprecatedAssertSyntax: true
        }]);
      } else {
        parserOpts.plugins.push("importAttributes");
      }
    }
  };
});

//# sourceMappingURL=index.js.map
