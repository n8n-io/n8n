'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InvalidSamlMetadataUrlError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class InvalidSamlMetadataUrlError extends n8n_workflow_1.UserError {
	constructor(url) {
		super(`Failed to produce valid SAML metadata from ${url}`);
	}
}
exports.InvalidSamlMetadataUrlError = InvalidSamlMetadataUrlError;
//# sourceMappingURL=invalid-saml-metadata-url.error.js.map
