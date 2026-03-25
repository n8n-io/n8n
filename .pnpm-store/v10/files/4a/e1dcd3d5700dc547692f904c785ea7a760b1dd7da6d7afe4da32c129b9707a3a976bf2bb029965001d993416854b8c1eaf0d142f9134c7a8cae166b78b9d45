const require_base = require("../../runnables/base.cjs");
//#region src/utils/testing/runnables.ts
var FakeRunnable = class extends require_base.Runnable {
	lc_namespace = ["tests", "fake"];
	returnOptions;
	constructor(fields) {
		super(fields);
		this.returnOptions = fields.returnOptions;
	}
	async invoke(input, options) {
		if (this.returnOptions) return options ?? {};
		return { input };
	}
};
//#endregion
exports.FakeRunnable = FakeRunnable;

//# sourceMappingURL=runnables.cjs.map