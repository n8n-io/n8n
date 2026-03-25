import { computed } from "vue";
import { toValue as toValue$1, unrefElement } from "@vueuse/core";

//#region src/shared/useFormControl.ts
function useFormControl(el) {
	return computed(() => toValue$1(el) ? Boolean(unrefElement(el)?.closest("form")) : true);
}

//#endregion
export { useFormControl };
//# sourceMappingURL=useFormControl.js.map