

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_gt } from "./gt.js";
import { require_lt } from "./lt.js";
import { require_eq } from "./eq.js";
import { require_neq } from "./neq.js";
import { require_gte } from "./gte.js";
import { require_lte } from "./lte.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/cmp.js": ((exports, module) => {
	const eq = require_eq();
	const neq = require_neq();
	const gt = require_gt();
	const gte = require_gte();
	const lt = require_lt();
	const lte = require_lte();
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
export default require_cmp();

export { require_cmp };
//# sourceMappingURL=cmp.js.map