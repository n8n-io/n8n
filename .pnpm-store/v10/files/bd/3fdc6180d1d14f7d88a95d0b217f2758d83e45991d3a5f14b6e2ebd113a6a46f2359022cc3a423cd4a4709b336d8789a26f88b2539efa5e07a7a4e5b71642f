

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_semver } from "../classes/semver.js";
import { require_gt } from "../functions/gt.js";
import { require_range } from "../classes/range.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-version.js
var require_min_version = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/min-version.js": ((exports, module) => {
	const SemVer = require_semver();
	const Range = require_range();
	const gt = require_gt();
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
export default require_min_version();

export { require_min_version };
//# sourceMappingURL=min-version.js.map