const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Primitive/usePrimitiveElement.ts
function usePrimitiveElement() {
	const primitiveElement = (0, vue.ref)();
	const currentElement = (0, vue.computed)(() => ["#text", "#comment"].includes(primitiveElement.value?.$el.nodeName) ? primitiveElement.value?.$el.nextElementSibling : (0, __vueuse_core.unrefElement)(primitiveElement));
	return {
		primitiveElement,
		currentElement
	};
}

//#endregion
Object.defineProperty(exports, 'usePrimitiveElement', {
  enumerable: true,
  get: function () {
    return usePrimitiveElement;
  }
});
//# sourceMappingURL=usePrimitiveElement.cjs.map