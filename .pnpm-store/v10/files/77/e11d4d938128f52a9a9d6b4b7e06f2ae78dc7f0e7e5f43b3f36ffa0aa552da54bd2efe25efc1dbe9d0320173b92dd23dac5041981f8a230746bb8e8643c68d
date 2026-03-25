'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
var shared = require('./shared.js');
var runtime = require('../../../../utils/vue/props/runtime.js');

const basicDateTableProps = runtime.buildProps({
  ...shared.datePickerSharedProps,
  cellClassName: {
    type: runtime.definePropType(Function)
  },
  showWeekNumber: Boolean,
  selectionMode: shared.selectionModeWithDefault("date")
});
const basicDateTableEmits = ["changerange", "pick", "select"];

exports.basicDateTableEmits = basicDateTableEmits;
exports.basicDateTableProps = basicDateTableProps;
//# sourceMappingURL=basic-date-table.js.map
