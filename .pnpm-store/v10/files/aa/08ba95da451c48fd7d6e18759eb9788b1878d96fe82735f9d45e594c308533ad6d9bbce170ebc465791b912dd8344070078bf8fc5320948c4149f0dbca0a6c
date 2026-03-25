'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../collection/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var collection = require('../../collection/src/collection.js');

const rovingFocusGroupProps = runtime.buildProps({
  style: { type: runtime.definePropType([String, Array, Object]) },
  currentTabId: {
    type: runtime.definePropType(String)
  },
  defaultCurrentTabId: String,
  loop: Boolean,
  dir: {
    type: String,
    values: ["ltr", "rtl"],
    default: "ltr"
  },
  orientation: {
    type: runtime.definePropType(String)
  },
  onBlur: Function,
  onFocus: Function,
  onMousedown: Function
});
const {
  ElCollection,
  ElCollectionItem,
  COLLECTION_INJECTION_KEY,
  COLLECTION_ITEM_INJECTION_KEY
} = collection.createCollectionWithScope("RovingFocusGroup");

exports.ElCollection = ElCollection;
exports.ElCollectionItem = ElCollectionItem;
exports.ROVING_FOCUS_COLLECTION_INJECTION_KEY = COLLECTION_INJECTION_KEY;
exports.ROVING_FOCUS_ITEM_COLLECTION_INJECTION_KEY = COLLECTION_ITEM_INJECTION_KEY;
exports.rovingFocusGroupProps = rovingFocusGroupProps;
//# sourceMappingURL=roving-focus-group.js.map
