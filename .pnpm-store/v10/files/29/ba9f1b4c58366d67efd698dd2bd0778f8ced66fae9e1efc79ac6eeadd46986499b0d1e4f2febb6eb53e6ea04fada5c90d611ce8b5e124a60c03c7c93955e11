import { isValueEqualOrExist } from "./isValueEqualOrExist.js";
import { computed } from "vue";
import { isEqual } from "ohash";
import { useVModel } from "@vueuse/core";

//#region src/shared/useSingleOrMultipleValue.ts
/**
* Validates the props and it makes sure that the types are coherent with each other
*
* 1. If type, defaultValue, and modelValue are all undefined, throw an error.
* 2. If modelValue and defaultValue are defined and not of the same type, throw an error.
* 3. If type is defined:
*    a. If type is 'single' and either modelValue or defaultValue is an array, log an error and return 'multiple'.
*    b. If type is 'multiple' and neither modelValue nor defaultValue is an array, log an error and return 'single'.
* 4. Return 'multiple' if modelValue is an array, else return 'single'.
*/
function validateProps({ type, defaultValue, modelValue }) {
	const value = modelValue || defaultValue;
	const canTypeBeInferred = modelValue !== void 0 || defaultValue !== void 0;
	if (canTypeBeInferred) return Array.isArray(value) ? "multiple" : "single";
	else return type ?? "single";
}
function getDefaultType({ type, defaultValue, modelValue }) {
	if (type) return type;
	return validateProps({
		type,
		defaultValue,
		modelValue
	});
}
function getDefaultValue({ type, defaultValue }) {
	if (defaultValue !== void 0) return defaultValue;
	return type === "single" ? void 0 : [];
}
function useSingleOrMultipleValue(props, emits) {
	const type = computed(() => getDefaultType(props));
	const modelValue = useVModel(props, "modelValue", emits, {
		defaultValue: getDefaultValue(props),
		passive: props.modelValue === void 0,
		deep: true
	});
	function changeModelValue(value) {
		if (type.value === "single") modelValue.value = isEqual(value, modelValue.value) ? void 0 : value;
		else {
			const modelValueArray = Array.isArray(modelValue.value) ? [...modelValue.value || []] : [modelValue.value].filter(Boolean);
			if (isValueEqualOrExist(modelValueArray, value)) {
				const index = modelValueArray.findIndex((i) => isEqual(i, value));
				modelValueArray.splice(index, 1);
			} else modelValueArray.push(value);
			modelValue.value = modelValueArray;
		}
	}
	const isSingle = computed(() => type.value === "single");
	return {
		modelValue,
		changeModelValue,
		isSingle
	};
}

//#endregion
export { useSingleOrMultipleValue };
//# sourceMappingURL=useSingleOrMultipleValue.js.map