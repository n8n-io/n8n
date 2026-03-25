const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/shared/useFocusGuards.ts
/** Number of components which have requested interest to have focus guards */
let count = 0;
/**
* Injects a pair of focus guards at the edges of the whole DOM tree
* to ensure `focusin` & `focusout` events can be caught consistently.
*/
function useFocusGuards() {
	(0, vue.watchEffect)((cleanupFn) => {
		if (!__vueuse_shared.isClient) return;
		const edgeGuards = document.querySelectorAll("[data-reka-focus-guard]");
		document.body.insertAdjacentElement("afterbegin", edgeGuards[0] ?? createFocusGuard());
		document.body.insertAdjacentElement("beforeend", edgeGuards[1] ?? createFocusGuard());
		count++;
		cleanupFn(() => {
			if (count === 1) document.querySelectorAll("[data-reka-focus-guard]").forEach((node) => node.remove());
			count--;
		});
	});
}
function createFocusGuard() {
	const element = document.createElement("span");
	element.setAttribute("data-reka-focus-guard", "");
	element.tabIndex = 0;
	element.style.outline = "none";
	element.style.opacity = "0";
	element.style.position = "fixed";
	element.style.pointerEvents = "none";
	return element;
}

//#endregion
Object.defineProperty(exports, 'useFocusGuards', {
  enumerable: true,
  get: function () {
    return useFocusGuards;
  }
});
//# sourceMappingURL=useFocusGuards.cjs.map