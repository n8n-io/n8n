import { createVNode, mergeProps } from 'vue';
import { ElIcon } from '../../../icon/index.mjs';
import { ArrowRight } from '@element-plus/icons-vue';

const ExpandIcon = (props) => {
  const {
    expanded,
    expandable,
    onExpand,
    style,
    size
  } = props;
  const expandIconProps = {
    onClick: expandable ? () => onExpand(!expanded) : void 0,
    class: props.class
  };
  return createVNode(ElIcon, mergeProps(expandIconProps, {
    "size": size,
    "style": style
  }), {
    default: () => [createVNode(ArrowRight, null, null)]
  });
};

export { ExpandIcon as default };
//# sourceMappingURL=expand-icon.mjs.map
