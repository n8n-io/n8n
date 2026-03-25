const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/shared/useFormControl.ts
function useFormControl(el) {
	return (0, vue.computed)(() => (0, __vueuse_core.toValue)(el) ? Boolean((0, __vueuse_core.unrefElement)(el)?.closest("form")) : true);
}

//#endregion
Object.defineProperty(exports, 'useFormControl', {
  enumerable: true,
  get: function () {
    return useFormControl;
  }
});
//# sourceMappingURL=useFormControl.cjs.map