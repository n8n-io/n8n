'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index = require('../../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');

const ExpandIcon = (props) => {
  const {
    expanded,
    expandable,
    onExpand,
    style,
    size
  } = props;
  const expandIconProps = {
    onClick: expandable ? () => onExpand(!expanded) : void 0,
    class: props.class
  };
  return vue.createVNode(index.ElIcon, vue.mergeProps(expandIconProps, {
    "size": size,
    "style": style
  }), {
    default: () => [vue.createVNode(iconsVue.ArrowRight, null, null)]
  });
};

exports["default"] = ExpandIcon;
//# sourceMappingURL=expand-icon.js.map
