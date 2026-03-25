"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperCompilationTargets = require("@babel/helper-compilation-targets");
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _default = exports.default = (0, _helperPluginUtils.declare)(api => {
  api.assertVersion(7);
  const supportUnicodeId = !(0, _helperCompilationTargets.isRequired)("transform-unicode-escapes", api.targets());
  return {
    name: "transform-function-name",
    visitor: {
      FunctionExpression: {
        exit(path) {
          if (path.key !== "value" && !path.parentPath.isObjectProperty()) {
            {
              var _path$ensureFunctionN;
              (_path$ensureFunctionN = path.ensureFunctionName) != null ? _path$ensureFunctionN : path.ensureFunctionName = require("@babel/traverse").NodePath.prototype.ensureFunctionName;
            }
            path.ensureFunctionName(supportUnicodeId);
          }
        }
      },
      ObjectProperty(path) {
        const value = path.get("value");
        if (value.isFunction()) {
          {
            var _value$ensureFunction;
            (_value$ensureFunction = value.ensureFunctionName) != null ? _value$ensureFunction : value.ensureFunctionName = require("@babel/traverse").NodePath.prototype.ensureFunctionName;
          }
          value.ensureFunctionName(supportUnicodeId);
        }
      }
    }
  };
});

//# sourceMappingURL=index.js.map
