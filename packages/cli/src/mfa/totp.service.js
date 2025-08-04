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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TOTPService = void 0;
const di_1 = require('@n8n/di');
const otpauth_1 = __importDefault(require('otpauth'));
let TOTPService = class TOTPService {
	generateSecret() {
		return new otpauth_1.default.Secret()?.base32;
	}
	generateTOTPUri({ issuer = 'n8n', secret, label }) {
		return new otpauth_1.default.TOTP({
			secret: otpauth_1.default.Secret.fromBase32(secret),
			issuer,
			label,
		}).toString();
	}
	verifySecret({ secret, mfaCode, window = 2 }) {
		return new otpauth_1.default.TOTP({
			secret: otpauth_1.default.Secret.fromBase32(secret),
		}).validate({ token: mfaCode, window }) === null
			? false
			: true;
	}
	generateTOTP(secret) {
		return otpauth_1.default.TOTP.generate({
			secret: otpauth_1.default.Secret.fromBase32(secret),
		});
	}
};
exports.TOTPService = TOTPService;
exports.TOTPService = TOTPService = __decorate([(0, di_1.Service)()], TOTPService);
//# sourceMappingURL=totp.service.js.map
