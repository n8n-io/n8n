'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PasswordUtility = void 0;
const di_1 = require('@n8n/di');
const bcryptjs_1 = require('bcryptjs');
const SALT_ROUNDS = 10;
let PasswordUtility = class PasswordUtility {
	async hash(plaintext) {
		return await (0, bcryptjs_1.hash)(plaintext, SALT_ROUNDS);
	}
	async compare(plaintext, hashed) {
		if (hashed === null) {
			return false;
		}
		return await (0, bcryptjs_1.compare)(plaintext, hashed);
	}
};
exports.PasswordUtility = PasswordUtility;
exports.PasswordUtility = PasswordUtility = __decorate([(0, di_1.Service)()], PasswordUtility);
//# sourceMappingURL=password.utility.js.map
