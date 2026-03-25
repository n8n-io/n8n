'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_semver$1 = require('../classes/semver.cjs');
const require_gt$1 = require('../functions/gt.cjs');
const require_range$1 = require('../classes/range.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-version.js
var require_min_version = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-version.js": ((exports, module) => {
	const SemVer = require_semver$1.require_semver();
	const Range = require_range$1.require_range();
	const gt = require_gt$1.require_gt();
	const minVersion = (range, loose) => {
		range = new Range(range, loose);
		let minver = new SemVer("0.0.0");
		if (range.test(minver)) return minver;
		minver = new SemVer("0.0.0-0");
		if (range.test(minver)) return minver;
		minver = null;
		for (let i = 0; i < range.set.length; ++i) {
			const comparators = range.set[i];
			let setMin = null;
			comparators.forEach((comparator) => {
				const compver = new SemVer(comparator.semver.version);
				switch (comparator.operator) {
					case ">":
						if (compver.prerelease.length === 0) compver.patch++;
						else compver.prerelease.push(0);
						compver.raw = compver.format();
					case "":
					case ">=":
						if (!setMin || gt(compver, setMin)) setMin = compver;
						break;
					case "<":
					case "<=": break;
					default: throw new Error(`Unexpected operation: ${comparator.operator}`);
				}
			});
			if (setMin && (!minver || gt(minver, setMin))) minver = setMin;
		}
		if (minver && range.test(minver)) return minver;
		return null;
	};
	module.exports = minVersion;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_min_version();
  }
});
//# sourceMappingURL=min-version.cjs.map