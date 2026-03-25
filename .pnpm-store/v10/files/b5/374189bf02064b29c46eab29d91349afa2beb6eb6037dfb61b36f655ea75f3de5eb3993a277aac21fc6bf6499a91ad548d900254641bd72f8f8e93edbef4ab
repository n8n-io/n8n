//#region src/utils/signals.ts
function mergeSignals(...signals) {
	const nonZeroSignals = signals.filter((signal) => signal != null);
	if (nonZeroSignals.length === 0) return void 0;
	if (nonZeroSignals.length === 1) return nonZeroSignals[0];
	const controller = new AbortController();
	for (const signal of signals) {
		if (signal?.aborted) {
			controller.abort(signal.reason);
			return controller.signal;
		}
		signal?.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
	}
	return controller.signal;
}

//#endregion
export { mergeSignals };
//# sourceMappingURL=signals.js.map