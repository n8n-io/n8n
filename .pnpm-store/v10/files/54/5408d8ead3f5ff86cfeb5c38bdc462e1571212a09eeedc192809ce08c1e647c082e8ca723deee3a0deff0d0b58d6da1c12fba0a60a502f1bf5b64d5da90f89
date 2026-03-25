'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-namespace/index.js');
var shared = require('@vue/shared');

const sliderMarkerProps = runtime.buildProps({
  mark: {
    type: runtime.definePropType([String, Object]),
    default: void 0
  }
});
var SliderMarker = vue.defineComponent({
  name: "ElSliderMarker",
  props: sliderMarkerProps,
  setup(props) {
    const ns = index.useNamespace("slider");
    const label = vue.computed(() => {
      return shared.isString(props.mark) ? props.mark : props.mark.label;
    });
    const style = vue.computed(() => shared.isString(props.mark) ? void 0 : props.mark.style);
    return () => vue.h("div", {
      class: ns.e("marks-text"),
      style: style.value
    }, label.value);
  }
});

exports["default"] = SliderMarker;
exports.sliderMarkerProps = sliderMarkerProps;
//# sourceMappingURL=marker.js.map
