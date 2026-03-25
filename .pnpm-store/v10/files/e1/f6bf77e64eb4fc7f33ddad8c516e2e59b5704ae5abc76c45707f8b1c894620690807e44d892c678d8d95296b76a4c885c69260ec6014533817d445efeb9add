const require_tracers_base = require("./base.cjs");
//#region src/tracers/root_listener.ts
var RootListenersTracer = class extends require_tracers_base.BaseTracer {
	name = "RootListenersTracer";
	/** The Run's ID. Type UUID */
	rootId;
	config;
	argOnStart;
	argOnEnd;
	argOnError;
	constructor({ config, onStart, onEnd, onError }) {
		super({ _awaitHandler: true });
		this.config = config;
		this.argOnStart = onStart;
		this.argOnEnd = onEnd;
		this.argOnError = onError;
	}
	/**
	* This is a legacy method only called once for an entire run tree
	* therefore not useful here
	* @param {Run} _ Not used
	*/
	persistRun(_) {
		return Promise.resolve();
	}
	async onRunCreate(run) {
		if (this.rootId) return;
		this.rootId = run.id;
		if (this.argOnStart) await this.argOnStart(run, this.config);
	}
	async onRunUpdate(run) {
		if (run.id !== this.rootId) return;
		if (!run.error) {
			if (this.argOnEnd) await this.argOnEnd(run, this.config);
		} else if (this.argOnError) await this.argOnError(run, this.config);
	}
};
//#endregion
exports.RootListenersTracer = RootListenersTracer;

//# sourceMappingURL=root_listener.cjs.map