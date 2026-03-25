Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_tracers_base = require("./base.cjs");
//#region src/tracers/run_collector.ts
var run_collector_exports = /* @__PURE__ */ require_runtime.__exportAll({ RunCollectorCallbackHandler: () => RunCollectorCallbackHandler });
/**
* A callback handler that collects traced runs and makes it easy to fetch the traced run object from calls through any langchain object.
* For instance, it makes it easy to fetch the run ID and then do things with that, such as log feedback.
*/
var RunCollectorCallbackHandler = class extends require_tracers_base.BaseTracer {
	/** The name of the callback handler. */
	name = "run_collector";
	/** The ID of the example. */
	exampleId;
	/** An array of traced runs. */
	tracedRuns;
	/**
	* Creates a new instance of the RunCollectorCallbackHandler class.
	* @param exampleId The ID of the example.
	*/
	constructor({ exampleId } = {}) {
		super({ _awaitHandler: true });
		this.exampleId = exampleId;
		this.tracedRuns = [];
	}
	/**
	* Persists the given run object.
	* @param run The run object to persist.
	*/
	async persistRun(run) {
		const run_ = { ...run };
		run_.reference_example_id = this.exampleId;
		this.tracedRuns.push(run_);
	}
};
//#endregion
exports.RunCollectorCallbackHandler = RunCollectorCallbackHandler;
Object.defineProperty(exports, "run_collector_exports", {
	enumerable: true,
	get: function() {
		return run_collector_exports;
	}
});

//# sourceMappingURL=run_collector.cjs.map