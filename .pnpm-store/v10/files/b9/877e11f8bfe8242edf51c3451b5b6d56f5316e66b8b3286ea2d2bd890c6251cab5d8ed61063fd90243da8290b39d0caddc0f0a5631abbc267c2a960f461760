const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/FocusScope/stack.ts
const useFocusStackState = (0, __vueuse_core.createGlobalState)(() => {
	const stack = (0, vue.ref)([]);
	return stack;
});
function createFocusScopesStack() {
	/** A stack of focus scopes, with the active one at the top */
	const stack = useFocusStackState();
	return {
		add(focusScope) {
			const activeFocusScope = stack.value[0];
			if (focusScope !== activeFocusScope) activeFocusScope?.pause();
			stack.value = arrayRemove(stack.value, focusScope);
			stack.value.unshift(focusScope);
		},
		remove(focusScope) {
			stack.value = arrayRemove(stack.value, focusScope);
			stack.value[0]?.resume();
		}
	};
}
function arrayRemove(array, item) {
	const updatedArray = [...array];
	const index = updatedArray.indexOf(item);
	if (index !== -1) updatedArray.splice(index, 1);
	return updatedArray;
}
function removeLinks(items) {
	return items.filter((item) => item.tagName !== "A");
}

//#endregion
Object.defineProperty(exports, 'createFocusScopesStack', {
  enumerable: true,
  get: function () {
    return createFocusScopesStack;
  }
});
Object.defineProperty(exports, 'removeLinks', {
  enumerable: true,
  get: function () {
    return removeLinks;
  }
});
//# sourceMappingURL=stack.cjs.map