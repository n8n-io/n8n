'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_semver$1 = require('../classes/semver.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/inc.js
var require_inc = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/inc.js": ((exports, module) => {
	const SemVer = require_semver$1.require_semver();
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
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_inc();
  }
});
//# sourceMappingURL=inc.cjs.map