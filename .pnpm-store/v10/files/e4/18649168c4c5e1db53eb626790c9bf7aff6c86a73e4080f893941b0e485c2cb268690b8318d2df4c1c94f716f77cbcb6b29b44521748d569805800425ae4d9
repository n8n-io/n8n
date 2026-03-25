import { inject, ref, computed, toRaw } from 'vue';
import { isEqual, isNil } from 'lodash-unified';
import '../../../form/index.mjs';
import '../../../../utils/index.mjs';
import { checkboxGroupContextKey } from '../constants.mjs';
import { isBoolean } from '../../../../utils/types.mjs';
import { isArray, isObject } from '@vue/shared';
import { useFormSize } from '../../../form/src/hooks/use-form-common-props.mjs';

const useCheckboxStatus = (props, slots, { model }) => {
  const checkboxGroup = inject(checkboxGroupContextKey, void 0);
  const isFocused = ref(false);
  const isChecked = computed(() => {
    const value = model.value;
    if (isBoolean(value)) {
      return value;
    } else if (isArray(value)) {
      if (isObject(props.label)) {
        return value.map(toRaw).some((o) => isEqual(o, props.label));
      } else {
        return value.map(toRaw).includes(props.label);
      }
    } else if (value !== null && value !== void 0) {
      return value === props.trueLabel;
    } else {
      return !!value;
    }
  });
  const checkboxButtonSize = useFormSize(computed(() => {
    var _a;
    return (_a = checkboxGroup == null ? void 0 : checkboxGroup.size) == null ? void 0 : _a.value;
  }), {
    prop: true
  });
  const checkboxSize = useFormSize(computed(() => {
    var _a;
    return (_a = checkboxGroup == null ? void 0 : checkboxGroup.size) == null ? void 0 : _a.value;
  }));
  const hasOwnLabel = computed(() => {
    return !!slots.default || !isNil(props.label);
  });
  return {
    checkboxButtonSize,
    isChecked,
    isFocused,
    checkboxSize,
    hasOwnLabel
  };
};

export { useCheckboxStatus };
//# sourceMappingURL=use-checkbox-status.mjs.map
