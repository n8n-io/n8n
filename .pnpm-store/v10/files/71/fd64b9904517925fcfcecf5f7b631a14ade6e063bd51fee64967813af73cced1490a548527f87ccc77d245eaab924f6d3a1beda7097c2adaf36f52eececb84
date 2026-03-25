import { Runnable } from "../../runnables/base.js";
//#region src/utils/testing/runnables.ts
var FakeRunnable = class extends Runnable {
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
export { FakeRunnable };

//# sourceMappingURL=runnables.js.map