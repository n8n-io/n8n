import { computed } from 'vue';
import { NOOP } from '@vue/shared';
import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const CommonProps = buildProps({
  modelValue: {
    type: definePropType([Number, String, Array])
  },
  options: {
    type: definePropType(Array),
    default: () => []
  },
  props: {
    type: definePropType(Object),
    default: () => ({})
  }
});
const DefaultProps = {
  expandTrigger: "click",
  multiple: false,
  checkStrictly: false,
  emitPath: true,
  lazy: false,
  lazyLoad: NOOP,
  value: "value",
  label: "label",
  children: "children",
  leaf: "leaf",
  disabled: "disabled",
  hoverThreshold: 500
};
const useCascaderConfig = (props) => {
  return computed(() => ({
    ...DefaultProps,
    ...props.props
  }));
};

export { CommonProps, DefaultProps, useCascaderConfig };
//# sourceMappingURL=config.mjs.map
