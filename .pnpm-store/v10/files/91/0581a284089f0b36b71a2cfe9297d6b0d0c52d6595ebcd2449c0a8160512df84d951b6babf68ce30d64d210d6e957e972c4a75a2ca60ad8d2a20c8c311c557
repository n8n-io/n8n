import { injectConfigProviderContext } from "../ConfigProvider/ConfigProvider.js";
import { computed, ref } from "vue";

//#region src/shared/useNonce.ts
function useNonce(nonce) {
	const context = injectConfigProviderContext({ nonce: ref() });
	return computed(() => nonce?.value || context.nonce?.value);
}

//#endregion
export { useNonce };
//# sourceMappingURL=useNonce.js.map