import { isVNode, createVNode, mergeProps } from 'vue';
import TableGrid from '../table-grid.mjs';

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !isVNode(s);
}
const MainTable = (props, {
  slots
}) => {
  const {
    mainTableRef,
    ...rest
  } = props;
  return createVNode(TableGrid, mergeProps({
    "ref": mainTableRef
  }, rest), _isSlot(slots) ? slots : {
    default: () => [slots]
  });
};

export { MainTable as default };
//# sourceMappingURL=main-table.mjs.map
