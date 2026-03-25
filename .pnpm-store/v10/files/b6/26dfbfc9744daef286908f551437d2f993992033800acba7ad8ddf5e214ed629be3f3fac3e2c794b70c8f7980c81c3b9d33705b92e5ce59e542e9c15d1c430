'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var types = require('../../../../utils/types.js');

const useScrollbar = () => {
  const scrollBarRef = vue.ref();
  const scrollTo = (options, yCoord) => {
    const scrollbar = scrollBarRef.value;
    if (scrollbar) {
      scrollbar.scrollTo(options, yCoord);
    }
  };
  const setScrollPosition = (position, offset) => {
    const scrollbar = scrollBarRef.value;
    if (scrollbar && types.isNumber(offset) && ["Top", "Left"].includes(position)) {
      scrollbar[`setScroll${position}`](offset);
    }
  };
  const setScrollTop = (top) => setScrollPosition("Top", top);
  const setScrollLeft = (left) => setScrollPosition("Left", left);
  return {
    scrollBarRef,
    scrollTo,
    setScrollTop,
    setScrollLeft
  };
};

exports.useScrollbar = useScrollbar;
//# sourceMappingURL=use-scrollbar.js.map
