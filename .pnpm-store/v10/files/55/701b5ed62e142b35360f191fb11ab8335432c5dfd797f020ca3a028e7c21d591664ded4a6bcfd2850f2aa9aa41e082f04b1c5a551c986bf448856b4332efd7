import '../../cascader-panel/index.mjs';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import '../../tooltip/index.mjs';
import '../../tag/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { CommonProps } from '../../cascader-panel/src/config.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { useTooltipContentProps } from '../../tooltip/src/content.mjs';
import { tagProps } from '../../tag/src/tag.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { isBoolean } from '../../../utils/types.mjs';

const cascaderProps = buildProps({
  ...CommonProps,
  size: useSizeProp,
  placeholder: String,
  disabled: Boolean,
  clearable: Boolean,
  filterable: Boolean,
  filterMethod: {
    type: definePropType(Function),
    default: (node, keyword) => node.text.includes(keyword)
  },
  separator: {
    type: String,
    default: " / "
  },
  showAllLevels: {
    type: Boolean,
    default: true
  },
  collapseTags: Boolean,
  maxCollapseTags: {
    type: Number,
    default: 1
  },
  collapseTagsTooltip: {
    type: Boolean,
    default: false
  },
  debounce: {
    type: Number,
    default: 300
  },
  beforeFilter: {
    type: definePropType(Function),
    default: () => true
  },
  popperClass: {
    type: String,
    default: ""
  },
  teleported: useTooltipContentProps.teleported,
  tagType: { ...tagProps.type, default: "info" },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const cascaderEmits = {
  [UPDATE_MODEL_EVENT]: (val) => !!val || val === null,
  [CHANGE_EVENT]: (val) => !!val || val === null,
  focus: (evt) => evt instanceof FocusEvent,
  blur: (evt) => evt instanceof FocusEvent,
  visibleChange: (val) => isBoolean(val),
  expandChange: (val) => !!val,
  removeTag: (val) => !!val
};

export { cascaderEmits, cascaderProps };
//# sourceMappingURL=cascader.mjs.map
