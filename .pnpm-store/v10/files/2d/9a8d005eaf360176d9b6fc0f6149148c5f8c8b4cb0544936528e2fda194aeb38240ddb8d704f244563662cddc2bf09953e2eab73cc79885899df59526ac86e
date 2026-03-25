import { isFunction } from '@vue/shared';
import '../../../../utils/index.mjs';
import createGrid from '../builders/build-grid.mjs';
import { SMART_ALIGNMENT, AUTO_ALIGNMENT, CENTERED_ALIGNMENT, END_ALIGNMENT, START_ALIGNMENT, DEFAULT_DYNAMIC_LIST_ITEM_SIZE } from '../defaults.mjs';
import { isUndefined, isNumber } from '../../../../utils/types.mjs';
import { throwError } from '../../../../utils/error.mjs';

const { max, min, floor } = Math;
const SCOPE = "ElDynamicSizeGrid";
const ACCESS_SIZER_KEY_MAP = {
  column: "columnWidth",
  row: "rowHeight"
};
const ACCESS_LAST_VISITED_KEY_MAP = {
  column: "lastVisitedColumnIndex",
  row: "lastVisitedRowIndex"
};
const getItemFromCache = (props, index, gridCache, type) => {
  const [cachedItems, sizer, lastVisited] = [
    gridCache[type],
    props[ACCESS_SIZER_KEY_MAP[type]],
    gridCache[ACCESS_LAST_VISITED_KEY_MAP[type]]
  ];
  if (index > lastVisited) {
    let offset = 0;
    if (lastVisited >= 0) {
      const item = cachedItems[lastVisited];
      offset = item.offset + item.size;
    }
    for (let i = lastVisited + 1; i <= index; i++) {
      const size = sizer(i);
      cachedItems[i] = {
        offset,
        size
      };
      offset += size;
    }
    gridCache[ACCESS_LAST_VISITED_KEY_MAP[type]] = index;
  }
  return cachedItems[index];
};
const bs = (props, gridCache, low, high, offset, type) => {
  while (low <= high) {
    const mid = low + floor((high - low) / 2);
    const currentOffset = getItemFromCache(props, mid, gridCache, type).offset;
    if (currentOffset === offset) {
      return mid;
    } else if (currentOffset < offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return max(0, low - 1);
};
const es = (props, gridCache, idx, offset, type) => {
  const total = type === "column" ? props.totalColumn : props.totalRow;
  let exponent = 1;
  while (idx < total && getItemFromCache(props, idx, gridCache, type).offset < offset) {
    idx += exponent;
    exponent *= 2;
  }
  return bs(props, gridCache, floor(idx / 2), min(idx, total - 1), offset, type);
};
const findItem = (props, gridCache, offset, type) => {
  const [cache, lastVisitedIndex] = [
    gridCache[type],
    gridCache[ACCESS_LAST_VISITED_KEY_MAP[type]]
  ];
  const lastVisitedItemOffset = lastVisitedIndex > 0 ? cache[lastVisitedIndex].offset : 0;
  if (lastVisitedItemOffset >= offset) {
    return bs(props, gridCache, 0, lastVisitedIndex, offset, type);
  }
  return es(props, gridCache, max(0, lastVisitedIndex), offset, type);
};
const getEstimatedTotalHeight = ({ totalRow }, { estimatedRowHeight, lastVisitedRowIndex, row }) => {
  let sizeOfVisitedRows = 0;
  if (lastVisitedRowIndex >= totalRow) {
    lastVisitedRowIndex = totalRow - 1;
  }
  if (lastVisitedRowIndex >= 0) {
    const item = row[lastVisitedRowIndex];
    sizeOfVisitedRows = item.offset + item.size;
  }
  const unvisitedItems = totalRow - lastVisitedRowIndex - 1;
  const sizeOfUnvisitedItems = unvisitedItems * estimatedRowHeight;
  return sizeOfVisitedRows + sizeOfUnvisitedItems;
};
const getEstimatedTotalWidth = ({ totalColumn }, { column, estimatedColumnWidth, lastVisitedColumnIndex }) => {
  let sizeOfVisitedColumns = 0;
  if (lastVisitedColumnIndex > totalColumn) {
    lastVisitedColumnIndex = totalColumn - 1;
  }
  if (lastVisitedColumnIndex >= 0) {
    const item = column[lastVisitedColumnIndex];
    sizeOfVisitedColumns = item.offset + item.size;
  }
  const unvisitedItems = totalColumn - lastVisitedColumnIndex - 1;
  const sizeOfUnvisitedItems = unvisitedItems * estimatedColumnWidth;
  return sizeOfVisitedColumns + sizeOfUnvisitedItems;
};
const ACCESS_ESTIMATED_SIZE_KEY_MAP = {
  column: getEstimatedTotalWidth,
  row: getEstimatedTotalHeight
};
const getOffset = (props, index, alignment, scrollOffset, cache, type, scrollBarWidth) => {
  const [size, estimatedSizeAssociates] = [
    type === "row" ? props.height : props.width,
    ACCESS_ESTIMATED_SIZE_KEY_MAP[type]
  ];
  const item = getItemFromCache(props, index, cache, type);
  const estimatedSize = estimatedSizeAssociates(props, cache);
  const maxOffset = max(0, min(estimatedSize - size, item.offset));
  const minOffset = max(0, item.offset - size + scrollBarWidth + item.size);
  if (alignment === SMART_ALIGNMENT) {
    if (scrollOffset >= minOffset - size && scrollOffset <= maxOffset + size) {
      alignment = AUTO_ALIGNMENT;
    } else {
      alignment = CENTERED_ALIGNMENT;
    }
  }
  switch (alignment) {
    case START_ALIGNMENT: {
      return maxOffset;
    }
    case END_ALIGNMENT: {
      return minOffset;
    }
    case CENTERED_ALIGNMENT: {
      return Math.round(minOffset + (maxOffset - minOffset) / 2);
    }
    case AUTO_ALIGNMENT:
    default: {
      if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
        return scrollOffset;
      } else if (minOffset > maxOffset) {
        return minOffset;
      } else if (scrollOffset < minOffset) {
        return minOffset;
      } else {
        return maxOffset;
      }
    }
  }
};
const DynamicSizeGrid = createGrid({
  name: "ElDynamicSizeGrid",
  getColumnPosition: (props, idx, cache) => {
    const item = getItemFromCache(props, idx, cache, "column");
    return [item.size, item.offset];
  },
  getRowPosition: (props, idx, cache) => {
    const item = getItemFromCache(props, idx, cache, "row");
    return [item.size, item.offset];
  },
  getColumnOffset: (props, columnIndex, alignment, scrollLeft, cache, scrollBarWidth) => getOffset(props, columnIndex, alignment, scrollLeft, cache, "column", scrollBarWidth),
  getRowOffset: (props, rowIndex, alignment, scrollTop, cache, scrollBarWidth) => getOffset(props, rowIndex, alignment, scrollTop, cache, "row", scrollBarWidth),
  getColumnStartIndexForOffset: (props, scrollLeft, cache) => findItem(props, cache, scrollLeft, "column"),
  getColumnStopIndexForStartIndex: (props, startIndex, scrollLeft, cache) => {
    const item = getItemFromCache(props, startIndex, cache, "column");
    const maxOffset = scrollLeft + props.width;
    let offset = item.offset + item.size;
    let stopIndex = startIndex;
    while (stopIndex < props.totalColumn - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemFromCache(props, startIndex, cache, "column").size;
    }
    return stopIndex;
  },
  getEstimatedTotalHeight,
  getEstimatedTotalWidth,
  getRowStartIndexForOffset: (props, scrollTop, cache) => findItem(props, cache, scrollTop, "row"),
  getRowStopIndexForStartIndex: (props, startIndex, scrollTop, cache) => {
    const { totalRow, height } = props;
    const item = getItemFromCache(props, startIndex, cache, "row");
    const maxOffset = scrollTop + height;
    let offset = item.size + item.offset;
    let stopIndex = startIndex;
    while (stopIndex < totalRow - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemFromCache(props, stopIndex, cache, "row").size;
    }
    return stopIndex;
  },
  injectToInstance: (instance, cache) => {
    const resetAfter = ({ columnIndex, rowIndex }, forceUpdate) => {
      var _a, _b;
      forceUpdate = isUndefined(forceUpdate) ? true : forceUpdate;
      if (isNumber(columnIndex)) {
        cache.value.lastVisitedColumnIndex = Math.min(cache.value.lastVisitedColumnIndex, columnIndex - 1);
      }
      if (isNumber(rowIndex)) {
        cache.value.lastVisitedRowIndex = Math.min(cache.value.lastVisitedRowIndex, rowIndex - 1);
      }
      (_a = instance.exposed) == null ? void 0 : _a.getItemStyleCache.value(-1, null, null);
      if (forceUpdate)
        (_b = instance.proxy) == null ? void 0 : _b.$forceUpdate();
    };
    const resetAfterColumnIndex = (columnIndex, forceUpdate) => {
      resetAfter({
        columnIndex
      }, forceUpdate);
    };
    const resetAfterRowIndex = (rowIndex, forceUpdate) => {
      resetAfter({
        rowIndex
      }, forceUpdate);
    };
    Object.assign(instance.proxy, {
      resetAfterColumnIndex,
      resetAfterRowIndex,
      resetAfter
    });
  },
  initCache: ({
    estimatedColumnWidth = DEFAULT_DYNAMIC_LIST_ITEM_SIZE,
    estimatedRowHeight = DEFAULT_DYNAMIC_LIST_ITEM_SIZE
  }) => {
    const cache = {
      column: {},
      estimatedColumnWidth,
      estimatedRowHeight,
      lastVisitedColumnIndex: -1,
      lastVisitedRowIndex: -1,
      row: {}
    };
    return cache;
  },
  clearCache: false,
  validateProps: ({ columnWidth, rowHeight }) => {
    if (process.env.NODE_ENV !== "production") {
      if (!isFunction(columnWidth)) {
        throwError(SCOPE, `
          "columnWidth" must be passed as function,
            instead ${typeof columnWidth} was given.
        `);
      }
      if (!isFunction(rowHeight)) {
        throwError(SCOPE, `
          "rowHeight" must be passed as function,
            instead ${typeof rowHeight} was given.
        `);
      }
    }
  }
});

export { DynamicSizeGrid as default };
//# sourceMappingURL=dynamic-size-grid.mjs.map
