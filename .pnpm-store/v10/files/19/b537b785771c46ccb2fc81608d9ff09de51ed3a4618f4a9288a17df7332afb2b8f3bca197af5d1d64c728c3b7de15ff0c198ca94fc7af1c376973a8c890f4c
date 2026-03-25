import { computed, ref } from "vue";
import { unrefElement } from "@vueuse/core";

//#region src/Primitive/usePrimitiveElement.ts
function usePrimitiveElement() {
	const primitiveElement = ref();
	const currentElement = computed(() => ["#text", "#comment"].includes(primitiveElement.value?.$el.nodeName) ? primitiveElement.value?.$el.nextElementSibling : unrefElement(primitiveElement));
	return {
		primitiveElement,
		currentElement
	};
}

//#endregion
export { usePrimitiveElement };
//# sourceMappingURL=usePrimitiveElement.js.map