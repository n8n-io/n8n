const require_hitl_interrupt_payload = require("./hitl-interrupt-payload.cjs");
//#region src/ui/interrupts.ts
/**
* Rewrites Python/API snake_case on interrupt `value` to JS camelCase for HITL.
*/
function normalizeInterruptForClient(interrupt) {
	if (interrupt.value === void 0) return interrupt;
	return {
		...interrupt,
		value: require_hitl_interrupt_payload.normalizeHitlInterruptPayload(interrupt.value)
	};
}
/**
* Applies {@link normalizeInterruptForClient} to each interrupt.
*/
function normalizeInterruptsList(interrupts) {
	return interrupts.map((i) => normalizeInterruptForClient(i));
}
function extractInterrupts(values, options) {
	if (typeof values === "object" && values != null && "__interrupt__" in values && Array.isArray(values.__interrupt__)) {
		const valueInterrupts = values.__interrupt__;
		if (valueInterrupts.length === 0) return { when: "breakpoint" };
		if (valueInterrupts.length === 1) return normalizeInterruptForClient(valueInterrupts[0]);
		return valueInterrupts.map((i) => normalizeInterruptForClient(i));
	}
	if (options?.isLoading) return void 0;
	const interrupts = options?.threadState?.tasks?.at(-1)?.interrupts;
	if (interrupts == null || interrupts.length === 0) {
		if (!(options?.threadState?.next ?? []).length || options?.error != null) return void 0;
		return { when: "breakpoint" };
	}
	return normalizeInterruptForClient(interrupts.at(-1));
}
//#endregion
exports.extractInterrupts = extractInterrupts;
exports.normalizeInterruptForClient = normalizeInterruptForClient;
exports.normalizeInterruptsList = normalizeInterruptsList;

//# sourceMappingURL=interrupts.cjs.map