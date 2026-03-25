'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index = require('../../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
var constants = require('../constants.js');

const SortIcon = (props) => {
  const {
    sortOrder
  } = props;
  return vue.createVNode(index.ElIcon, {
    "size": 14,
    "class": props.class
  }, {
    default: () => [sortOrder === constants.SortOrder.ASC ? vue.createVNode(iconsVue.SortUp, null, null) : vue.createVNode(iconsVue.SortDown, null, null)]
  });
};

exports["default"] = SortIcon;
//# sourceMappingURL=sort-icon.js.map
