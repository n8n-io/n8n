import { placements } from '@popperjs/core';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import '../../tooltip/index.mjs';
import { CircleClose } from '@element-plus/icons-vue';
import { defaultProps } from './useProps.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { useTooltipContentProps } from '../../tooltip/src/content.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';

const SelectProps = buildProps({
  allowCreate: Boolean,
  autocomplete: {
    type: definePropType(String),
    default: "none"
  },
  automaticDropdown: Boolean,
  clearable: Boolean,
  clearIcon: {
    type: iconPropType,
    default: CircleClose
  },
  effect: {
    type: definePropType(String),
    default: "light"
  },
  collapseTags: Boolean,
  collapseTagsTooltip: {
    type: Boolean,
    default: false
  },
  maxCollapseTags: {
    type: Number,
    default: 1
  },
  defaultFirstOption: Boolean,
  disabled: Boolean,
  estimatedOptionHeight: {
    type: Number,
    default: void 0
  },
  filterable: Boolean,
  filterMethod: Function,
  height: {
    type: Number,
    default: 170
  },
  itemHeight: {
    type: Number,
    default: 34
  },
  id: String,
  loading: Boolean,
  loadingText: String,
  label: String,
  modelValue: {
    type: definePropType([Array, String, Number, Boolean, Object])
  },
  multiple: Boolean,
  multipleLimit: {
    type: Number,
    default: 0
  },
  name: String,
  noDataText: String,
  noMatchText: String,
  remoteMethod: Function,
  reserveKeyword: {
    type: Boolean,
    default: true
  },
  options: {
    type: definePropType(Array),
    required: true
  },
  placeholder: {
    type: String
  },
  teleported: useTooltipContentProps.teleported,
  persistent: {
    type: Boolean,
    default: true
  },
  popperClass: {
    type: String,
    default: ""
  },
  popperOptions: {
    type: definePropType(Object),
    default: () => ({})
  },
  remote: Boolean,
  size: useSizeProp,
  props: {
    type: definePropType(Object),
    default: () => defaultProps
  },
  valueKey: {
    type: String,
    default: "value"
  },
  scrollbarAlwaysOn: {
    type: Boolean,
    default: false
  },
  validateEvent: {
    type: Boolean,
    default: true
  },
  placement: {
    type: definePropType(String),
    values: placements,
    default: "bottom-start"
  }
});
const OptionProps = buildProps({
  data: Array,
  disabled: Boolean,
  hovering: Boolean,
  item: {
    type: definePropType(Object),
    required: true
  },
  index: Number,
  style: Object,
  selected: Boolean,
  created: Boolean
});

export { OptionProps, SelectProps };
//# sourceMappingURL=defaults.mjs.map
