import { jN as useI18n } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/instanceContextLabels.ts
/** Only the legs that carried something, so an empty leg does not read as a zero result. */
function legSummary(i18n, entry) {
	const { injection } = entry;
	if (injection.state !== "injected") return "";
	const { legs } = injection;
	const parts = [];
	if (legs.inventory > 0) parts.push(i18n.baseText("aiAssistant.instanceContext.trace.workflows", { adjustToNumber: legs.inventory }));
	if (legs.events > 0) parts.push(i18n.baseText("aiAssistant.instanceContext.trace.changes", { adjustToNumber: legs.events }));
	if (legs.runs > 0) parts.push(i18n.baseText("aiAssistant.instanceContext.trace.runs", { adjustToNumber: legs.runs }));
	return parts.join(i18n.baseText("aiAssistant.instanceContext.trace.listSeparator"));
}
/** Name each surface so readers do not need the depth scale. */
function reachSummary(i18n, entry) {
	return (entry.reach?.surfaces ?? []).map((surface) => i18n.baseText(`aiAssistant.instanceContext.trace.surface.${surface}`)).join(i18n.baseText("aiAssistant.instanceContext.trace.listSeparator"));
}
/** Share the label with the collapsed trace. */
function useInstanceContextLabel() {
	const i18n = useI18n();
	function getInstanceContextLabel(entry) {
		let head;
		if (entry.injection.state === "absent") head = entry.injection.reason === "failed" ? i18n.baseText("aiAssistant.instanceContext.trace.failed") : i18n.baseText("aiAssistant.instanceContext.trace.none");
		else head = entry.injection.isUpdate ? i18n.baseText("aiAssistant.instanceContext.trace.readUpdate") : i18n.baseText("aiAssistant.instanceContext.trace.read");
		const legs = legSummary(i18n, entry);
		const summary = legs ? i18n.baseText("aiAssistant.instanceContext.trace.withLegs", { interpolate: {
			head,
			legs
		} }) : head;
		const reach = reachSummary(i18n, entry);
		return reach ? i18n.baseText("aiAssistant.instanceContext.trace.withReach", { interpolate: {
			summary,
			reach
		} }) : summary;
	}
	return { getInstanceContextLabel };
}
//#endregion
export { useInstanceContextLabel as t };
