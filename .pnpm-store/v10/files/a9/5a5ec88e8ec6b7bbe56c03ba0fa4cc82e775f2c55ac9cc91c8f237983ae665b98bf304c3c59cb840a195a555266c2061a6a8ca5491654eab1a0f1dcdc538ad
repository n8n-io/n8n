'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/internal/identifiers.js": ((exports, module) => {
	const numeric = /^[0-9]+$/;
	const compareIdentifiers = (a, b) => {
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
	module.exports = {
		compareIdentifiers,
		rcompareIdentifiers
	};
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_identifiers();
  }
});
//# sourceMappingURL=identifiers.cjs.map