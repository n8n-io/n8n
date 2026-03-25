'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var shared = require('@vue/shared');
require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');

const CommonProps = runtime.buildProps({
  modelValue: {
    type: runtime.definePropType([Number, String, Array])
  },
  options: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  props: {
    type: runtime.definePropType(Object),
    default: () => ({})
  }
});
const DefaultProps = {
  expandTrigger: "click",
  multiple: false,
  checkStrictly: false,
  emitPath: true,
  lazy: false,
  lazyLoad: shared.NOOP,
  value: "value",
  label: "label",
  children: "children",
  leaf: "leaf",
  disabled: "disabled",
  hoverThreshold: 500
};
const useCascaderConfig = (props) => {
  return vue.computed(() => ({
    ...DefaultProps,
    ...props.props
  }));
};

exports.CommonProps = CommonProps;
exports.DefaultProps = DefaultProps;
exports.useCascaderConfig = useCascaderConfig;
//# sourceMappingURL=config.js.map
