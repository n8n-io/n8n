

import { __commonJS } from "../../../../../../_virtual/rolldown_runtime.js";

//#region ../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/semver@7.7.2/node_modules/semver/internal/lrucache.js": ((exports, module) => {
	var LRUCache = class {
		constructor() {
			this.max = 1e3;
			this.map = /* @__PURE__ */ new Map();
		}
		get(key) {
			const value = this.map.get(key);
			if (value === void 0) return void 0;
			else {
				this.map.delete(key);
				this.map.set(key, value);
				return value;
			}
		}
		delete(key) {
			return this.map.delete(key);
		}
		set(key, value) {
			const deleted = this.delete(key);
			if (!deleted && value !== void 0) {
				if (this.map.size >= this.max) {
					const firstKey = this.map.keys().next().value;
					this.delete(firstKey);
				}
				this.map.set(key, value);
			}
			return this;
		}
	};
	module.exports = LRUCache;
}) });

//#endregion
export default require_lrucache();

export { require_lrucache };
//# sourceMappingURL=lrucache.js.map