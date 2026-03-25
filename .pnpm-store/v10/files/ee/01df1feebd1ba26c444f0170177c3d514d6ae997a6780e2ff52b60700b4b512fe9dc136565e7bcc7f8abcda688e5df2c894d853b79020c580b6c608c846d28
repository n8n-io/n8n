import { defineComponent, provide, h, renderSlot } from 'vue';
import '../../../hooks/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const Timeline = defineComponent({
  name: "ElTimeline",
  setup(_, { slots }) {
    const ns = useNamespace("timeline");
    provide("timeline", slots);
    return () => {
      return h("ul", { class: [ns.b()] }, [renderSlot(slots, "default")]);
    };
  }
});

export { Timeline as default };
//# sourceMappingURL=timeline.mjs.map
