import { defineComponent, ref, createVNode, Fragment } from 'vue';
import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { composeRefs } from '../../../utils/vue/refs.mjs';
import { ensureOnlyChild } from '../../../utils/vue/vnode.mjs';

const forwardRefProps = buildProps({
  setRef: {
    type: definePropType(Function),
    required: true
  },
  onlyChild: Boolean
});
var ForwardRef = defineComponent({
  props: forwardRefProps,
  setup(props, {
    slots
  }) {
    const fragmentRef = ref();
    const setRef = composeRefs(fragmentRef, (el) => {
      if (el) {
        props.setRef(el.nextElementSibling);
      } else {
        props.setRef(null);
      }
    });
    return () => {
      var _a;
      const [firstChild] = ((_a = slots.default) == null ? void 0 : _a.call(slots)) || [];
      const child = props.onlyChild ? ensureOnlyChild(firstChild.children) : firstChild.children;
      return createVNode(Fragment, {
        "ref": setRef
      }, [child]);
    };
  }
});

export { ForwardRef as default, forwardRefProps };
//# sourceMappingURL=forward-ref.mjs.map
