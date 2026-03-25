"use strict";


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');

//#region ../../node_modules/.pnpm/p-queue@6.6.2/node_modules/p-queue/dist/lower-bound.js
var require_lower_bound = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/p-queue@6.6.2/node_modules/p-queue/dist/lower-bound.js": ((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function lowerBound(array, value, comparator) {
		let first = 0;
		let count = array.length;
		while (count > 0) {
			const step = count / 2 | 0;
			let it = first + step;
			if (comparator(array[it], value) <= 0) {
				first = ++it;
				count -= step + 1;
			} else count = step;
		}
		return first;
	}
	exports.default = lowerBound;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_lower_bound();
  }
});
//# sourceMappingURL=lower-bound.cjs.map