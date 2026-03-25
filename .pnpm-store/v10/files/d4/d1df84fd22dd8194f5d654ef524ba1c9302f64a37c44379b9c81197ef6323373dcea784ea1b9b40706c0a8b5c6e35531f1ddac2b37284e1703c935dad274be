'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_gt$1 = require('./gt.cjs');
const require_lt$1 = require('./lt.cjs');
const require_eq$1 = require('./eq.cjs');
const require_neq$1 = require('./neq.cjs');
const require_gte$1 = require('./gte.cjs');
const require_lte$1 = require('./lte.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/cmp.js": ((exports, module) => {
	const eq = require_eq$1.require_eq();
	const neq = require_neq$1.require_neq();
	const gt = require_gt$1.require_gt();
	const gte = require_gte$1.require_gte();
	const lt = require_lt$1.require_lt();
	const lte = require_lte$1.require_lte();
	const cmp = (a, op, b, loose) => {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError(`Invalid operator: ${op}`);
		}
	};
	module.exports = cmp;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_cmp();
  }
});
//# sourceMappingURL=cmp.cjs.map