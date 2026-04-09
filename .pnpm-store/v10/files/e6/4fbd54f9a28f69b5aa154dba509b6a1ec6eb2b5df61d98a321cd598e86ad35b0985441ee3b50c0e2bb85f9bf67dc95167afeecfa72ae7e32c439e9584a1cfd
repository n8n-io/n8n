import { injectConfigProviderContext } from "../ConfigProvider/ConfigProvider.js";
import { computed, ref } from "vue";

//#region src/shared/useLocale.ts
/**
* The `useLocale` function provides a way to access the current locale in your application.
* @param {Ref<string | undefined>} [locale] - An optional ref containing the locale.
* @returns A computed ref holding the resolved locale.
*/
function useLocale(locale) {
	const context = injectConfigProviderContext({ locale: ref("en") });
	return computed(() => locale?.value || context.locale?.value || "en");
}

//#endregion
export { useLocale };
//# sourceMappingURL=useLocale.js.map