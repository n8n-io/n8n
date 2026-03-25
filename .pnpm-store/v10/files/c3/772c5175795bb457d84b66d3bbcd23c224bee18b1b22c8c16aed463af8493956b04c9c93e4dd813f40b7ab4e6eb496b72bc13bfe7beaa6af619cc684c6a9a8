const require_tracers_base = require("../../tracers/base.cjs");
//#region src/utils/testing/tracers.ts
var SingleRunExtractor = class extends require_tracers_base.BaseTracer {
	runPromiseResolver;
	runPromise;
	/** The name of the callback handler. */
	name = "single_run_extractor";
	constructor() {
		super();
		this.runPromise = new Promise((extract) => {
			this.runPromiseResolver = extract;
		});
	}
	async persistRun(run) {
		this.runPromiseResolver(run);
	}
	async extract() {
		return this.runPromise;
	}
};
//#endregion
exports.SingleRunExtractor = SingleRunExtractor;

//# sourceMappingURL=tracers.cjs.map