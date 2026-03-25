import { createVNode } from 'vue';
import { ElIcon } from '../../../icon/index.mjs';
import { SortUp, SortDown } from '@element-plus/icons-vue';
import { SortOrder } from '../constants.mjs';

const SortIcon = (props) => {
  const {
    sortOrder
  } = props;
  return createVNode(ElIcon, {
    "size": 14,
    "class": props.class
  }, {
    default: () => [sortOrder === SortOrder.ASC ? createVNode(SortUp, null, null) : createVNode(SortDown, null, null)]
  });
};

export { SortIcon as default };
//# sourceMappingURL=sort-icon.mjs.map
