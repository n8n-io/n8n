'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.samlLicensedMiddleware = exports.samlLicensedAndEnabledMiddleware = void 0;
const saml_helpers_1 = require('../saml-helpers');
const samlLicensedAndEnabledMiddleware = (_, res, next) => {
	if ((0, saml_helpers_1.isSamlLicensedAndEnabled)()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};
exports.samlLicensedAndEnabledMiddleware = samlLicensedAndEnabledMiddleware;
const samlLicensedMiddleware = (_, res, next) => {
	if ((0, saml_helpers_1.isSamlLicensed)()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};
exports.samlLicensedMiddleware = samlLicensedMiddleware;
//# sourceMappingURL=saml-enabled-middleware.js.map
