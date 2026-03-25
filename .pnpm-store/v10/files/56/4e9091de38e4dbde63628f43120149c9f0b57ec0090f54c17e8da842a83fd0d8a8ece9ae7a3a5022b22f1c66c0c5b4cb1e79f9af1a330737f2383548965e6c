'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
var buildList = require('../builders/build-list.js');
var utils = require('../utils.js');
var defaults = require('../defaults.js');
var shared = require('@vue/shared');
var error = require('../../../../utils/error.js');

const FixedSizeList = buildList["default"]({
  name: "ElFixedSizeList",
  getItemOffset: ({ itemSize }, index) => index * itemSize,
  getItemSize: ({ itemSize }) => itemSize,
  getEstimatedTotalSize: ({ total, itemSize }) => itemSize * total,
  getOffset: ({ height, total, itemSize, layout, width }, index, alignment, scrollOffset) => {
    const size = utils.isHorizontal(layout) ? width : height;
    if (process.env.NODE_ENV !== "production" && shared.isString(size)) {
      error.throwError("[ElVirtualList]", `
        You should set
          width/height
        to number when your layout is
          horizontal/vertical
      `);
    }
    const lastItemOffset = Math.max(0, total * itemSize - size);
    const maxOffset = Math.min(lastItemOffset, index * itemSize);
    const minOffset = Math.max(0, (index + 1) * itemSize - size);
    if (alignment === defaults.SMART_ALIGNMENT) {
      if (scrollOffset >= minOffset - size && scrollOffset <= maxOffset + size) {
        alignment = defaults.AUTO_ALIGNMENT;
      } else {
        alignment = defaults.CENTERED_ALIGNMENT;
      }
    }
    switch (alignment) {
      case defaults.START_ALIGNMENT: {
        return maxOffset;
      }
      case defaults.END_ALIGNMENT: {
        return minOffset;
      }
      case defaults.CENTERED_ALIGNMENT: {
        const middleOffset = Math.round(minOffset + (maxOffset - minOffset) / 2);
        if (middleOffset < Math.ceil(size / 2)) {
          return 0;
        } else if (middleOffset > lastItemOffset + Math.floor(size / 2)) {
          return lastItemOffset;
        } else {
          return middleOffset;
        }
      }
      case defaults.AUTO_ALIGNMENT:
      default: {
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset < minOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
      }
    }
  },
  getStartIndexForOffset: ({ total, itemSize }, offset) => Math.max(0, Math.min(total - 1, Math.floor(offset / itemSize))),
  getStopIndexForStartIndex: ({ height, total, itemSize, layout, width }, startIndex, scrollOffset) => {
    const offset = startIndex * itemSize;
    const size = utils.isHorizontal(layout) ? width : height;
    const numVisibleItems = Math.ceil((size + scrollOffset - offset) / itemSize);
    return Math.max(0, Math.min(total - 1, startIndex + numVisibleItems - 1));
  },
  initCache() {
    return void 0;
  },
  clearCache: true,
  validateProps() {
  }
});

exports["default"] = FixedSizeList;
//# sourceMappingURL=fixed-size-list.js.map
