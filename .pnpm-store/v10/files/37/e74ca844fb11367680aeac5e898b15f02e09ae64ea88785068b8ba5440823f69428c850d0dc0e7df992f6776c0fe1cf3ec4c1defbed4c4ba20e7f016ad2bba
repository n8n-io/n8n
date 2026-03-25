import { isVNode, h } from 'vue';
import '../../../utils/index.mjs';
import { isArray, isFunction } from '@vue/shared';
import { addUnit } from '../../../utils/dom/style.mjs';

const sumReducer = (sum2, num) => sum2 + num;
const sum = (listLike) => {
  return isArray(listLike) ? listLike.reduce(sumReducer, 0) : listLike;
};
const tryCall = (fLike, params, defaultRet = {}) => {
  return isFunction(fLike) ? fLike(params) : fLike != null ? fLike : defaultRet;
};
const enforceUnit = (style) => {
  ;
  ["width", "maxWidth", "minWidth", "height"].forEach((key) => {
    style[key] = addUnit(style[key]);
  });
  return style;
};
const componentToSlot = (ComponentLike) => isVNode(ComponentLike) ? (props) => h(ComponentLike, props) : ComponentLike;

export { componentToSlot, enforceUnit, sum, tryCall };
//# sourceMappingURL=utils.mjs.map
