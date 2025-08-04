'use strict';
const di_1 = require('@n8n/di');
const zod_1 = require('zod');
const credential_types_1 = require('@/credential-types');
const credentials_service_ee_1 = require('@/credentials/credentials.service.ee');
const credentials_helper_1 = require('@/credentials-helper');
const credentials_middleware_1 = require('./credentials.middleware');
const credentials_service_1 = require('./credentials.service');
const global_middleware_1 = require('../../shared/middlewares/global.middleware');
module.exports = {
	createCredential: [
		credentials_middleware_1.validCredentialType,
		credentials_middleware_1.validCredentialsProperties,
		(0, global_middleware_1.apiKeyHasScope)('credential:create'),
		async (req, res) => {
			try {
				const newCredential = await (0, credentials_service_1.createCredential)(req.body);
				const encryptedData = await (0, credentials_service_1.encryptCredential)(newCredential);
				Object.assign(newCredential, encryptedData);
				const savedCredential = await (0, credentials_service_1.saveCredential)(
					newCredential,
					req.user,
					encryptedData,
				);
				return res.json((0, credentials_service_1.sanitizeCredentials)(savedCredential));
			} catch ({ message, httpStatusCode }) {
				return res.status(httpStatusCode ?? 500).json({ message });
			}
		},
	],
	transferCredential: [
		(0, global_middleware_1.apiKeyHasScope)('credential:move'),
		(0, global_middleware_1.projectScope)('credential:move', 'credential'),
		async (req, res) => {
			const body = zod_1.z.object({ destinationProjectId: zod_1.z.string() }).parse(req.body);
			await di_1.Container.get(credentials_service_ee_1.EnterpriseCredentialsService).transferOne(
				req.user,
				req.params.id,
				body.destinationProjectId,
			);
			res.status(204).send();
		},
	],
	deleteCredential: [
		(0, global_middleware_1.apiKeyHasScope)('credential:delete'),
		(0, global_middleware_1.projectScope)('credential:delete', 'credential'),
		async (req, res) => {
			const { id: credentialId } = req.params;
			let credential;
			if (!['global:owner', 'global:admin'].includes(req.user.role)) {
				const shared = await (0, credentials_service_1.getSharedCredentials)(
					req.user.id,
					credentialId,
				);
				if (shared?.role === 'credential:owner') {
					credential = shared.credentials;
				}
			} else {
				credential = await (0, credentials_service_1.getCredentials)(credentialId);
			}
			if (!credential) {
				return res.status(404).json({ message: 'Not Found' });
			}
			await (0, credentials_service_1.removeCredential)(req.user, credential);
			return res.json((0, credentials_service_1.sanitizeCredentials)(credential));
		},
	],
	getCredentialType: [
		async (req, res) => {
			const { credentialTypeName } = req.params;
			try {
				di_1.Container.get(credential_types_1.CredentialTypes).getByName(credentialTypeName);
			} catch (error) {
				return res.status(404).json({ message: 'Not Found' });
			}
			const schema = di_1.Container.get(credentials_helper_1.CredentialsHelper)
				.getCredentialsProperties(credentialTypeName)
				.filter((property) => property.type !== 'hidden');
			return res.json((0, credentials_service_1.toJsonSchema)(schema));
		},
	],
};
//# sourceMappingURL=credentials.handler.js.map
