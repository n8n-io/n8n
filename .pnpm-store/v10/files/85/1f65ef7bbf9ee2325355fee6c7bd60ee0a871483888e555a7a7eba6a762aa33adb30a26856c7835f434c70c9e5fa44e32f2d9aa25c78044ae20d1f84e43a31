import '../../../../utils/index.mjs';
import { HORIZONTAL, VERTICAL } from '../defaults.mjs';
import { cAF, rAF } from '../../../../utils/raf.mjs';
import { isFirefox } from '../../../../utils/browser.mjs';

const LayoutKeys = {
  [HORIZONTAL]: "deltaX",
  [VERTICAL]: "deltaY"
};
const useWheel = ({ atEndEdge, atStartEdge, layout }, onWheelDelta) => {
  let frameHandle;
  let offset = 0;
  const hasReachedEdge = (offset2) => {
    const edgeReached = offset2 < 0 && atStartEdge.value || offset2 > 0 && atEndEdge.value;
    return edgeReached;
  };
  const onWheel = (e) => {
    cAF(frameHandle);
    const newOffset = e[LayoutKeys[layout.value]];
    if (hasReachedEdge(offset) && hasReachedEdge(offset + newOffset))
      return;
    offset += newOffset;
    if (!isFirefox()) {
      e.preventDefault();
    }
    frameHandle = rAF(() => {
      onWheelDelta(offset);
      offset = 0;
    });
  };
  return {
    hasReachedEdge,
    onWheel
  };
};

export { useWheel as default };
//# sourceMappingURL=use-wheel.mjs.map
