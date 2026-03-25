import '../../../utils/index.mjs';
import { transferProps, transferCheckedChangeFn } from './transfer.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const CHECKED_CHANGE_EVENT = "checked-change";
const transferPanelProps = buildProps({
  data: transferProps.data,
  optionRender: {
    type: definePropType(Function)
  },
  placeholder: String,
  title: String,
  filterable: Boolean,
  format: transferProps.format,
  filterMethod: transferProps.filterMethod,
  defaultChecked: transferProps.leftDefaultChecked,
  props: transferProps.props
});
const transferPanelEmits = {
  [CHECKED_CHANGE_EVENT]: transferCheckedChangeFn
};

export { CHECKED_CHANGE_EVENT, transferPanelEmits, transferPanelProps };
//# sourceMappingURL=transfer-panel.mjs.map
