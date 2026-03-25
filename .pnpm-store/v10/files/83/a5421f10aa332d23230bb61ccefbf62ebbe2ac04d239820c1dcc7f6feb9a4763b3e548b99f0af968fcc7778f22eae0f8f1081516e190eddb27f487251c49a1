//#region src/ui/interrupts.ts
function extractInterrupts(values, options) {
	if (typeof values === "object" && values != null && "__interrupt__" in values && Array.isArray(values.__interrupt__)) {
		const valueInterrupts = values.__interrupt__;
		if (valueInterrupts.length === 0) return { when: "breakpoint" };
		if (valueInterrupts.length === 1) return valueInterrupts[0];
		return valueInterrupts;
	}
	if (options?.isLoading) return void 0;
	const interrupts = options?.threadState?.tasks?.at(-1)?.interrupts;
	if (interrupts == null || interrupts.length === 0) {
		if (!(options?.threadState?.next ?? []).length || options?.error != null) return void 0;
		return { when: "breakpoint" };
	}
	return interrupts.at(-1);
}
//#endregion
exports.extractInterrupts = extractInterrupts;

//# sourceMappingURL=interrupts.cjs.map