import { defineComponent, computed, h, renderSlot } from 'vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const spaceItemProps = buildProps({
  prefixCls: {
    type: String
  }
});
const SpaceItem = defineComponent({
  name: "ElSpaceItem",
  props: spaceItemProps,
  setup(props, { slots }) {
    const ns = useNamespace("space");
    const classes = computed(() => `${props.prefixCls || ns.b()}__item`);
    return () => h("div", { class: classes.value }, renderSlot(slots, "default"));
  }
});

export { SpaceItem as default };
//# sourceMappingURL=item.mjs.map
