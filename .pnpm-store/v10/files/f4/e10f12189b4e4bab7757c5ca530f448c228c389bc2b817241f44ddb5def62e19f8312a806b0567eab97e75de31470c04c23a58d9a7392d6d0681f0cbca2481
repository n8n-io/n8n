'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_semver$1 = require('../classes/semver.cjs');
const require_range$1 = require('../classes/range.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-satisfying.js": ((exports, module) => {
	const SemVer = require_semver$1.require_semver();
	const Range = require_range$1.require_range();
	const minSatisfying = (versions, range, options) => {
		let min = null;
		let minSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!min || minSV.compare(v) === 1) {
					min = v;
					minSV = new SemVer(min, options);
				}
			}
		});
		return min;
	};
	module.exports = minSatisfying;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_min_satisfying();
  }
});
//# sourceMappingURL=min-satisfying.cjs.map