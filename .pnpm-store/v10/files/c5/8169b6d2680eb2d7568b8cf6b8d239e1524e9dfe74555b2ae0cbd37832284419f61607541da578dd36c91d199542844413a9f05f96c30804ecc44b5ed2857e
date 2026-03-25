const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_ConfigProvider_ConfigProvider = require('../ConfigProvider/ConfigProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/useDirection.ts
function useDirection(dir) {
	const context = require_ConfigProvider_ConfigProvider.injectConfigProviderContext({ dir: (0, vue.ref)("ltr") });
	return (0, vue.computed)(() => dir?.value || context.dir?.value || "ltr");
}

//#endregion
Object.defineProperty(exports, 'useDirection', {
  enumerable: true,
  get: function () {
    return useDirection;
  }
});
//# sourceMappingURL=useDirection.cjs.map