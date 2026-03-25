import { StarFilled, Star } from '@element-plus/icons-vue';
import '../../../constants/index.mjs';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { CHANGE_EVENT, UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { isNumber } from '../../../utils/types.mjs';

const rateProps = buildProps({
  modelValue: {
    type: Number,
    default: 0
  },
  id: {
    type: String,
    default: void 0
  },
  lowThreshold: {
    type: Number,
    default: 2
  },
  highThreshold: {
    type: Number,
    default: 4
  },
  max: {
    type: Number,
    default: 5
  },
  colors: {
    type: definePropType([Array, Object]),
    default: () => mutable(["", "", ""])
  },
  voidColor: {
    type: String,
    default: ""
  },
  disabledVoidColor: {
    type: String,
    default: ""
  },
  icons: {
    type: definePropType([Array, Object]),
    default: () => [StarFilled, StarFilled, StarFilled]
  },
  voidIcon: {
    type: iconPropType,
    default: () => Star
  },
  disabledVoidIcon: {
    type: iconPropType,
    default: () => StarFilled
  },
  disabled: Boolean,
  allowHalf: Boolean,
  showText: Boolean,
  showScore: Boolean,
  textColor: {
    type: String,
    default: ""
  },
  texts: {
    type: definePropType(Array),
    default: () => mutable([
      "Extremely bad",
      "Disappointed",
      "Fair",
      "Satisfied",
      "Surprise"
    ])
  },
  scoreTemplate: {
    type: String,
    default: "{value}"
  },
  size: useSizeProp,
  label: {
    type: String,
    default: void 0
  },
  clearable: {
    type: Boolean,
    default: false
  }
});
const rateEmits = {
  [CHANGE_EVENT]: (value) => isNumber(value),
  [UPDATE_MODEL_EVENT]: (value) => isNumber(value)
};

export { rateEmits, rateProps };
//# sourceMappingURL=rate.mjs.map
