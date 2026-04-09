import { injectConfigProviderContext } from "../ConfigProvider/ConfigProvider.js";
import { computed, ref } from "vue";

//#region src/shared/useDirection.ts
/**
* The `useDirection` function provides a way to access the current direction in your application.
* @param {Ref<Direction | undefined>} [dir] - An optional ref containing the direction (ltr or rtl).
* @returns  computed value that combines with the resolved direction.
*/
function useDirection(dir) {
	const context = injectConfigProviderContext({ dir: ref("ltr") });
	return computed(() => dir?.value || context.dir?.value || "ltr");
}

//#endregion
export { useDirection };
//# sourceMappingURL=useDirection.js.map