'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-namespace/index.js');

const spaceItemProps = runtime.buildProps({
  prefixCls: {
    type: String
  }
});
const SpaceItem = vue.defineComponent({
  name: "ElSpaceItem",
  props: spaceItemProps,
  setup(props, { slots }) {
    const ns = index.useNamespace("space");
    const classes = vue.computed(() => `${props.prefixCls || ns.b()}__item`);
    return () => vue.h("div", { class: classes.value }, vue.renderSlot(slots, "default"));
  }
});

exports["default"] = SpaceItem;
//# sourceMappingURL=item.js.map
