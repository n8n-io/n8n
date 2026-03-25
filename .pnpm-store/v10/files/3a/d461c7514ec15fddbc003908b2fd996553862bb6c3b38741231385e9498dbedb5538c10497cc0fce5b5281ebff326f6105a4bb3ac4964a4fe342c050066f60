const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_isValueEqualOrExist = require('./isValueEqualOrExist.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const ohash = require_rolldown_runtime.__toESM(require("ohash"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

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
	const type = (0, vue.computed)(() => getDefaultType(props));
	const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
		defaultValue: getDefaultValue(props),
		passive: props.modelValue === void 0,
		deep: true
	});
	function changeModelValue(value) {
		if (type.value === "single") modelValue.value = (0, ohash.isEqual)(value, modelValue.value) ? void 0 : value;
		else {
			const modelValueArray = Array.isArray(modelValue.value) ? [...modelValue.value || []] : [modelValue.value].filter(Boolean);
			if (require_shared_isValueEqualOrExist.isValueEqualOrExist(modelValueArray, value)) {
				const index = modelValueArray.findIndex((i) => (0, ohash.isEqual)(i, value));
				modelValueArray.splice(index, 1);
			} else modelValueArray.push(value);
			modelValue.value = modelValueArray;
		}
	}
	const isSingle = (0, vue.computed)(() => type.value === "single");
	return {
		modelValue,
		changeModelValue,
		isSingle
	};
}

//#endregion
Object.defineProperty(exports, 'useSingleOrMultipleValue', {
  enumerable: true,
  get: function () {
    return useSingleOrMultipleValue;
  }
});
//# sourceMappingURL=useSingleOrMultipleValue.cjs.map