"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _visit = require("./regenerator/visit.js");
var _default = exports.default = (0, _helperPluginUtils.declare)(({
  types: t,
  traverse,
  assertVersion
}) => {
  assertVersion(7);
  return {
    name: "transform-regenerator",
    visitor: traverse.visitors.merge([(0, _visit.getVisitor)(), {
      CallExpression(path) {
        var _this$availableHelper;
        if (!((_this$availableHelper = this.availableHelper) != null && _this$availableHelper.call(this, "regeneratorRuntime"))) {
          return;
        }
        const callee = path.get("callee");
        if (!callee.isMemberExpression()) return;
        const obj = callee.get("object");
        if (obj.isIdentifier({
          name: "regeneratorRuntime"
        })) {
          const helper = this.addHelper("regeneratorRuntime");
          if (t.isArrowFunctionExpression(helper)) {
            obj.replaceWith(helper.body);
            return;
          }
          obj.replaceWith(t.callExpression(helper, []));
        }
      }
    }])
  };
});

//# sourceMappingURL=index.js.map
