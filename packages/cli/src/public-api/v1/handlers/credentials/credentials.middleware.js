'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validCredentialsProperties = exports.validCredentialType = void 0;
const di_1 = require('@n8n/di');
const jsonschema_1 = require('jsonschema');
const credential_types_1 = require('@/credential-types');
const credentials_helper_1 = require('@/credentials-helper');
const credentials_service_1 = require('./credentials.service');
const validCredentialType = (req, res, next) => {
	try {
		di_1.Container.get(credential_types_1.CredentialTypes).getByName(req.body.type);
	} catch {
		return res.status(400).json({ message: 'req.body.type is not a known type' });
	}
	return next();
};
exports.validCredentialType = validCredentialType;
const validCredentialsProperties = (req, res, next) => {
	const { type, data } = req.body;
	const properties = di_1.Container.get(credentials_helper_1.CredentialsHelper)
		.getCredentialsProperties(type)
		.filter((property) => property.type !== 'hidden');
	const schema = (0, credentials_service_1.toJsonSchema)(properties);
	const { valid, errors } = (0, jsonschema_1.validate)(data, schema, { nestedErrors: true });
	if (!valid) {
		return res.status(400).json({
			message: errors.map((error) => `request.body.data ${error.message}`).join(','),
		});
	}
	return next();
};
exports.validCredentialsProperties = validCredentialsProperties;
//# sourceMappingURL=credentials.middleware.js.map
