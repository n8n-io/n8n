'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.assertUserInviteResult = exports.assertStoredUserProps = void 0;
exports.assertReturnedUserProps = assertReturnedUserProps;
const validator_1 = __importDefault(require('validator'));
function assertReturnedUserProps(user) {
	expect(validator_1.default.isUUID(user.id)).toBe(true);
	expect(user.email).toBeDefined();
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.isPending).toBe(false);
}
const assertStoredUserProps = (user) => {
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeNull();
	expect(user.isPending).toBe(true);
};
exports.assertStoredUserProps = assertStoredUserProps;
const assertUserInviteResult = (data) => {
	expect(validator_1.default.isUUID(data.user.id)).toBe(true);
	expect(data.user.inviteAcceptUrl).toBeUndefined();
	expect(data.user.email).toBeDefined();
	expect(data.user.emailSent).toBe(true);
};
exports.assertUserInviteResult = assertUserInviteResult;
//# sourceMappingURL=assertions.js.map
