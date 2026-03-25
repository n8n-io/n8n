'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');

const RowJustify = [
  "start",
  "center",
  "end",
  "space-around",
  "space-between",
  "space-evenly"
];
const RowAlign = ["top", "middle", "bottom"];
const rowProps = runtime.buildProps({
  tag: {
    type: String,
    default: "div"
  },
  gutter: {
    type: Number,
    default: 0
  },
  justify: {
    type: String,
    values: RowJustify,
    default: "start"
  },
  align: {
    type: String,
    values: RowAlign
  }
});

exports.RowAlign = RowAlign;
exports.RowJustify = RowJustify;
exports.rowProps = rowProps;
//# sourceMappingURL=row.js.map
