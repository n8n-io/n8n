'use strict';


const require_rolldown_runtime = require('../../../../../_virtual/rolldown_runtime.cjs');

//#region ../../node_modules/.pnpm/p-finally@1.0.0/node_modules/p-finally/index.js
var require_p_finally = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/p-finally@1.0.0/node_modules/p-finally/index.js": ((exports, module) => {
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
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_p_finally();
  }
});
//# sourceMappingURL=index.cjs.map