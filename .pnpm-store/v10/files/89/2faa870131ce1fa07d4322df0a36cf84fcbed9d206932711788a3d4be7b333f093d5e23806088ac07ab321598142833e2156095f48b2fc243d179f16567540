

import { __commonJS } from "../../../../../_virtual/rolldown_runtime.js";

//#region ../../node_modules/.pnpm/p-finally@1.0.0/node_modules/p-finally/index.js
var require_p_finally = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/p-finally@1.0.0/node_modules/p-finally/index.js": ((exports, module) => {
	module.exports = (promise, onFinally) => {
		onFinally = onFinally || (() => {});
		return promise.then((val) => new Promise((resolve) => {
			resolve(onFinally());
		}).then(() => val), (err) => new Promise((resolve) => {
			resolve(onFinally());
		}).then(() => {
			throw err;
		}));
	};
}) });

//#endregion
export default require_p_finally();

export { require_p_finally };
//# sourceMappingURL=index.js.map