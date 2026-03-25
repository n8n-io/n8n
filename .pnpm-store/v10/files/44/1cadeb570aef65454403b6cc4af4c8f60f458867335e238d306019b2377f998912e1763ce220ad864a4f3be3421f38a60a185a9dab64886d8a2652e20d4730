import '../../../../utils/index.mjs';
import { datePickerSharedProps, selectionModeWithDefault } from './shared.mjs';
import { buildProps, definePropType } from '../../../../utils/vue/props/runtime.mjs';

const basicDateTableProps = buildProps({
  ...datePickerSharedProps,
  cellClassName: {
    type: definePropType(Function)
  },
  showWeekNumber: Boolean,
  selectionMode: selectionModeWithDefault("date")
});
const basicDateTableEmits = ["changerange", "pick", "select"];

export { basicDateTableEmits, basicDateTableProps };
//# sourceMappingURL=basic-date-table.mjs.map
