import { defineComponent, inject, watch } from 'vue';
import '../../select/index.mjs';
import { selectKey } from '../../select/src/token.mjs';

var CacheOptions = defineComponent({
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const select = inject(selectKey);
    watch(() => props.data, () => {
      var _a;
      props.data.forEach((item) => {
        if (!select.cachedOptions.has(item.value)) {
          select.cachedOptions.set(item.value, item);
        }
      });
      const inputs = ((_a = select.selectWrapper) == null ? void 0 : _a.querySelectorAll("input")) || [];
      if (!Array.from(inputs).includes(document.activeElement)) {
        select.setSelected();
      }
    }, { flush: "post", immediate: true });
    return () => void 0;
  }
});

export { CacheOptions as default };
//# sourceMappingURL=cache-options.mjs.map
