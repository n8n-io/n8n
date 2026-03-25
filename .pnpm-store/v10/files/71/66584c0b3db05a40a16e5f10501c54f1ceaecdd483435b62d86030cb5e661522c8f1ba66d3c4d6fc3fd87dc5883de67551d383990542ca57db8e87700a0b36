import { ref, inject, computed, unref } from 'vue';
import '../../../../hooks/index.mjs';
import { formContextKey, formItemContextKey } from '../constants.mjs';
import { useProp } from '../../../../hooks/use-prop/index.mjs';
import { useGlobalSize } from '../../../../hooks/use-size/index.mjs';

const useFormSize = (fallback, ignore = {}) => {
  const emptyRef = ref(void 0);
  const size = ignore.prop ? emptyRef : useProp("size");
  const globalConfig = ignore.global ? emptyRef : useGlobalSize();
  const form = ignore.form ? { size: void 0 } : inject(formContextKey, void 0);
  const formItem = ignore.formItem ? { size: void 0 } : inject(formItemContextKey, void 0);
  return computed(() => size.value || unref(fallback) || (formItem == null ? void 0 : formItem.size) || (form == null ? void 0 : form.size) || globalConfig.value || "");
};
const useFormDisabled = (fallback) => {
  const disabled = useProp("disabled");
  const form = inject(formContextKey, void 0);
  return computed(() => disabled.value || unref(fallback) || (form == null ? void 0 : form.disabled) || false);
};
const useSize = useFormSize;
const useDisabled = useFormDisabled;

export { useDisabled, useFormDisabled, useFormSize, useSize };
//# sourceMappingURL=use-form-common-props.mjs.map
