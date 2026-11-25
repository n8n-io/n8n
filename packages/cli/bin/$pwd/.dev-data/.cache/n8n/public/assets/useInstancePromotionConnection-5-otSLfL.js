import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Mw as ResponseError, Pw as makePublicApiRequest, bC as useRootStore } from "./app-D5flEmb-.js";
//#region ../../modules/promotions/frontend/src/promotionsSettings.api.ts
var promotionsApiRoot = "/promotions";
var fetchPromotionRepositories = async (context, providerId, query = {}) => await makePublicApiRequest(context, "GET", `${promotionsApiRoot}/providers/${encodeURIComponent(providerId)}/repositories`, query);
var fetchPromotionBranches = async (context, providerId, repositoryId, query = {}) => await makePublicApiRequest(context, "GET", `${promotionsApiRoot}/providers/${encodeURIComponent(providerId)}/repositories/${encodeURIComponent(repositoryId)}/branches`, query);
async function fetchAllPages(fetchPage) {
	const items = [];
	let cursor;
	do {
		const page = await fetchPage(cursor);
		items.push(...page.data);
		cursor = page.nextCursor ?? void 0;
	} while (cursor);
	return items;
}
var fetchPromotionProvider = async (context, id) => await makePublicApiRequest(context, "GET", `${promotionsApiRoot}/providers/${id}`);
var createPromotionProvider = async (context, payload) => await makePublicApiRequest(context, "POST", `${promotionsApiRoot}/providers`, payload);
var updatePromotionProvider = async (context, id, payload) => await makePublicApiRequest(context, "PUT", `${promotionsApiRoot}/providers/${id}`, payload);
var deletePromotionProvider = async (context, id) => {
	await makePublicApiRequest(context, "DELETE", `${promotionsApiRoot}/providers/${id}`);
};
/** The API refuses to delete a provider that an environment still uses, in any scope. */
var deleteProviderIfUnused = async (context, id) => {
	try {
		await deletePromotionProvider(context, id);
	} catch (error) {
		if (error instanceof ResponseError && (error.httpStatusCode === 404 || error.httpStatusCode === 409)) return;
		throw error;
	}
};
var fetchPromotionEnvironments = async (context, filter = {}) => await fetchAllPages(async (cursor) => await makePublicApiRequest(context, "GET", `${promotionsApiRoot}/environments`, {
	...filter,
	cursor
}));
/** Fetches live checkout state with the stored environment fields. */
var fetchPromotionEnvironment = async (context, id) => await makePublicApiRequest(context, "GET", `${promotionsApiRoot}/environments/${encodeURIComponent(id)}`);
/** Projects in the Apply package whose IDs do not exist on this instance. */
var fetchMissingPromotionProjects = async (context, environmentId) => await makePublicApiRequest(context, "GET", `${promotionsApiRoot}/environments/${encodeURIComponent(environmentId)}/missing-projects`);
var createPromotionEnvironment = async (context, payload) => await makePublicApiRequest(context, "POST", `${promotionsApiRoot}/environments`, payload);
var updatePromotionEnvironment = async (context, id, payload) => await makePublicApiRequest(context, "PUT", `${promotionsApiRoot}/environments/${id}`, payload);
var deletePromotionEnvironment = async (context, id) => {
	await makePublicApiRequest(context, "DELETE", `${promotionsApiRoot}/environments/${id}`);
};
/** Connects the environment on the instance. For Git, this clones its branch. Safe to repeat. */
var connectPromotionCheckout = async (context, environmentId) => await makePublicApiRequest(context, "POST", `${promotionsApiRoot}/environments/${environmentId}/connect`);
/** Promotes the whole instance through its instance Promote environment. */
var promotePackage = async (context, environmentId, payload) => await makePublicApiRequest(context, "POST", `${promotionsApiRoot}/environments/${environmentId}/promote`, payload);
var applyPromotion = async (context, environmentId, payload) => await makePublicApiRequest(context, "POST", `${promotionsApiRoot}/environments/${environmentId}/apply`, payload);
/** Resumes an apply that paused on unresolved bindings, once they are created. */
var continueApplyPromotion = async (context, environmentId, payload) => await makePublicApiRequest(context, "POST", `${promotionsApiRoot}/environments/${environmentId}/apply/continue`, payload);
//#endregion
//#region ../../modules/promotions/frontend/src/composables/useInstancePromotionConnection.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var instanceEnvironments;
function invalidateInstancePromotionConnection() {
	instanceEnvironments = void 0;
}
/** The instance environments and their directions, so callers only ask for those. */
function useInstancePromotionConnection() {
	const rootStore = useRootStore();
	const environments = ref([]);
	/** True when the last lookup failed, so a caller can tell it apart from "no environment". */
	const failed = ref(false);
	async function load() {
		instanceEnvironments ??= fetchPromotionEnvironments(rootStore.publicApiContext, { scope: "instance" }).then((found) => ({
			environments: found,
			failed: false
		})).catch(() => {
			invalidateInstancePromotionConnection();
			return {
				environments: [],
				failed: true
			};
		});
		const lookup = await instanceEnvironments;
		environments.value = lookup.environments;
		failed.value = lookup.failed;
	}
	return {
		environments,
		failed,
		hasPromoteConfig: computed(() => environments.value.some(({ direction }) => direction === "promote")),
		hasApplyConfig: computed(() => environments.value.some(({ direction }) => direction === "apply")),
		load
	};
}
//#endregion
export { updatePromotionEnvironment as _, continueApplyPromotion as a, deletePromotionEnvironment as c, fetchPromotionBranches as d, fetchPromotionEnvironment as f, promotePackage as g, fetchPromotionRepositories as h, connectPromotionCheckout as i, deleteProviderIfUnused as l, fetchPromotionProvider as m, useInstancePromotionConnection as n, createPromotionEnvironment as o, fetchPromotionEnvironments as p, applyPromotion as r, createPromotionProvider as s, invalidateInstancePromotionConnection as t, fetchMissingPromotionProjects as u, updatePromotionProvider as v };
