import { createVNode } from 'vue';

const TableV2Cell = (props, {
  slots
}) => {
  var _a;
  const {
    cellData,
    style
  } = props;
  const displayText = ((_a = cellData == null ? void 0 : cellData.toString) == null ? void 0 : _a.call(cellData)) || "";
  return createVNode("div", {
    "class": props.class,
    "title": displayText,
    "style": style
  }, [slots.default ? slots.default(props) : displayText]);
};
TableV2Cell.displayName = "ElTableV2Cell";
TableV2Cell.inheritAttrs = false;

export { TableV2Cell as default };
//# sourceMappingURL=cell.mjs.map
