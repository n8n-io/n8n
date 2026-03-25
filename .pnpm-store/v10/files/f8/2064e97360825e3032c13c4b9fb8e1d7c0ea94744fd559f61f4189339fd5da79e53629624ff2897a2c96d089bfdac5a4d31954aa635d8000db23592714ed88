'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var types = require('../../../utils/types.js');
var event = require('../../../constants/event.js');

const affixProps = runtime.buildProps({
  zIndex: {
    type: runtime.definePropType([Number, String]),
    default: 100
  },
  target: {
    type: String,
    default: ""
  },
  offset: {
    type: Number,
    default: 0
  },
  position: {
    type: String,
    values: ["top", "bottom"],
    default: "top"
  }
});
const affixEmits = {
  scroll: ({ scrollTop, fixed }) => types.isNumber(scrollTop) && types.isBoolean(fixed),
  [event.CHANGE_EVENT]: (fixed) => types.isBoolean(fixed)
};

exports.affixEmits = affixEmits;
exports.affixProps = affixProps;
//# sourceMappingURL=affix.js.map
