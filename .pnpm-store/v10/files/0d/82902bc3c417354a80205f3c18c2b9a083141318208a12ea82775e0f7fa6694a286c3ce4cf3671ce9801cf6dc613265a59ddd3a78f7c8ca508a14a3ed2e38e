'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var autoResizer = require('../auto-resizer.js');
require('../composables/index.js');
var index = require('../../../../hooks/use-namespace/index.js');
var useAutoResize = require('../composables/use-auto-resize.js');

const AutoResizer = vue.defineComponent({
  name: "ElAutoResizer",
  props: autoResizer.autoResizerProps,
  setup(props, {
    slots
  }) {
    const ns = index.useNamespace("auto-resizer");
    const {
      height,
      width,
      sizer
    } = useAutoResize.useAutoResize(props);
    const style = {
      width: "100%",
      height: "100%"
    };
    return () => {
      var _a;
      return vue.createVNode("div", {
        "ref": sizer,
        "class": ns.b(),
        "style": style
      }, [(_a = slots.default) == null ? void 0 : _a.call(slots, {
        height: height.value,
        width: width.value
      })]);
    };
  }
});

exports["default"] = AutoResizer;
//# sourceMappingURL=auto-resizer.js.map
