import { isVNode, createVNode, mergeProps } from 'vue';
import TableGrid from '../table-grid.mjs';

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !isVNode(s);
}
const LeftTable = (props, {
  slots
}) => {
  if (!props.columns.length)
    return;
  const {
    rightTableRef,
    ...rest
  } = props;
  return createVNode(TableGrid, mergeProps({
    "ref": rightTableRef
  }, rest), _isSlot(slots) ? slots : {
    default: () => [slots]
  });
};

export { LeftTable as default };
//# sourceMappingURL=right-table.mjs.map
