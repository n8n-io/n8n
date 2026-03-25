'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var refs = require('../../../utils/vue/refs.js');
var vnode = require('../../../utils/vue/vnode.js');

const forwardRefProps = runtime.buildProps({
  setRef: {
    type: runtime.definePropType(Function),
    required: true
  },
  onlyChild: Boolean
});
var ForwardRef = vue.defineComponent({
  props: forwardRefProps,
  setup(props, {
    slots
  }) {
    const fragmentRef = vue.ref();
    const setRef = refs.composeRefs(fragmentRef, (el) => {
      if (el) {
        props.setRef(el.nextElementSibling);
      } else {
        props.setRef(null);
      }
    });
    return () => {
      var _a;
      const [firstChild] = ((_a = slots.default) == null ? void 0 : _a.call(slots)) || [];
      const child = props.onlyChild ? vnode.ensureOnlyChild(firstChild.children) : firstChild.children;
      return vue.createVNode(vue.Fragment, {
        "ref": setRef
      }, [child]);
    };
  }
});

exports["default"] = ForwardRef;
exports.forwardRefProps = forwardRefProps;
//# sourceMappingURL=forward-ref.js.map
