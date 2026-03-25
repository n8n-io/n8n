const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_ConfigProvider_ConfigProvider = require('../ConfigProvider/ConfigProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/useLocale.ts
function useLocale(locale) {
	const context = require_ConfigProvider_ConfigProvider.injectConfigProviderContext({ locale: (0, vue.ref)("en") });
	return (0, vue.computed)(() => locale?.value || context.locale?.value || "en");
}

//#endregion
Object.defineProperty(exports, 'useLocale', {
  enumerable: true,
  get: function () {
    return useLocale;
  }
});
//# sourceMappingURL=useLocale.cjs.map