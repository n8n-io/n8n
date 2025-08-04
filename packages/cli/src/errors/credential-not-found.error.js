'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CredentialNotFoundError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class CredentialNotFoundError extends n8n_workflow_1.UserError {
	constructor(credentialId, credentialType) {
		super(`Credential with ID "${credentialId}" does not exist for type "${credentialType}".`);
	}
}
exports.CredentialNotFoundError = CredentialNotFoundError;
//# sourceMappingURL=credential-not-found.error.js.map
