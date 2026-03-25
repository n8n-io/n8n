"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isReference = isReference;
exports.runtimeProperty = exports.newHelpersAvailable = void 0;
var _core = require("@babel/core");
let newHelpersAvailable = exports.newHelpersAvailable = void 0;
{
  exports.newHelpersAvailable = newHelpersAvailable = file => {
    ;
    return file.availableHelper("regenerator") && !_core.types.isIdentifier(file.addHelper("regenerator"), {
      name: "__interal_marker_fallback_regenerator__"
    });
  };
}
let runtimeProperty = exports.runtimeProperty = void 0;
{
  exports.runtimeProperty = runtimeProperty = function (file, name) {
    const helper = file.addHelper("regeneratorRuntime");
    return _core.types.memberExpression(_core.types.isArrowFunctionExpression(helper) && _core.types.isIdentifier(helper.body) ? helper.body : _core.types.callExpression(helper, []), _core.types.identifier(name), false);
  };
}
function isReference(path) {
  return path.isReferenced() || path.parentPath.isAssignmentExpression({
    left: path.node
  });
}

//# sourceMappingURL=util.js.map
