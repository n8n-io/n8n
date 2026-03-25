'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var tinycolor = require('@ctrl/tinycolor');

function useMenuColor(props) {
  const menuBarColor = vue.computed(() => {
    const color = props.backgroundColor;
    if (!color) {
      return "";
    } else {
      return new tinycolor.TinyColor(color).shade(20).toString();
    }
  });
  return menuBarColor;
}

exports["default"] = useMenuColor;
//# sourceMappingURL=use-menu-color.js.map
