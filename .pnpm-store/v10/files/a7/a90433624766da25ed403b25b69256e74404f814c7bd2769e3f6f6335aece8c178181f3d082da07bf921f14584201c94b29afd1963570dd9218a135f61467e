

import { __commonJS } from "../../../../../_virtual/rolldown_runtime.js";
import { require_p_finally } from "../../../p-finally@1.0.0/node_modules/p-finally/index.js";

//#region ../../node_modules/.pnpm/p-timeout@3.2.0/node_modules/p-timeout/index.js
var require_p_timeout = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/p-timeout@3.2.0/node_modules/p-timeout/index.js": ((exports, module) => {
	const pFinally = require_p_finally();
	var TimeoutError = class extends Error {
		constructor(message) {
			super(message);
			this.name = "TimeoutError";
		}
	};
	const pTimeout = (promise, milliseconds, fallback) => new Promise((resolve, reject) => {
		if (typeof milliseconds !== "number" || milliseconds < 0) throw new TypeError("Expected `milliseconds` to be a positive number");
		if (milliseconds === Infinity) {
			resolve(promise);
			return;
		}
		const timer = setTimeout(() => {
			if (typeof fallback === "function") {
				try {
					resolve(fallback());
				} catch (error) {
					reject(error);
				}
				return;
			}
			const message = typeof fallback === "string" ? fallback : `Promise timed out after ${milliseconds} milliseconds`;
			const timeoutError = fallback instanceof Error ? fallback : new TimeoutError(message);
			if (typeof promise.cancel === "function") promise.cancel();
			reject(timeoutError);
		}, milliseconds);
		pFinally(promise.then(resolve, reject), () => {
			clearTimeout(timer);
		});
	});
	module.exports = pTimeout;
	module.exports.default = pTimeout;
	module.exports.TimeoutError = TimeoutError;
}) });

//#endregion
export default require_p_timeout();

export { require_p_timeout };
//# sourceMappingURL=index.js.map