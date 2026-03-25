import '../../../../utils/index.mjs';
import { disabledTimeListsProps } from './shared.mjs';
import { buildProps, definePropType } from '../../../../utils/vue/props/runtime.mjs';

const basicTimeSpinnerProps = buildProps({
  role: {
    type: String,
    required: true
  },
  spinnerDate: {
    type: definePropType(Object),
    required: true
  },
  showSeconds: {
    type: Boolean,
    default: true
  },
  arrowControl: Boolean,
  amPmMode: {
    type: definePropType(String),
    default: ""
  },
  ...disabledTimeListsProps
});

export { basicTimeSpinnerProps };
//# sourceMappingURL=basic-time-spinner.mjs.map
