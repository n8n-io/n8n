import { Jg as useUIStore, hC as useTelemetry, tt as MCP_JSON_NUDGE_MODAL_KEY, wy as TELEMETRY_EVENT } from "./app-D5flEmb-.js";
import { t as useMcpJsonNudgeEligibility } from "./useMcpJsonNudgeEligibility-B_jj1fA0.js";
//#region src/experiments/mcpJsonNudge/composables/useMcpJsonNudgeTrigger.ts
function useMcpJsonNudgeTrigger() {
	const uiStore = useUIStore();
	const eligibility = useMcpJsonNudgeEligibility();
	const telemetry = useTelemetry();
	/**
	* Runs `action` (the export or import) behind the nudge. When the nudge is
	* eligible, the modal opens and the action is deferred to its `onContinue`
	* (Skip / dismiss); Connect abandons it. Otherwise the action runs right away.
	*/
	async function gate(surface, action) {
		if (uiStore.isModalActiveById["mcpJsonNudgeModal"]) {
			await action();
			return;
		}
		if (!eligibility.canShow()) {
			await action();
			return;
		}
		uiStore.openModalWithData({
			name: MCP_JSON_NUDGE_MODAL_KEY,
			data: {
				surface,
				onContinue: action
			}
		});
		telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_VIEWED, { surface });
		eligibility.recordImpression();
	}
	return { gate };
}
//#endregion
export { useMcpJsonNudgeTrigger as t };
