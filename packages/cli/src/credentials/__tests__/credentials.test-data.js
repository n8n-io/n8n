'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createdCredentialsWithScopes =
	exports.createNewCredentialsPayload =
	exports.credentialScopes =
		void 0;
const minifaker_1 = require('minifaker');
const n8n_workflow_1 = require('n8n-workflow');
const name = 'new Credential';
const type = 'openAiApi';
const data = {
	apiKey: 'apiKey',
	url: 'url',
};
const projectId = minifaker_1.nanoId.nanoid();
exports.credentialScopes = [
	'credential:create',
	'credential:delete',
	'credential:list',
	'credential:move',
	'credential:read',
	'credential:share',
	'credential:update',
];
const createNewCredentialsPayload = (payload) => {
	return {
		name,
		type,
		data,
		projectId,
		...payload,
	};
};
exports.createNewCredentialsPayload = createNewCredentialsPayload;
const createdCredentialsWithScopes = (payload) => {
	return {
		name,
		type,
		data: (0, n8n_workflow_1.randomString)(20),
		id: minifaker_1.nanoId.nanoid(),
		createdAt: (0, minifaker_1.date)(),
		updatedAt: (0, minifaker_1.date)(),
		isManaged: false,
		scopes: exports.credentialScopes,
		...payload,
	};
};
exports.createdCredentialsWithScopes = createdCredentialsWithScopes;
//# sourceMappingURL=credentials.test-data.js.map
