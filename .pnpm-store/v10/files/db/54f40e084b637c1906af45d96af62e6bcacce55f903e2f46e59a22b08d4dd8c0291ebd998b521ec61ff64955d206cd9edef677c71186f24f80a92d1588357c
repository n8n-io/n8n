const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/shared/useIsUsingKeyboard.ts
function useIsUsingKeyboardImpl() {
	const isUsingKeyboard = (0, vue.ref)(false);
	(0, vue.onMounted)(() => {
		(0, __vueuse_core.useEventListener)("keydown", () => {
			isUsingKeyboard.value = true;
		}, {
			capture: true,
			passive: true
		});
		(0, __vueuse_core.useEventListener)(["pointerdown", "pointermove"], () => {
			isUsingKeyboard.value = false;
		}, {
			capture: true,
			passive: true
		});
	});
	return isUsingKeyboard;
}
const useIsUsingKeyboard = (0, __vueuse_core.createSharedComposable)(useIsUsingKeyboardImpl);

//#endregion
Object.defineProperty(exports, 'useIsUsingKeyboard', {
  enumerable: true,
  get: function () {
    return useIsUsingKeyboard;
  }
});
//# sourceMappingURL=useIsUsingKeyboard.cjs.map