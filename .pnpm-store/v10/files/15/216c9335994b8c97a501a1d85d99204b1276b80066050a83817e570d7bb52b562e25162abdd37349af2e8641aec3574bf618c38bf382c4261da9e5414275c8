'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var defaults = require('./defaults.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var typescript = require('../../../utils/typescript.js');

const itemSize = runtime.buildProp({
  type: runtime.definePropType([Number, Function]),
  required: true
});
const estimatedItemSize = runtime.buildProp({
  type: Number
});
const cache = runtime.buildProp({
  type: Number,
  default: 2
});
const direction = runtime.buildProp({
  type: String,
  values: ["ltr", "rtl"],
  default: "ltr"
});
const initScrollOffset = runtime.buildProp({
  type: Number,
  default: 0
});
const total = runtime.buildProp({
  type: Number,
  required: true
});
const layout = runtime.buildProp({
  type: String,
  values: ["horizontal", "vertical"],
  default: defaults.VERTICAL
});
const virtualizedProps = runtime.buildProps({
  className: {
    type: String,
    default: ""
  },
  containerElement: {
    type: runtime.definePropType([String, Object]),
    default: "div"
  },
  data: {
    type: runtime.definePropType(Array),
    default: () => typescript.mutable([])
  },
  direction,
  height: {
    type: [String, Number],
    required: true
  },
  innerElement: {
    type: [String, Object],
    default: "div"
  },
  style: {
    type: runtime.definePropType([Object, String, Array])
  },
  useIsScrolling: {
    type: Boolean,
    default: false
  },
  width: {
    type: [Number, String],
    required: false
  },
  perfMode: {
    type: Boolean,
    default: true
  },
  scrollbarAlwaysOn: {
    type: Boolean,
    default: false
  }
});
const virtualizedListProps = runtime.buildProps({
  cache,
  estimatedItemSize,
  layout,
  initScrollOffset,
  total,
  itemSize,
  ...virtualizedProps
});
const scrollbarSize = {
  type: Number,
  default: 6
};
const startGap = { type: Number, default: 0 };
const endGap = { type: Number, default: 2 };
const virtualizedGridProps = runtime.buildProps({
  columnCache: cache,
  columnWidth: itemSize,
  estimatedColumnWidth: estimatedItemSize,
  estimatedRowHeight: estimatedItemSize,
  initScrollLeft: initScrollOffset,
  initScrollTop: initScrollOffset,
  itemKey: {
    type: runtime.definePropType(Function),
    default: ({
      columnIndex,
      rowIndex
    }) => `${rowIndex}:${columnIndex}`
  },
  rowCache: cache,
  rowHeight: itemSize,
  totalColumn: total,
  totalRow: total,
  hScrollbarSize: scrollbarSize,
  vScrollbarSize: scrollbarSize,
  scrollbarStartGap: startGap,
  scrollbarEndGap: endGap,
  role: String,
  ...virtualizedProps
});
const virtualizedScrollbarProps = runtime.buildProps({
  alwaysOn: Boolean,
  class: String,
  layout,
  total,
  ratio: {
    type: Number,
    required: true
  },
  clientSize: {
    type: Number,
    required: true
  },
  scrollFrom: {
    type: Number,
    required: true
  },
  scrollbarSize,
  startGap,
  endGap,
  visible: Boolean
});

exports.virtualizedGridProps = virtualizedGridProps;
exports.virtualizedListProps = virtualizedListProps;
exports.virtualizedProps = virtualizedProps;
exports.virtualizedScrollbarProps = virtualizedScrollbarProps;
//# sourceMappingURL=props.js.map
