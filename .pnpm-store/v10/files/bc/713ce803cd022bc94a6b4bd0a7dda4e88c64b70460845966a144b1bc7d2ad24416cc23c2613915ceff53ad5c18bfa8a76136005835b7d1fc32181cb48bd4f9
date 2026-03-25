import { defineComponent, createVNode } from 'vue';
import '../../../../hooks/index.mjs';
import { autoResizerProps } from '../auto-resizer.mjs';
import '../composables/index.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { useAutoResize } from '../composables/use-auto-resize.mjs';

const AutoResizer = defineComponent({
  name: "ElAutoResizer",
  props: autoResizerProps,
  setup(props, {
    slots
  }) {
    const ns = useNamespace("auto-resizer");
    const {
      height,
      width,
      sizer
    } = useAutoResize(props);
    const style = {
      width: "100%",
      height: "100%"
    };
    return () => {
      var _a;
      return createVNode("div", {
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

export { AutoResizer as default };
//# sourceMappingURL=auto-resizer.mjs.map
