'use strict';


const require_rolldown_runtime = require('../../../../../../_virtual/rolldown_runtime.cjs');
const require_debug$1 = require('../internal/debug.cjs');
const require_re$1 = require('../internal/re.cjs');
const require_parse_options$1 = require('../internal/parse-options.cjs');
const require_semver$1 = require('./semver.cjs');
const require_cmp$1 = require('../functions/cmp.cjs');
const require_range$1 = require('./range.cjs');

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ require_rolldown_runtime.__commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/classes/comparator.js": ((exports, module) => {
	const ANY = Symbol("SemVer ANY");
	var Comparator = class Comparator {
		static get ANY() {
			return ANY;
		}
		constructor(comp, options) {
			options = parseOptions(options);
			if (comp instanceof Comparator) if (comp.loose === !!options.loose) return comp;
			else comp = comp.value;
			comp = comp.trim().split(/\s+/).join(" ");
			debug("comparator", comp, options);
			this.options = options;
			this.loose = !!options.loose;
			this.parse(comp);
			if (this.semver === ANY) this.value = "";
			else this.value = this.operator + this.semver.version;
			debug("comp", this);
		}
		parse(comp) {
			const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
			const m = comp.match(r);
			if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
			this.operator = m[1] !== void 0 ? m[1] : "";
			if (this.operator === "=") this.operator = "";
			if (!m[2]) this.semver = ANY;
			else this.semver = new SemVer(m[2], this.options.loose);
		}
		toString() {
			return this.value;
		}
		test(version) {
			debug("Comparator.test", version, this.options.loose);
			if (this.semver === ANY || version === ANY) return true;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			return cmp(version, this.operator, this.semver, this.options);
		}
		intersects(comp, options) {
			if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
			if (this.operator === "") {
				if (this.value === "") return true;
				return new Range(comp.value, options).test(this.value);
			} else if (comp.operator === "") {
				if (comp.value === "") return true;
				return new Range(this.value, options).test(comp.semver);
			}
			options = parseOptions(options);
			if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
			if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) return false;
			if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
			if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
			if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) return true;
			if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) return true;
			if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) return true;
			return false;
		}
	};
	module.exports = Comparator;
	const parseOptions = require_parse_options$1.require_parse_options();
	const { safeRe: re, t } = require_re$1.require_re();
	const cmp = require_cmp$1.require_cmp();
	const debug = require_debug$1.require_debug();
	const SemVer = require_semver$1.require_semver();
	const Range = require_range$1.require_range();
}) });

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_comparator();
  }
});
//# sourceMappingURL=comparator.cjs.map