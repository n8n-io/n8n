import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Vr as useClipboard, dC as useToast, jN as useI18n, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { r as useAgentSessionsStore } from "./useAgentSessionStop-CtqFqela.js";
//#region src/features/agents/composables/useAgentSessionLangSmithExport.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useAgentSessionLangSmithExport() {
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const sessionsStore = useAgentSessionsStore();
	const clipboard = useClipboard();
	const { showError, showMessage } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const isExporting = ref(false);
	const isEnabled = computed(() => localStorage.getItem("instanceAi.debugMode") === "true" && settingsStore.moduleSettings.agents?.proxyEnabled === true);
	async function sendSession({ projectId, agentId, threadId }) {
		if (!isEnabled.value || isExporting.value) return;
		isExporting.value = true;
		try {
			if (await openAgentConfirmationModal({
				title: i18n.baseText("agentSessions.langsmithExport.confirm.title"),
				description: i18n.baseText("agentSessions.langsmithExport.confirm.body"),
				confirmButtonText: i18n.baseText("agentSessions.langsmithExport.confirm.button"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm") return;
			const { traceId } = await sessionsStore.exportThreadToLangSmith(projectId, agentId, threadId);
			await clipboard.copy(traceId).catch(() => {});
			showMessage({
				title: i18n.baseText("agentSessions.langsmithExport.success"),
				message: i18n.baseText("agentSessions.langsmithExport.successMessage", { interpolate: { traceId } }),
				type: "success"
			});
		} catch (error) {
			showError(error, i18n.baseText("agentSessions.langsmithExport.error"));
		} finally {
			isExporting.value = false;
		}
	}
	return {
		isEnabled,
		isExporting,
		sendSession
	};
}
//#endregion
//#region src/features/agents/utils/agent-usage.ts
/** Hide unavailable usage and avoid rounding a positive cost to zero. */
function formatAgentUsage(totalTokens, cost) {
	if (!Number.isFinite(totalTokens) || totalTokens <= 0) return null;
	const tokens = `${totalTokens.toLocaleString()}t`;
	if (cost === null || cost === void 0 || !Number.isFinite(cost) || cost <= 0) return tokens;
	return `${tokens} (${cost < 1e-4 ? "<$0.0001" : `$${cost.toFixed(4)}`})`;
}
/** Add live execution snapshots only until the saved totals include them. */
function getAgentSessionUsage(detail, updates = {}) {
	let totalTokens = detail.thread.totalPromptTokens + detail.thread.totalCompletionTokens;
	let cost = detail.thread.totalCost;
	let priceKnown = Number.isFinite(cost) && cost >= 0;
	const executions = new Map(detail.executions.map((execution) => [execution.id, execution]));
	for (const execution of detail.executions) if ((execution.totalTokens ?? 0) > 0 && (execution.cost === null || !Number.isFinite(execution.cost) || execution.cost <= 0)) priceKnown = false;
	for (const update of Object.values(updates)) {
		if (update.sessionId !== detail.thread.id || !update.usage) continue;
		const execution = executions.get(update.executionId);
		if (execution && execution.status !== "running") continue;
		totalTokens += update.usage.totalTokens;
		if (update.usage.totalTokens <= 0) continue;
		const liveCost = update.usage.cost;
		if (liveCost === void 0 || !Number.isFinite(liveCost) || liveCost <= 0) priceKnown = false;
		else cost += liveCost;
	}
	return {
		totalTokens,
		cost: priceKnown ? cost : null
	};
}
/** Add server duration snapshots until the saved session total includes them. */
function getAgentSessionDuration(detail, updates) {
	let savedDuration = 0;
	const pending = /* @__PURE__ */ new Map();
	for (const execution of detail.executions) if (execution.status === "running") pending.set(execution.id, execution.duration ?? 0);
	else savedDuration += execution.duration ?? 0;
	const executions = new Map(detail.executions.map((execution) => [execution.id, execution]));
	for (const update of Object.values(updates)) {
		if (update.sessionId !== detail.thread.id) continue;
		const execution = executions.get(update.executionId);
		if (execution && execution.status !== "running") continue;
		if (update.duration === void 0 || !Number.isFinite(update.duration)) continue;
		pending.set(update.executionId, Math.max(pending.get(update.executionId) ?? 0, update.duration));
	}
	let duration = Math.max(detail.thread.totalDuration ?? 0, savedDuration);
	for (const elapsed of pending.values()) duration += elapsed;
	return duration;
}
//#endregion
//#region src/features/agents/composables/useAgentSessionUsage.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useAgentSessionUsage(detail, streamUpdates) {
	const pushedUpdates = ref({});
	const updates = computed(() => {
		const merged = { ...pushedUpdates.value };
		for (const update of Object.values(streamUpdates())) {
			const pushed = merged[update.executionId];
			merged[update.executionId] = {
				...update,
				duration: Math.max(pushed?.duration ?? 0, update.duration ?? 0),
				complete: pushed?.complete === true || update.complete,
				usage: (pushed?.usage?.totalTokens ?? 0) > (update.usage?.totalTokens ?? 0) ? pushed?.usage : update.usage
			};
		}
		return merged;
	});
	const usage = computed(() => {
		const current = detail();
		return current ? getAgentSessionUsage(current, updates.value) : {
			totalTokens: 0,
			cost: null
		};
	});
	const duration = computed(() => {
		const current = detail();
		return current ? getAgentSessionDuration(current, updates.value) : 0;
	});
	function onExecutionUpdated(update) {
		if (!update.usage && update.duration === void 0) return;
		const previous = pushedUpdates.value[update.executionId];
		if (previous?.complete && !update.complete) return;
		pushedUpdates.value[update.executionId] = {
			sessionId: update.threadId,
			executionId: update.executionId,
			usage: (previous?.usage?.totalTokens ?? 0) > (update.usage?.totalTokens ?? 0) ? previous?.usage : update.usage ?? previous?.usage,
			duration: Math.max(previous?.duration ?? 0, update.duration ?? 0),
			complete: previous?.complete === true || update.complete === true
		};
	}
	return {
		usage,
		duration,
		onExecutionUpdated
	};
}
//#endregion
export { formatAgentUsage as n, useAgentSessionLangSmithExport as r, useAgentSessionUsage as t };
