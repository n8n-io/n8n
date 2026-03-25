import '../../../constants/index.mjs';
import { EVENT_CODE } from '../../../constants/aria.mjs';

const MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
const getDirectionAwareKey = (key, dir) => {
  if (dir !== "rtl")
    return key;
  switch (key) {
    case EVENT_CODE.right:
      return EVENT_CODE.left;
    case EVENT_CODE.left:
      return EVENT_CODE.right;
    default:
      return key;
  }
};
const getFocusIntent = (event, orientation, dir) => {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && [EVENT_CODE.left, EVENT_CODE.right].includes(key))
    return void 0;
  if (orientation === "horizontal" && [EVENT_CODE.up, EVENT_CODE.down].includes(key))
    return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
};
const reorderArray = (array, atIdx) => {
  return array.map((_, idx) => array[(idx + atIdx) % array.length]);
};
const focusFirst = (elements) => {
  const { activeElement: prevActive } = document;
  for (const element of elements) {
    if (element === prevActive)
      return;
    element.focus();
    if (prevActive !== document.activeElement)
      return;
  }
};

export { focusFirst, getFocusIntent, reorderArray };
//# sourceMappingURL=utils.mjs.map
