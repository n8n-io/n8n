'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const zod_1 = require('zod');
zod_1.z.ZodType.prototype.alias = function (aliasName) {
	this._def._alias = aliasName;
	return this;
};
//# sourceMappingURL=zod-alias-support.js.map
