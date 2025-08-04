'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateUser = void 0;
const validateUser = (user) => {
	expect(typeof user.id).toBe('string');
	expect(user.email).toBeDefined();
	expect(user.firstName).toBeDefined();
	expect(user.lastName).toBeDefined();
	expect(typeof user.isOwner).toBe('boolean');
	expect(user.isPending).toBe(false);
	expect(user.signInType).toBe('email');
	expect(user.settings).toBe(null);
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.role).toBeDefined();
	expect(typeof user.mfaEnabled).toBe('boolean');
};
exports.validateUser = validateUser;
//# sourceMappingURL=users.js.map
