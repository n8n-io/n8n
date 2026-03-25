import { isNil } from 'lodash-unified';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { isString } from '@vue/shared';

const colorPickerProps = buildProps({
  modelValue: String,
  id: String,
  showAlpha: Boolean,
  colorFormat: String,
  disabled: Boolean,
  size: useSizeProp,
  popperClass: {
    type: String,
    default: ""
  },
  label: {
    type: String,
    default: void 0
  },
  tabindex: {
    type: [String, Number],
    default: 0
  },
  predefine: {
    type: definePropType(Array)
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const colorPickerEmits = {
  [UPDATE_MODEL_EVENT]: (val) => isString(val) || isNil(val),
  [CHANGE_EVENT]: (val) => isString(val) || isNil(val),
  activeChange: (val) => isString(val) || isNil(val),
  focus: (event) => event instanceof FocusEvent,
  blur: (event) => event instanceof FocusEvent
};
const colorPickerContextKey = Symbol("colorPickerContextKey");

export { colorPickerContextKey, colorPickerEmits, colorPickerProps };
//# sourceMappingURL=color-picker.mjs.map
