'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_semver$1 = require('../classes/semver.cjs');
const require_gt$1 = require('../functions/gt.cjs');
const require_lt$1 = require('../functions/lt.cjs');
const require_gte$1 = require('../functions/gte.cjs');
const require_lte$1 = require('../functions/lte.cjs');
const require_range$1 = require('../classes/range.cjs');
const require_comparator$1 = require('../classes/comparator.cjs');
const require_satisfies$1 = require('../functions/satisfies.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/outside.js
var require_outside = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/outside.js": ((exports, module) => {
	const SemVer = require_semver$1.require_semver();
	const Comparator = require_comparator$1.require_comparator();
	const { ANY } = Comparator;
	const Range = require_range$1.require_range();
	const satisfies = require_satisfies$1.require_satisfies();
	const gt = require_gt$1.require_gt();
	const lt = require_lt$1.require_lt();
	const lte = require_lte$1.require_lte();
	const gte = require_gte$1.require_gte();
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
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_outside();
  }
});
//# sourceMappingURL=outside.cjs.map