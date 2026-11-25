import { $d as init_runtime_core_esm_bundler, Du as useAsyncState, Rd as computed, lo as defineStore, ql as $14e0f24ef4ac5c92$export$aa8b41735afcabd2 } from "./vendor-Hx42-oQF.js";
import { Fw as makeRestApiRequest, _C as useUsersStore, bC as useRootStore, nD as getResourcePermissions, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { c as transformInsightsSummary } from "./insights.utils-nGksygvH.js";
//#region ../../modules/insights/frontend/src/insights.api.ts
function serializeInsightsFilter(filter) {
	if (!filter) return void 0;
	const { startDate, endDate, ...rest } = filter;
	const serialized = { ...rest };
	if (startDate) serialized.startDate = startDate.toISOString();
	if (endDate) serialized.endDate = endDate.toISOString();
	serialized.timeZone = $14e0f24ef4ac5c92$export$aa8b41735afcabd2();
	return serialized;
}
var fetchInsightsSummary = async (context, filter) => await makeRestApiRequest(context, "GET", "/insights/summary", serializeInsightsFilter(filter));
var fetchInsightsByTime = async (context, filter) => await makeRestApiRequest(context, "GET", "/insights/by-time", serializeInsightsFilter(filter));
var fetchInsightsTimeSaved = async (context, filter) => await makeRestApiRequest(context, "GET", "/insights/by-time/time-saved", serializeInsightsFilter(filter));
var fetchInsightsByWorkflow = async (context, filter) => await makeRestApiRequest(context, "GET", "/insights/by-workflow", serializeInsightsFilter(filter));
//#endregion
//#region ../../modules/insights/frontend/src/insights.store.ts
init_runtime_core_esm_bundler();
var useInsightsStore = defineStore("insights", () => {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const globalInsightsPermissions = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).insights);
	const isInsightsEnabled = computed(() => settingsStore.isModuleActive("insights"));
	const isDashboardEnabled = computed(() => !!settingsStore.moduleSettings.insights?.dashboard);
	return {
		globalInsightsPermissions,
		isInsightsEnabled,
		isSummaryEnabled: computed(() => globalInsightsPermissions.value.list && isInsightsEnabled.value),
		isDashboardEnabled,
		weeklySummary: useAsyncState(async () => {
			const raw = await fetchInsightsSummary(rootStore.restApiContext);
			return transformInsightsSummary(raw);
		}, [], {
			immediate: false,
			resetOnExecute: false
		}),
		summary: useAsyncState(async (filter) => {
			const raw = await fetchInsightsSummary(rootStore.restApiContext, filter);
			return transformInsightsSummary(raw);
		}, [], {
			immediate: false,
			resetOnExecute: false
		}),
		charts: useAsyncState(async (filter) => {
			return await (isDashboardEnabled.value ? fetchInsightsByTime : fetchInsightsTimeSaved)(rootStore.restApiContext, filter);
		}, [], {
			immediate: false,
			resetOnExecute: false
		}),
		table: useAsyncState(async (filter) => {
			return await fetchInsightsByWorkflow(rootStore.restApiContext, filter);
		}, {
			count: 0,
			data: []
		}, {
			immediate: false,
			resetOnExecute: false
		}),
		dateRanges: computed(() => settingsStore.moduleSettings.insights?.dateRanges ?? []),
		earliestDataDate: computed(() => settingsStore.moduleSettings.insights?.earliestDataDate ?? null)
	};
});
//#endregion
export { useInsightsStore as t };
