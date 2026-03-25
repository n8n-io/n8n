

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";
import { require_semver } from "../classes/semver.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/inc.js
var require_inc = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/inc.js": ((exports, module) => {
	const SemVer = require_semver();
	const inc = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer(version instanceof SemVer ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc;
}) });

//#endregion
export default require_inc();

export { require_inc };
//# sourceMappingURL=inc.js.map