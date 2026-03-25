import { BaseTracer } from "../../tracers/base.js";
//#region src/utils/testing/tracers.ts
var SingleRunExtractor = class extends BaseTracer {
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
export { SingleRunExtractor };

//# sourceMappingURL=tracers.js.map