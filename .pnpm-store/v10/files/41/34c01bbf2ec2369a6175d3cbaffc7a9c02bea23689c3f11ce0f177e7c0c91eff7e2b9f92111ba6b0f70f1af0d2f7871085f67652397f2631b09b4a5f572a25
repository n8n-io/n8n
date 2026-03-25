import { onUnmounted, watch } from "vue";
import { unrefElement } from "@vueuse/core";
import { hideOthers } from "aria-hidden";

//#region src/shared/useHideOthers.ts
/**
* The `useHideOthers` function is a TypeScript function that takes a target element reference and
* hides all other elements in ARIA when the target element is present, and restores the visibility of the
* hidden elements when the target element is removed.
* @param {MaybeElementRef} target - The `target` parameter is a reference to the element that you want
* to hide other elements when it is clicked or focused.
*/
function useHideOthers(target) {
	let undo;
	watch(() => unrefElement(target), (el) => {
		if (el) undo = hideOthers(el);
		else if (undo) undo();
	});
	onUnmounted(() => {
		if (undo) undo();
	});
}

//#endregion
export { useHideOthers };
//# sourceMappingURL=useHideOthers.js.map