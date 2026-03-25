import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import '../../collection/index.mjs';
import '../../tooltip/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { useTooltipTriggerProps } from '../../tooltip/src/trigger.mjs';
import { useTooltipContentProps } from '../../tooltip/src/content.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';
import { createCollectionWithScope } from '../../collection/src/collection.mjs';

const dropdownProps = buildProps({
  trigger: useTooltipTriggerProps.trigger,
  effect: {
    ...useTooltipContentProps.effect,
    default: "light"
  },
  type: {
    type: definePropType(String)
  },
  placement: {
    type: definePropType(String),
    default: "bottom"
  },
  popperOptions: {
    type: definePropType(Object),
    default: () => ({})
  },
  id: String,
  size: {
    type: String,
    default: ""
  },
  splitButton: Boolean,
  hideOnClick: {
    type: Boolean,
    default: true
  },
  loop: {
    type: Boolean,
    default: true
  },
  showTimeout: {
    type: Number,
    default: 150
  },
  hideTimeout: {
    type: Number,
    default: 150
  },
  tabindex: {
    type: definePropType([Number, String]),
    default: 0
  },
  maxHeight: {
    type: definePropType([Number, String]),
    default: ""
  },
  popperClass: {
    type: String,
    default: ""
  },
  disabled: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: "menu"
  },
  buttonProps: {
    type: definePropType(Object)
  },
  teleported: useTooltipContentProps.teleported
});
const dropdownItemProps = buildProps({
  command: {
    type: [Object, String, Number],
    default: () => ({})
  },
  disabled: Boolean,
  divided: Boolean,
  textValue: String,
  icon: {
    type: iconPropType
  }
});
const dropdownMenuProps = buildProps({
  onKeydown: { type: definePropType(Function) }
});
const FIRST_KEYS = [
  EVENT_CODE.down,
  EVENT_CODE.pageDown,
  EVENT_CODE.home
];
const LAST_KEYS = [EVENT_CODE.up, EVENT_CODE.pageUp, EVENT_CODE.end];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
const {
  ElCollection,
  ElCollectionItem,
  COLLECTION_INJECTION_KEY,
  COLLECTION_ITEM_INJECTION_KEY
} = createCollectionWithScope("Dropdown");

export { COLLECTION_INJECTION_KEY as DROPDOWN_COLLECTION_INJECTION_KEY, COLLECTION_ITEM_INJECTION_KEY as DROPDOWN_COLLECTION_ITEM_INJECTION_KEY, ElCollection, ElCollectionItem, FIRST_KEYS, FIRST_LAST_KEYS, LAST_KEYS, dropdownItemProps, dropdownMenuProps, dropdownProps };
//# sourceMappingURL=dropdown.mjs.map
