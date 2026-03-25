const require_jsonplus = require('../serde/jsonplus.cjs');

//#region src/cache/base.ts
var BaseCache = class {
	serde = new require_jsonplus.JsonPlusSerializer();
	/**
	* Initialize the cache with a serializer.
	*
	* @param serde - The serializer to use.
	*/
	constructor(serde) {
		this.serde = serde || this.serde;
	}
};

//#endregion
exports.BaseCache = BaseCache;
//# sourceMappingURL=base.cjs.map