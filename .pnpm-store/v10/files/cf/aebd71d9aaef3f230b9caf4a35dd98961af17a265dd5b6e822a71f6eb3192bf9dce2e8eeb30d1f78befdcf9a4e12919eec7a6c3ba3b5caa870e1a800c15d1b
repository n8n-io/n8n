'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_re$1 = require('../internal/re.cjs');
const require_semver$1 = require('../classes/semver.cjs');
const require_parse$1 = require('./parse.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/coerce.js
var require_coerce = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/functions/coerce.js": ((exports, module) => {
	const SemVer = require_semver$1.require_semver();
	const parse = require_parse$1.require_parse();
	const { safeRe: re, t } = require_re$1.require_re();
	const coerce = (version, options) => {
		if (version instanceof SemVer) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major = match[2];
		const minor = match[3] || "0";
		const patch = match[4] || "0";
		const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
		const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
		return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
	};
	module.exports = coerce;
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_coerce();
  }
});
//# sourceMappingURL=coerce.cjs.map