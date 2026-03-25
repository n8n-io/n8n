

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_range } from "../classes/range.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/max-satisfying.js": ((exports, module) => {
	const SemVer = require_semver();
	const Range = require_range();
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
export default require_max_satisfying();

export { require_max_satisfying };
//# sourceMappingURL=max-satisfying.js.map