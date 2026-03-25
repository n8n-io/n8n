'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var useMenuColor = require('./use-menu-color.js');
var index = require('../../../hooks/use-namespace/index.js');

const useMenuCssVar = (props, level) => {
  const ns = index.useNamespace("menu");
  return vue.computed(() => {
    return ns.cssVarBlock({
      "text-color": props.textColor || "",
      "hover-text-color": props.textColor || "",
      "bg-color": props.backgroundColor || "",
      "hover-bg-color": useMenuColor["default"](props).value || "",
      "active-color": props.activeTextColor || "",
      level: `${level}`
    });
  });
};

exports.useMenuCssVar = useMenuCssVar;
//# sourceMappingURL=use-menu-css-var.js.map
