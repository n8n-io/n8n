import { defineComponent, getCurrentInstance, nextTick } from 'vue';
import { ElOption } from '../../select/index.mjs';

const component = defineComponent({
  extends: ElOption,
  setup(props, ctx) {
    const result = ElOption.setup(props, ctx);
    delete result.selectOptionClick;
    const vm = getCurrentInstance().proxy;
    nextTick(() => {
      if (!result.select.cachedOptions.get(vm.value)) {
        result.select.onOptionCreate(vm);
      }
    });
    return result;
  },
  methods: {
    selectOptionClick() {
      this.$el.parentElement.click();
    }
  }
});

export { component as default };
//# sourceMappingURL=tree-select-option.mjs.map
