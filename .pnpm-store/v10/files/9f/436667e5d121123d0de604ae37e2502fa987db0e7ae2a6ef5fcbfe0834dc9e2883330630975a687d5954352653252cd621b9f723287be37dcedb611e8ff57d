'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var shared = require('@vue/shared');

const useSameTarget = (handleClick) => {
  if (!handleClick) {
    return { onClick: shared.NOOP, onMousedown: shared.NOOP, onMouseup: shared.NOOP };
  }
  let mousedownTarget = false;
  let mouseupTarget = false;
  const onClick = (e) => {
    if (mousedownTarget && mouseupTarget) {
      handleClick(e);
    }
    mousedownTarget = mouseupTarget = false;
  };
  const onMousedown = (e) => {
    mousedownTarget = e.target === e.currentTarget;
  };
  const onMouseup = (e) => {
    mouseupTarget = e.target === e.currentTarget;
  };
  return { onClick, onMousedown, onMouseup };
};

exports.useSameTarget = useSameTarget;
//# sourceMappingURL=index.js.map
