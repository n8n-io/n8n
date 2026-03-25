'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-same-target/index.js');
var vnode = require('../../../utils/vue/vnode.js');

const overlayProps = runtime.buildProps({
  mask: {
    type: Boolean,
    default: true
  },
  customMaskEvent: {
    type: Boolean,
    default: false
  },
  overlayClass: {
    type: runtime.definePropType([
      String,
      Array,
      Object
    ])
  },
  zIndex: {
    type: runtime.definePropType([String, Number])
  }
});
const overlayEmits = {
  click: (evt) => evt instanceof MouseEvent
};
const BLOCK = "overlay";
var Overlay = vue.defineComponent({
  name: "ElOverlay",
  props: overlayProps,
  emits: overlayEmits,
  setup(props, { slots, emit }) {
    const ns = index.useNamespace(BLOCK);
    const onMaskClick = (e) => {
      emit("click", e);
    };
    const { onClick, onMousedown, onMouseup } = index$1.useSameTarget(props.customMaskEvent ? void 0 : onMaskClick);
    return () => {
      return props.mask ? vue.createVNode("div", {
        class: [ns.b(), props.overlayClass],
        style: {
          zIndex: props.zIndex
        },
        onClick,
        onMousedown,
        onMouseup
      }, [vue.renderSlot(slots, "default")], vnode.PatchFlags.STYLE | vnode.PatchFlags.CLASS | vnode.PatchFlags.PROPS, ["onClick", "onMouseup", "onMousedown"]) : vue.h("div", {
        class: props.overlayClass,
        style: {
          zIndex: props.zIndex,
          position: "fixed",
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px"
        }
      }, [vue.renderSlot(slots, "default")]);
    };
  }
});

exports["default"] = Overlay;
exports.overlayEmits = overlayEmits;
exports.overlayProps = overlayProps;
//# sourceMappingURL=overlay.js.map
