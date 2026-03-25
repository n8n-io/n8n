import { defineComponent } from 'vue';
import '../../../utils/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';

const descriptionItemProps = buildProps({
  label: {
    type: String,
    default: ""
  },
  span: {
    type: Number,
    default: 1
  },
  width: {
    type: [String, Number],
    default: ""
  },
  minWidth: {
    type: [String, Number],
    default: ""
  },
  align: {
    type: String,
    default: "left"
  },
  labelAlign: {
    type: String,
    default: ""
  },
  className: {
    type: String,
    default: ""
  },
  labelClassName: {
    type: String,
    default: ""
  }
});
const DescriptionItem = defineComponent({
  name: "ElDescriptionsItem",
  props: descriptionItemProps
});

export { DescriptionItem as default };
//# sourceMappingURL=description-item.mjs.map
