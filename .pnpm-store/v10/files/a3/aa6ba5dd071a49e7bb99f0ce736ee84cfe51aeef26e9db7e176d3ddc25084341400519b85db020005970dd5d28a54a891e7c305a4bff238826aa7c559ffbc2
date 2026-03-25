'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_compare$1 = require('../functions/compare.cjs');
const require_satisfies$1 = require('../functions/satisfies.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/simplify.js
var require_simplify = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/ranges/simplify.js": ((exports, module) => {
	const satisfies = require_satisfies$1.require_satisfies();
	const compare = require_compare$1.require_compare();
	module.exports = (versions, range, options) => {
		const set = [];
		let first = null;
		let prev = null;
		const v = versions.sort((a, b) => compare(a, b, options));
		for (const version of v) {
			const included = satisfies(version, range, options);
			if (included) {
				prev = version;
				if (!first) first = version;
			} else {
				if (prev) set.push([first, prev]);
				prev = null;
				first = null;
			}
		}
		if (first) set.push([first, null]);
		const ranges = [];
		for (const [min, max] of set) if (min === max) ranges.push(min);
		else if (!max && min === v[0]) ranges.push("*");
		else if (!max) ranges.push(`>=${min}`);
		else if (min === v[0]) ranges.push(`<=${max}`);
		else ranges.push(`${min} - ${max}`);
		const simplified = ranges.join(" || ");
		const original = typeof range.raw === "string" ? range.raw : String(range);
		return simplified.length < original.length ? simplified : range;
	};
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_simplify();
  }
});
//# sourceMappingURL=simplify.cjs.map