

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_gt } from "../functions/gt.js";
import { require_lt } from "../functions/lt.js";
import { require_gte } from "../functions/gte.js";
import { require_lte } from "../functions/lte.js";
import { require_range } from "../classes/range.js";
import { require_comparator } from "../classes/comparator.js";
import { require_satisfies } from "../functions/satisfies.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/outside.js
var require_outside = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/outside.js": ((exports, module) => {
	const SemVer = require_semver();
	const Comparator = require_comparator();
	const { ANY } = Comparator;
	const Range = require_range();
	const satisfies = require_satisfies();
	const gt = require_gt();
	const lt = require_lt();
	const lte = require_lte();
	const gte = require_gte();
	const outside = (version, range, hilo, options) => {
		version = new SemVer(version, options);
		range = new Range(range, options);
		let gtfn, ltefn, ltfn, comp, ecomp;
		switch (hilo) {
			case ">":
				gtfn = gt;
				ltefn = lte;
				ltfn = lt;
				comp = ">";
				ecomp = ">=";
				break;
			case "<":
				gtfn = lt;
				ltefn = gte;
				ltfn = gt;
				comp = "<";
				ecomp = "<=";
				break;
			default: throw new TypeError("Must provide a hilo val of \"<\" or \">\"");
		}
		if (satisfies(version, range, options)) return false;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let high = null;
			let low = null;
			comparators.forEach((comparator) => {
				if (comparator.semver === ANY) comparator = new Comparator(">=0.0.0");
				high = high || comparator;
				low = low || comparator;
				if (gtfn(comparator.semver, high.semver, options)) high = comparator;
				else if (ltfn(comparator.semver, low.semver, options)) low = comparator;
			});
			if (high.operator === comp || high.operator === ecomp) return false;
			if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) return false;
			else if (low.operator === ecomp && ltfn(version, low.semver)) return false;
		}
		return true;
	};
	module.exports = outside;
}) });

//#endregion
export default require_outside();

export { require_outside };
//# sourceMappingURL=outside.js.map