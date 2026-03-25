import '../../../constants/index.mjs';
import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { componentSizes } from '../../../constants/size.mjs';
import { isArray, isString } from '@vue/shared';
import { isBoolean } from '../../../utils/types.mjs';

const formMetaProps = buildProps({
  size: {
    type: String,
    values: componentSizes
  },
  disabled: Boolean
});
const formProps = buildProps({
  ...formMetaProps,
  model: Object,
  rules: {
    type: definePropType(Object)
  },
  labelPosition: {
    type: String,
    values: ["left", "right", "top"],
    default: "right"
  },
  requireAsteriskPosition: {
    type: String,
    values: ["left", "right"],
    default: "left"
  },
  labelWidth: {
    type: [String, Number],
    default: ""
  },
  labelSuffix: {
    type: String,
    default: ""
  },
  inline: Boolean,
  inlineMessage: Boolean,
  statusIcon: Boolean,
  showMessage: {
    type: Boolean,
    default: true
  },
  validateOnRuleChange: {
    type: Boolean,
    default: true
  },
  hideRequiredAsterisk: Boolean,
  scrollToError: Boolean,
  scrollIntoViewOptions: {
    type: [Object, Boolean]
  }
});
const formEmits = {
  validate: (prop, isValid, message) => (isArray(prop) || isString(prop)) && isBoolean(isValid) && isString(message)
};

export { formEmits, formProps };
//# sourceMappingURL=form.mjs.map
