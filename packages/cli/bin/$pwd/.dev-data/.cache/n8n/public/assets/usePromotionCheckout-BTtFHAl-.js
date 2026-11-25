import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Vn as getErrorMessage, _C as useUsersStore, bC as useRootStore, nD as getResourcePermissions } from "./app-D5flEmb-.js";
import { i as connectPromotionCheckout } from "./useInstancePromotionConnection-5-otSLfL.js";
//#region ../../modules/promotions/frontend/src/composables/usePromotionCheckout.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/** The API does not store connect errors, so they live until the page reloads. */
var connectErrors = reactive(/* @__PURE__ */ new Map());
function usePromotionCheckout() {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const permissions = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).promotions);
	const canConnect = computed(() => !!permissions.value.connect);
	async function connect(environmentId) {
		try {
			await connectPromotionCheckout(rootStore.publicApiContext, environmentId);
			connectErrors.delete(environmentId);
			return true;
		} catch (error) {
			connectErrors.set(environmentId, getErrorMessage(error));
			return false;
		}
	}
	return {
		connectErrors,
		permissions,
		canConnect,
		connect
	};
}
//#endregion
export { usePromotionCheckout as t };
