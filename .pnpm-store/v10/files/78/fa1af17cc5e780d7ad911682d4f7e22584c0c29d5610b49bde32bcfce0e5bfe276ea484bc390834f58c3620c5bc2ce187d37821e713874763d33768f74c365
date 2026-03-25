import { injectConfigProviderContext } from "../ConfigProvider/ConfigProvider.js";
import { computed, ref } from "vue";

//#region src/shared/useLocale.ts
function useLocale(locale) {
	const context = injectConfigProviderContext({ locale: ref("en") });
	return computed(() => locale?.value || context.locale?.value || "en");
}

//#endregion
export { useLocale };
//# sourceMappingURL=useLocale.js.map