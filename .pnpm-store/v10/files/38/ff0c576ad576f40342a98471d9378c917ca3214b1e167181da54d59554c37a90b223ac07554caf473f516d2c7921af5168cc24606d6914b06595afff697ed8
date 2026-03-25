const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_ConfigProvider_ConfigProvider = require('../ConfigProvider/ConfigProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/useNonce.ts
function useNonce(nonce) {
	const context = require_ConfigProvider_ConfigProvider.injectConfigProviderContext({ nonce: (0, vue.ref)() });
	return (0, vue.computed)(() => nonce?.value || context.nonce?.value);
}

//#endregion
Object.defineProperty(exports, 'useNonce', {
  enumerable: true,
  get: function () {
    return useNonce;
  }
});
//# sourceMappingURL=useNonce.cjs.map