import '../../../../utils/index.mjs';
import { isClient } from '@vueuse/core';

let isDragging = false;
function draggable(element, options) {
  if (!isClient)
    return;
  const moveFn = function(event) {
    var _a;
    (_a = options.drag) == null ? void 0 : _a.call(options, event);
  };
  const upFn = function(event) {
    var _a;
    document.removeEventListener("mousemove", moveFn);
    document.removeEventListener("mouseup", upFn);
    document.removeEventListener("touchmove", moveFn);
    document.removeEventListener("touchend", upFn);
    document.onselectstart = null;
    document.ondragstart = null;
    isDragging = false;
    (_a = options.end) == null ? void 0 : _a.call(options, event);
  };
  const downFn = function(event) {
    var _a;
    if (isDragging)
      return;
    event.preventDefault();
    document.onselectstart = () => false;
    document.ondragstart = () => false;
    document.addEventListener("mousemove", moveFn);
    document.addEventListener("mouseup", upFn);
    document.addEventListener("touchmove", moveFn);
    document.addEventListener("touchend", upFn);
    isDragging = true;
    (_a = options.start) == null ? void 0 : _a.call(options, event);
  };
  element.addEventListener("mousedown", downFn);
  element.addEventListener("touchstart", downFn);
}

export { draggable };
//# sourceMappingURL=draggable.mjs.map
