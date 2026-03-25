const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const aria_hidden = require_rolldown_runtime.__toESM(require("aria-hidden"));

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
	(0, vue.watch)(() => (0, __vueuse_core.unrefElement)(target), (el) => {
		if (el) undo = (0, aria_hidden.hideOthers)(el);
		else if (undo) undo();
	});
	(0, vue.onUnmounted)(() => {
		if (undo) undo();
	});
}

//#endregion
Object.defineProperty(exports, 'useHideOthers', {
  enumerable: true,
  get: function () {
    return useHideOthers;
  }
});
//# sourceMappingURL=useHideOthers.cjs.map