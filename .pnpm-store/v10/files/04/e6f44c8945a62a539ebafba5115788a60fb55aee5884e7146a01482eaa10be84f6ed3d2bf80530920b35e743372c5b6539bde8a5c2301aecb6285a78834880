import { computed, toValue } from "vue";
import { unrefElement } from "@vueuse/core";

//#region src/shared/useFormControl.ts
function useFormControl(el) {
	return computed(() => toValue(el) ? Boolean(unrefElement(el)?.closest("form")) : true);
}

//#endregion
export { useFormControl };
//# sourceMappingURL=useFormControl.js.map