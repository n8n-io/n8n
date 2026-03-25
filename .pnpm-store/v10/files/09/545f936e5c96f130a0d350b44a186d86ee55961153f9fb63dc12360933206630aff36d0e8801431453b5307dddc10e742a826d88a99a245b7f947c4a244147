

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_range } from "../classes/range.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-satisfying.js": ((exports, module) => {
	const SemVer = require_semver();
	const Range = require_range();
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
export default require_min_satisfying();

export { require_min_satisfying };
//# sourceMappingURL=min-satisfying.js.map