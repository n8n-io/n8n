import { findValuesBetween } from "./arrays.js";
import { ref } from "vue";

//#region src/shared/useSelectionBehavior.ts
function useSelectionBehavior(modelValue, props) {
	const firstValue = ref();
	const onSelectItem = (val, condition) => {
		if (props.multiple && Array.isArray(modelValue.value)) if (props.selectionBehavior === "replace") {
			modelValue.value = [val];
			firstValue.value = val;
		} else {
			const index = modelValue.value.findIndex((v) => condition(v));
			if (index !== -1) modelValue.value = modelValue.value.filter((_, i) => i !== index);
			else modelValue.value = [...modelValue.value, val];
		}
		else if (props.selectionBehavior === "replace") modelValue.value = { ...val };
		else if (!Array.isArray(modelValue.value) && condition(modelValue.value)) modelValue.value = void 0;
		else modelValue.value = { ...val };
		return modelValue.value;
	};
	function handleMultipleReplace(intent, currentElement, getItems, options) {
		if (!firstValue?.value || !props.multiple || !Array.isArray(modelValue.value)) return;
		const collection = getItems().filter((i) => i.ref.dataset.disabled !== "");
		const lastValue = collection.find((i) => i.ref === currentElement)?.value;
		if (!lastValue) return;
		let value = null;
		switch (intent) {
			case "prev":
			case "next": {
				value = findValuesBetween(options, firstValue.value, lastValue);
				break;
			}
			case "first": {
				value = findValuesBetween(options, firstValue.value, options?.[0]);
				break;
			}
			case "last": {
				value = findValuesBetween(options, firstValue.value, options?.[options.length - 1]);
				break;
			}
		}
		modelValue.value = value;
	}
	return {
		firstValue,
		onSelectItem,
		handleMultipleReplace
	};
}

//#endregion
export { useSelectionBehavior };
//# sourceMappingURL=useSelectionBehavior.js.map