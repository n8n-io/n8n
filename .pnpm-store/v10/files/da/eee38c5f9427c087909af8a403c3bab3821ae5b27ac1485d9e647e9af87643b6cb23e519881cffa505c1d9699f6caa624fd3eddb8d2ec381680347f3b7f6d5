'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_semver$1 = require('../classes/semver.cjs');
const require_range$1 = require('../classes/range.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/max-satisfying.js": ((exports, module) => {
	const SemVer = require_semver$1.require_semver();
	const Range = require_range$1.require_range();
	const maxSatisfying = (versions, range, options) => {
		let max = null;
		let maxSV = null;
		let rangeObj = null;
		try {
			rangeObj = new Range(range, options);
		} catch (er) {
			return null;
		}
		versions.forEach((v) => {
			if (rangeObj.test(v)) {
				if (!max || maxSV.compare(v) === -1) {
					max = v;
					maxSV = new SemVer(max, options);
				}
			}
		});
		return max;
	};
	module.exports = maxSatisfying;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_max_satisfying();
  }
});
//# sourceMappingURL=max-satisfying.cjs.map