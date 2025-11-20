'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.scopeInformation = exports.ALL_API_KEY_SCOPES = exports.ALL_SCOPES = void 0;
const constants_ee_1 = require('./constants.ee');
function buildResourceScopes() {
	const resourceScopes = Object.entries(constants_ee_1.RESOURCES).flatMap(
		([resource, operations]) => [...operations.map((op) => `${resource}:${op}`), `${resource}:*`],
	);
	resourceScopes.push('*');
	return resourceScopes;
}
function buildApiKeyScopes() {
	const apiKeyScopes = Object.entries(constants_ee_1.API_KEY_RESOURCES).flatMap(
		([resource, operations]) => [...operations.map((op) => `${resource}:${op}`)],
	);
	return new Set(apiKeyScopes);
}
exports.ALL_SCOPES = buildResourceScopes();
exports.ALL_API_KEY_SCOPES = buildApiKeyScopes();
exports.scopeInformation = {
	'annotationTag:create': {
		displayName: 'Create Annotation Tag',
		description: 'Allows creating new annotation tags.',
	},
};
//# sourceMappingURL=scope-information.js.map
