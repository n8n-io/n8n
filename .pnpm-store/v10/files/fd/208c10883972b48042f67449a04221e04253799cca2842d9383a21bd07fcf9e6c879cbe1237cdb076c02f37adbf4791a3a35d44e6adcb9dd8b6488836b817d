

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_parse } from "./parse.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/diff.js
var require_diff = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/diff.js": ((exports, module) => {
	const parse = require_parse();
	const diff = (version1, version2) => {
		const v1 = parse(version1, null, true);
		const v2 = parse(version2, null, true);
		const comparison = v1.compare(v2);
		if (comparison === 0) return null;
		const v1Higher = comparison > 0;
		const highVersion = v1Higher ? v1 : v2;
		const lowVersion = v1Higher ? v2 : v1;
		const highHasPre = !!highVersion.prerelease.length;
		const lowHasPre = !!lowVersion.prerelease.length;
		if (lowHasPre && !highHasPre) {
			if (!lowVersion.patch && !lowVersion.minor) return "major";
			if (lowVersion.compareMain(highVersion) === 0) {
				if (lowVersion.minor && !lowVersion.patch) return "minor";
				return "patch";
			}
		}
		const prefix = highHasPre ? "pre" : "";
		if (v1.major !== v2.major) return prefix + "major";
		if (v1.minor !== v2.minor) return prefix + "minor";
		if (v1.patch !== v2.patch) return prefix + "patch";
		return "prerelease";
	};
	module.exports = diff;
}) });

//#endregion
export default require_diff();

export { require_diff };
//# sourceMappingURL=diff.js.map