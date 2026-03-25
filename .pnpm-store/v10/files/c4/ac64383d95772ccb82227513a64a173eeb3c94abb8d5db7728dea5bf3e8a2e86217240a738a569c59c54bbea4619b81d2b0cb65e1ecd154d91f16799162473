import '../../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../../utils/vue/props/runtime.mjs';

const disabledTimeListsProps = buildProps({
  disabledHours: {
    type: definePropType(Function)
  },
  disabledMinutes: {
    type: definePropType(Function)
  },
  disabledSeconds: {
    type: definePropType(Function)
  }
});
const timePanelSharedProps = buildProps({
  visible: Boolean,
  actualVisible: {
    type: Boolean,
    default: void 0
  },
  format: {
    type: String,
    default: ""
  }
});

export { disabledTimeListsProps, timePanelSharedProps };
//# sourceMappingURL=shared.mjs.map
