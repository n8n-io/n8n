'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
require('../../collection/index.js');
require('../../tooltip/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var trigger = require('../../tooltip/src/trigger.js');
var content = require('../../tooltip/src/content.js');
var icon = require('../../../utils/vue/icon.js');
var aria = require('../../../constants/aria.js');
var collection = require('../../collection/src/collection.js');

const dropdownProps = runtime.buildProps({
  trigger: trigger.useTooltipTriggerProps.trigger,
  effect: {
    ...content.useTooltipContentProps.effect,
    default: "light"
  },
  type: {
    type: runtime.definePropType(String)
  },
  placement: {
    type: runtime.definePropType(String),
    default: "bottom"
  },
  popperOptions: {
    type: runtime.definePropType(Object),
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
    type: runtime.definePropType([Number, String]),
    default: 0
  },
  maxHeight: {
    type: runtime.definePropType([Number, String]),
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
    type: runtime.definePropType(Object)
  },
  teleported: content.useTooltipContentProps.teleported
});
const dropdownItemProps = runtime.buildProps({
  command: {
    type: [Object, String, Number],
    default: () => ({})
  },
  disabled: Boolean,
  divided: Boolean,
  textValue: String,
  icon: {
    type: icon.iconPropType
  }
});
const dropdownMenuProps = runtime.buildProps({
  onKeydown: { type: runtime.definePropType(Function) }
});
const FIRST_KEYS = [
  aria.EVENT_CODE.down,
  aria.EVENT_CODE.pageDown,
  aria.EVENT_CODE.home
];
const LAST_KEYS = [aria.EVENT_CODE.up, aria.EVENT_CODE.pageUp, aria.EVENT_CODE.end];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
const {
  ElCollection,
  ElCollectionItem,
  COLLECTION_INJECTION_KEY,
  COLLECTION_ITEM_INJECTION_KEY
} = collection.createCollectionWithScope("Dropdown");

exports.DROPDOWN_COLLECTION_INJECTION_KEY = COLLECTION_INJECTION_KEY;
exports.DROPDOWN_COLLECTION_ITEM_INJECTION_KEY = COLLECTION_ITEM_INJECTION_KEY;
exports.ElCollection = ElCollection;
exports.ElCollectionItem = ElCollectionItem;
exports.FIRST_KEYS = FIRST_KEYS;
exports.FIRST_LAST_KEYS = FIRST_LAST_KEYS;
exports.LAST_KEYS = LAST_KEYS;
exports.dropdownItemProps = dropdownItemProps;
exports.dropdownMenuProps = dropdownMenuProps;
exports.dropdownProps = dropdownProps;
//# sourceMappingURL=dropdown.js.map
