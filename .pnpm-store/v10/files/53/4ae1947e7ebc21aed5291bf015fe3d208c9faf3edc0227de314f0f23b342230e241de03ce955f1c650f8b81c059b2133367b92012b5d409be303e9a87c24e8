import { injectConfigProviderContext } from "../ConfigProvider/ConfigProvider.js";
import { computed, ref } from "vue";

//#region src/shared/useDirection.ts
function useDirection(dir) {
	const context = injectConfigProviderContext({ dir: ref("ltr") });
	return computed(() => dir?.value || context.dir?.value || "ltr");
}

//#endregion
export { useDirection };
//# sourceMappingURL=useDirection.js.map