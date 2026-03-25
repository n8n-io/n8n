import { createVNode } from 'vue';
import { ElEmpty } from '../../../empty/index.mjs';

const Footer = (props, {
  slots
}) => {
  return createVNode("div", {
    "class": props.class,
    "style": props.style
  }, [slots.default ? slots.default() : createVNode(ElEmpty, null, null)]);
};
Footer.displayName = "ElTableV2Empty";

export { Footer as default };
//# sourceMappingURL=empty.mjs.map
