'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.handleMfaDisable = exports.isMfaFeatureEnabled = void 0;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const isMfaFeatureEnabled = () => di_1.Container.get(config_1.GlobalConfig).mfa.enabled;
exports.isMfaFeatureEnabled = isMfaFeatureEnabled;
const isMfaFeatureDisabled = () => !(0, exports.isMfaFeatureEnabled)();
const getUsersWithMfaEnabled = async () =>
	await di_1.Container.get(db_1.UserRepository).count({ where: { mfaEnabled: true } });
const handleMfaDisable = async () => {
	if (isMfaFeatureDisabled()) {
		const users = await getUsersWithMfaEnabled();
		if (users) {
			di_1.Container.get(config_1.GlobalConfig).mfa.enabled = true;
		}
	}
};
exports.handleMfaDisable = handleMfaDisable;
//# sourceMappingURL=helpers.js.map
