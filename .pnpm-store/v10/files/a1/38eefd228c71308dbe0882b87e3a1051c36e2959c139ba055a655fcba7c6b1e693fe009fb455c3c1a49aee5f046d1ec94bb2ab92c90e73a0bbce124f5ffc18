import '../../../utils/index.mjs';
import { isLeaf } from '../../../utils/dom/aria.mjs';

const getMenuIndex = (el) => {
  if (!el)
    return 0;
  const pieces = el.id.split("-");
  return Number(pieces[pieces.length - 2]);
};
const checkNode = (el) => {
  if (!el)
    return;
  const input = el.querySelector("input");
  if (input) {
    input.click();
  } else if (isLeaf(el)) {
    el.click();
  }
};
const sortByOriginalOrder = (oldNodes, newNodes) => {
  const newNodesCopy = newNodes.slice(0);
  const newIds = newNodesCopy.map((node) => node.uid);
  const res = oldNodes.reduce((acc, item) => {
    const index = newIds.indexOf(item.uid);
    if (index > -1) {
      acc.push(item);
      newNodesCopy.splice(index, 1);
      newIds.splice(index, 1);
    }
    return acc;
  }, []);
  res.push(...newNodesCopy);
  return res;
};

export { checkNode, getMenuIndex, sortByOriginalOrder };
//# sourceMappingURL=utils.mjs.map
